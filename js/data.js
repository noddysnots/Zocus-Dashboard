/* Zocus data layer: CSV parse + validate + build the dataset the dashboard reads, plus the Data menu
   (upload / export / template / reset). The dashboard never touches the CSV directly; it reads window.ZD.
   To switch to the backend later, replace load() so it builds the same dataset from an API response. */
(function(){
'use strict';
const DAY=864e5;
const SAMPLE_URL='data/sample.csv',TEMPLATE_URL='data/template.csv';
const REQUIRED=['captured_at','rep_name','outcome','value_inr','product','score'];
const SKILL_COLS={need:'score_need',budget:'score_budget',pitch:'score_pitch',objection:'score_objection',close:'score_close'};
const ALIAS={interaction_id:'conversation_id',employee:'rep_name',rep:'rep_name',store:'store_name',amount:'value_inr',value:'value_inr',sale_value:'value_inr',
  date:'captured_at',datetime:'captured_at',product_name:'product',customer:'customer_name',phone:'customer_phone',duration:'duration_min'};
const REASON_DEF={browse:['Just browsing, need not found',0],stock:['Lightweight piece not in stock',1],design:['Did not like the designs',2],making:['Making charges too high',3],
  budget:['Over budget',3],competitor:['Comparing with another store',3],family:['Needs family approval',3],exchange:['Exchange value too low',3],other:['No clear reason',3]};
const REASON_LABEL=Object.fromEntries(Object.entries(REASON_DEF).map(([k,v])=>[v[0].toLowerCase(),k]));
const STAGE_CODE={talked:0,need_understood:1,product_shown:2,price_quoted:3};
const COMP_HI={'Shree Gold Palace':'Shree Gold Palace mein making sirf 8% hai.','Nakshatra Online':'Nakshatra Online pe 1 lakh pe gold coin free mil raha hai.','Ratna Jewellers':'Ratna Jewellers mein exchange rate zyada de rahe hain.'};

/* ---------- CSV ---------- */
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1);
  const rows=[];let row=[],f='',inQ=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(inQ){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else inQ=false}else f+=ch}
    else if(ch==='"')inQ=true;
    else if(ch===','){row.push(f);f=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[]}
    else f+=ch}
  row.push(f);if(row.some(x=>x.trim()!==''))rows.push(row);
  return rows}
const normHeader=h=>{h=String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');return ALIAS[h]||h};
const jsonOf=(s,d)=>{try{return s?JSON.parse(s):(d===undefined?[]:d)}catch(e){return d===undefined?[]:d}};
const slug=s=>String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
function uniqueId(base,used){let id=base,n=2;while(used.has(id))id=base+'-'+n++;used.add(id);return id}
const yes=v=>/^(y|yes|true|1|done)$/i.test(String(v||'').trim());
const no=v=>/^(n|no|false|0)$/i.test(String(v||'').trim());
function parseDate(s){s=String(s||'').trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if(m){const d=new Date(+m[1],+m[2]-1,+m[3],m[4]!==undefined?+m[4]:12,m[5]!==undefined?+m[5]:0);return d.getMonth()===+m[2]-1?d:null}
  m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if(m){const d=new Date(+m[3],+m[2]-1,+m[1],m[4]!==undefined?+m[4]:12,m[5]!==undefined?+m[5]:0);return d.getMonth()===+m[2]-1?d:null}
  const t=Date.parse(s);return isNaN(t)?null:new Date(t)}
function outcomeOf(v){v=String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  if(/^(sold|won|sale|bought|yes)$/.test(v))return 'sold';
  if(/^(followup|follow_up|will_return|return|open|considering)$/.test(v))return 'followup';
  if(/^(lost|not_sold|did_not_buy|no)$/.test(v))return 'lost';
  return null}

/* ---------- Build the dataset ---------- */
function build(text,name){
  const table=parseCSV(text);
  if(table.length<2)return {errors:[{row:1,msg:'The file has no data rows. It needs a header row and at least one conversation.'}]};
  const head=table[0].map(normHeader),idx={};head.forEach((h,i)=>{if(!(h in idx))idx[h]=i});
  const errors=[],warnings=[];
  if(!('outcome' in idx)&&('sale_recorded' in idx)){idx.outcome=idx.sale_recorded;warnings.push('No "outcome" column; used "sale_recorded" (yes = sold, otherwise lost).')}
  const missing=REQUIRED.filter(c=>!(c in idx));
  if(missing.length)return {errors:[{row:1,msg:'Missing required column'+(missing.length>1?'s':'')+': '+missing.join(', ')+'. Download the template from the Data menu to see the format.'}]};
  const skillMissing=Object.values(SKILL_COLS).filter(c=>!(c in idx));
  if(skillMissing.length)warnings.push('Skill columns missing ('+skillMissing.join(', ')+'). The overall score is used in their place, so Team and Coaching show no skill differences.');
  const get=(r,c)=>c in idx?String(r[idx[c]]===undefined?'':r[idx[c]]).trim():'';
  const num=(v)=>v===''?NaN:Number(String(v).replace(/[₹,\s]|rs\.?/gi,''));

  const raw=[];
  for(let i=1;i<table.length;i++){
    const r=table[i],line=i+1,bad=m=>{if(errors.length<25)errors.push({row:line,msg:m})};
    const at=parseDate(get(r,'captured_at'));if(!at){bad('captured_at "'+get(r,'captured_at')+'" is not a date. Use YYYY-MM-DD HH:MM.');continue}
    const rep=get(r,'rep_name');if(!rep){bad('rep_name is empty.');continue}
    let oc=get(r,'outcome');oc=('sale_recorded' in idx&&idx.outcome===idx.sale_recorded)?(yes(oc)?'sold':'lost'):outcomeOf(oc);
    if(!oc){bad('outcome "'+get(r,'outcome')+'" must be sold, followup or lost.');continue}
    let value=get(r,'value_inr')===''?0:num(get(r,'value_inr'));if(isNaN(value)){bad('value_inr "'+get(r,'value_inr')+'" is not a number.');continue}
    const sk={};let bad2=false;
    const unscored=get(r,'scored').toLowerCase()==='no';
    let score=unscored?0:num(get(r,'score'));
    const given=Object.entries(SKILL_COLS).map(([k,col])=>[k,num(get(r,col))]);
    if(!unscored&&isNaN(score)){const ok=given.filter(g=>!isNaN(g[1]));if(ok.length===5)score=Math.round(ok.reduce((a,g)=>a+g[1],0)/5);else{bad('score "'+get(r,'score')+'" is not a number from 0 to 100.');continue}}
    if(score<0||score>100){bad('score '+score+' is outside 0 to 100.');continue}
    for(const [k,v] of given){if(unscored){sk[k]=0}else if(isNaN(v)){sk[k]=Math.round(score)}else if(v<0||v>100){bad(SKILL_COLS[k]+' '+v+' is outside 0 to 100.');bad2=true;break}else sk[k]=Math.round(v)}
    if(bad2)continue;
    raw.push({r,at,rep,oc,value:Math.round(value),sk,score:Math.round(score),scored:!unscored});
  }
  if(errors.length)return {errors};
  if(!raw.length)return {errors:[{row:1,msg:'No usable rows found.'}]};

  /* lookups */
  const customReasons=[],reasonByText={};
  function reasonCode(txt,row,stageHint){
    const t=String(txt||'').trim();if(!t)return null;const low=t.toLowerCase();
    if(REASON_DEF[low])return low;if(REASON_LABEL[low])return REASON_LABEL[low];
    if(reasonByText[low])return reasonByText[low];
    const code='x-'+slug(t);reasonByText[low]=code;
    customReasons.push({code,label:t.charAt(0).toUpperCase()+t.slice(1),stage:stageHint==null?3:stageHint,hi:get(row,'customer_quote')||get(row,'objection_quote'),en:get(row,'customer_quote_en')||get(row,'objection_quote_en')});
    return code}
  const repUsed=new Set(),prodUsed=new Set(),perUsed=new Set(),compUsed=new Set();
  const repMap={},prodMap={},perMap={},compMap={};
  const REPS=[],PRODUCTS={},PERSONAS=[],COMPS=[];
  let noReason=0,hasObjection=false;

  raw.sort((a,b)=>b.at-a.at);
  const today=raw[0].at,todayMid=new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
  const CONVS=raw.map((x,i)=>{
    const r=x.r;
    if(!repMap[x.rep]){const id=uniqueId(slug(x.rep),repUsed);const parts=x.rep.split(/\s+/);repMap[x.rep]=id;REPS.push({id,name:x.rep,tenure:get(r,'rep_tenure'),first:parts[0],ini:parts.map(p=>p[0]).join('').slice(0,2).toUpperCase()})}
    else if(!REPS.find(p=>p.id===repMap[x.rep]).tenure&&get(r,'rep_tenure'))REPS.find(p=>p.id===repMap[x.rep]).tenure=get(r,'rep_tenure');
    const pl=get(r,'product')||'Not recorded';
    if(!prodMap[pl]){const id=uniqueId(slug(pl),prodUsed);prodMap[pl]=id;PRODUCTS[id]={label:pl}}
    const cl=get(r,'customer_type')||'Not recorded';
    if(!perMap[cl]){const id=uniqueId(slug(cl),perUsed);perMap[cl]=id;PERSONAS.push({id,label:cl})}
    let comp=null;const cn=get(r,'competitor');
    if(cn){if(!compMap[cn]){const id=uniqueId(slug(cn),compUsed);compMap[cn]=id;COMPS.push({id,label:cn,offer:get(r,'competitor_offer'),hi:COMP_HI[cn]||''})}
      else if(!COMPS.find(c=>c.id===compMap[cn]).offer&&get(r,'competitor_offer'))COMPS.find(c=>c.id===compMap[cn]).offer=get(r,'competitor_offer');
      comp=compMap[cn]}
    let stageIn=get(r,'stage_reached').toLowerCase().replace(/[\s-]+/g,'_'),stageHint=null;
    if(stageIn in STAGE_CODE)stageHint=STAGE_CODE[stageIn];else if(/^[0-3]$/.test(stageIn))stageHint=+stageIn;
    let reason=null,stage=4;
    if(x.oc!=='sold'){
      reason=reasonCode(get(r,'reason'),r,stageHint);
      if(!reason){reason='other';noReason++}
      stage=stageHint!=null?stageHint:(REASON_DEF[reason]?REASON_DEF[reason][1]:((customReasons.find(c=>c.code===reason)||{}).stage??3));
    }
    let obj=null;const ot=get(r,'objection');
    if(ot){obj=reasonCode(ot,r,null);hasObjection=true}
    const resv=get(r,'objection_resolved');
    const dur=num(get(r,'duration_min'));
    const due=parseDate(get(r,'followup_due'));
    return {id:i+1,ref:get(r,'conversation_id')||('row-'+(i+2)),rep:repMap[x.rep],at:x.at,d:Math.round((todayMid-new Date(x.at.getFullYear(),x.at.getMonth(),x.at.getDate()).getTime())/DAY),
      persona:perMap[cl],product:prodMap[pl],inStock:!no(get(r,'in_stock')),skills:x.sk,score:x.score,scored:x.scored,kind:get(r,'kind').toLowerCase()==='delivery'?'delivery':'sale',startSec:+get(r,'start_sec')||0,jstage:get(r,'stage').toLowerCase(),stageSrc:get(r,'stage_src'),payment:get(r,'payment_status'),resultLabel:get(r,'result_label'),competitor:comp,outcome:x.oc,reason,stage,value:x.value,
      dur:isNaN(dur)||dur<=0?15:Math.round(dur),customer:get(r,'customer_name')||'Customer',phone:get(r,'customer_phone')||null,
      kw:get(r,'keywords').split('|').map(s=>s.trim()).filter(Boolean),done:false,
      cq:get(r,'customer_quote'),cqEn:get(r,'customer_quote_en'),
      sum:{wanted:get(r,'summary_wanted'),happened:get(r,'summary_happened'),why:get(r,'summary_why'),next:get(r,'summary_next')},
      objection:obj,objResolved:yes(resv)?true:no(resv)?false:null,objQuote:get(r,'objection_quote'),objQuoteEn:get(r,'objection_quote_en'),
      reply:get(r,'objection_reply'),replyEn:get(r,'objection_reply_en'),objAt:get(r,'objection_at_sec')===''?null:num(get(r,'objection_at_sec')),
      due:due||new Date(x.at.getTime()+2*DAY),fuDone:yes(get(r,'followup_done')),url:/^https?:\/\//i.test(get(r,'zocus_url'))?get(r,'zocus_url'):'',
      aiCoach:get(r,'ai_coaching').split('|').map(t=>t.trim()).filter(Boolean),aiQuote:get(r,'ai_coaching_quote'),
      aiPromises:get(r,'ai_commitments').split('|').map(t=>t.trim()).filter(Boolean),aiNext:get(r,'ai_next_action'),
      aiNotes:get(r,'ai_notes').split('|').map(t=>t.trim()).filter(Boolean),
      aiChecks:get(r,'ai_checks').split(' | ').map(t=>{const m=t.trim().match(/^(MET|PARTLY|NOT_MET|NA):\s*(.*?)\s*\((\w+)\)\.?\s*([\s\S]*)$/);if(!m)return null;const qi=m[4].indexOf('\u275D'),why=qi>=0?m[4].slice(0,qi).trim():m[4],quote=qi>=0?m[4].slice(qi+1).replace(/\u275E\s*$/,'').trim():'';return {ok:m[1]==='MET',mark:m[1]==='MET'?'done':m[1]==='PARTLY'?'partly':m[1]==='NA'?'na':'missed',label:m[2],id:m[3],why,quote}}).filter(Boolean),
      endAt:parseDate(get(r,'ended_at')),analysedAt:parseDate(get(r,'analysed_at')),
      sumNeed:get(r,'sum_need'),sumHappened:get(r,'sum_happened'),sumOutcome:get(r,'sum_outcome'),sumWhy:get(r,'sum_why'),sumNext:get(r,'sum_next'),
      promises:jsonOf(get(r,'promises_json')),concerns:jsonOf(get(r,'concerns_json')),prices:jsonOf(get(r,'prices_json')),trEn:jsonOf(get(r,'tr_en'),{}),tdNote:get(r,'test_drive_note'),parts:jsonOf(get(r,'parts_json')),valueWhy:get(r,'value_why'),outcomeSrc:get(r,'outcome_src'),visit:get(r,'visit').toLowerCase(),visitHistory:get(r,'visit_history'),arrived:get(r,'arrived'),needForm:get(r,'need_form'),stock:jsonOf(get(r,'stock_json'),null),objections:jsonOf(get(r,'objections_json')),crm:jsonOf(get(r,'crm_json'),{}),
      flags:get(r,'flags').split('|').map(s=>s.trim()).filter(Boolean),remarks:get(r,'remarks'),
      fBudget:get(r,'f_budget'),fPref:get(r,'f_preference'),fTiming:get(r,'f_timing'),fComp:get(r,'f_competitor'),
      valueSrc:get(r,'value_source').toLowerCase(),
      models:get(r,'models_considered').split('|').map(s=>s.trim()).filter(Boolean),mgroup:get(r,'model_group').toLowerCase(),fuel:get(r,'fuel').split('|').map(s=>s.trim()).filter(Boolean),colour:get(r,'colour').split('|').map(s=>s.trim()).filter(Boolean),
      quote:get(r,'quote_given').toLowerCase(),td:get(r,'test_drive').toLowerCase(),avail:get(r,'availability').toLowerCase()==='yes',availQ:get(r,'availability_quote'),prio:get(r,'priorities').split('|').map(s=>s.trim()).filter(Boolean),intent:get(r,'intent').toLowerCase(),decision:get(r,'decision').toLowerCase(),transcript:get(r,'transcript'),talkRep:get(r,'talk_rep_pct')===''?null:num(get(r,'talk_rep_pct')),
      turns:(()=>{const t=get(r,'transcript');if(!/^\[\d+:\d\d\] /.test(t))return null;return t.split('\n').map(l=>{const m=l.match(/^\[(\d+):(\d\d)\] ([^:]{0,40}): ([\s\S]*)$/);return m?{t:+m[1]*60+ +m[2],who:m[3],text:m[4]}:null}).filter(Boolean)})()}});
  if(noReason)warnings.push(noReason+' not-sold conversation'+(noReason>1?'s have':' has')+' no reason. They are grouped as "No clear reason".');
  REPS.sort((a,b)=>CONVS.filter(c=>c.rep===b.id).length-CONVS.filter(c=>c.rep===a.id).length||a.name.localeCompare(b.name));
  const first=raw[0].r;
  /* which optional columns actually carry data; sections that need one say so instead of drawing an empty chart */
  const rr=raw.map(x=>x.r),share=f=>rr.length?rr.filter(f).length/rr.length:0,filled=c=>share(r=>get(r,c)!=='')>=.2;
  const ns=rr.filter(r=>!/^(sold|yes|won)$/i.test(get(r,'outcome'))),nsFilled=c=>ns.length?ns.filter(r=>get(r,c)!=='').length/ns.length>=.3:false;
  const has={stock:filled('in_stock'),competitor:filled('competitor'),offer:filled('competitor_offer'),reason:nsFilled('reason'),stage:nsFilled('stage_reached'),
    followups:filled('followup_due'),replies:filled('objection_reply'),types:filled('customer_type'),
    ai:CONVS.some(c=>c.aiCoach.length||c.aiPromises.length||c.aiNext||c.aiNotes.length),checks:CONVS.some(c=>c.aiChecks.length),valueSrc:'value_source' in idx,floor:'quote_given' in idx,delivery:CONVS.some(c=>c.kind==='delivery'),rubric:CONVS.some(c=>c.aiChecks.some(x=>x.mark==='partly')),times:'ended_at' in idx,promises:CONVS.some(c=>c.promises.length),transcript:CONVS.some(c=>c.transcript)};
  return {ok:true,name,warnings,
    ds:{has,vertical:(get(first,'vertical')||'').toLowerCase(),today,store:get(first,'store_name')||'Your store',owner:get(first,'owner_name')||'',REPS,PRODUCTS,PERSONAS,COMPS,CONVS,customReasons,hasObjection,rawText:text,file:name}}}

/* ---------- Storage (IndexedDB, falls back to memory) ---------- */
let mem=null;
function idb(){return new Promise((res,rej)=>{try{const q=indexedDB.open('zocus-dashboard',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}})}
async function kvGet(k){try{const db=await idb();return await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(e){return mem}}
async function kvSet(k,v){mem=v;try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
async function kvDel(k){mem=null;try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}

/* ---------- UI: Data menu, modal, drag-drop ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(t){const r=document.getElementById('toastRoot');if(!r)return;r.innerHTML='<div class="toast" role="status">'+esc(t)+'</div>';clearTimeout(toast.t);toast.t=setTimeout(()=>r.innerHTML='',3200)}
function modal(title,body){const root=document.getElementById('modalRoot');
  root.innerHTML='<div class="pal-scrim" data-zact="mclose"></div><div class="zmodal" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><h3>'+esc(title)+'</h3><div class="zbody">'+body+'</div><div class="zfoot"><button class="btn primary sm" data-zact="mclose">Close</button></div></div>';
  const b=root.querySelector('button');if(b)b.focus()}
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function snapCountLabel(ds){const all=ds.CONVS||[],sales=all.filter(c=>c.kind!=='delivery').length,del=all.length-sales;
  return sales+' sales conversation'+(sales===1?'':'s')+(del?' · '+del+' after booking':'')}
function snapActions(ds){return ds.snapshot&&!ds.empty?'<button data-zact="report">Day report (PDF)</button><button data-zact="crmpage">CRM records</button><button data-zact="crm">CRM sheet (CSV)</button>':''}
function menuHtml(){const ds=window.ZD;
  if(ds.focus)return '<div class="dm-info"><b>'+esc(ds.store)+'</b><span>'+(ds.snapshot?snapCountLabel(ds):(ds.CONVS?ds.CONVS.length:0)+' conversations')+'</span></div>'+storeOptions().map(o=>'<button data-zact="store" data-id="'+esc(o.id)+'"'+(o.id===ds.storeId?' aria-current="true"':'')+'><span class="dm-dot"></span>'+esc(o.label)+'</button>').join('')+snapActions(ds)+(ds.rawText?'<button data-zact="export">Export current data (CSV)</button>':'')+(ds.empty?'':'<button data-zact="tour">Show me around</button>');
  if(ds.locked)return '<div class="dm-info"><b>'+esc(ds.store)+'</b><span>'+(ds.snapshot?snapCountLabel(ds):(ds.CONVS?ds.CONVS.length:0)+' conversations')+'</span></div>'+snapActions(ds)+(ds.rawText?'<button data-zact="export">Export current data (CSV)</button>':'')+(ds.empty?'':'<button data-zact="tour">Show me around</button>');
  const info=ds.isSample?'Showing sample data (fictional store)':esc(ds.file)+' · '+(ds.snapshot?snapCountLabel(ds):ds.CONVS.length+' conversations');
  const so=storeOptions(),storeList=ds.stores&&ds.stores.length?[...GROUPS,['upload','Your upload']].map(([g,l])=>{const a=so.filter(x=>x.group===g);return a.length?'<div class="dm-sec">'+esc(l)+'</div>'+a.map(o=>'<button data-zact="store" data-id="'+esc(o.id)+'"'+(o.id===ds.storeId?' aria-current="true"':'')+'><span class="dm-dot"></span>'+esc(o.label)+'</button>').join(''):''}).join('')+'<div class="dm-sec">Data</div>':'';
  return '<div class="dm-info"><b>'+(ds.isSample?'Data':esc(ds.store))+'</b><span>'+info+'</span></div>'+storeList+
   '<button data-zact="upload"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>Upload CSV</button>'+
   (ds.empty?'':'<button data-zact="export"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>Export current data (CSV)</button>')+
   '<button data-zact="template"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>Download CSV template</button>'+
   (ds.isSample?'':'<button data-zact="reset"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/></svg>Reset to sample data</button>')+
   snapActions(ds)+
   (ds.empty?'':'<button data-zact="tour"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.3-2.7 3.9"/></svg>Show me around</button>')+
   '<p class="dm-note">Uploaded files stay in this browser only.</p>'}
function toggleMenu(force){const m=document.getElementById('dataMenu'),b=document.querySelector('[data-zact="menu"]');if(!m)return;
  const open=force===undefined?m.hidden:force;if(open)m.innerHTML=menuHtml();m.hidden=!open;if(b)b.setAttribute('aria-expanded',String(open))}
async function handleFile(file){
  if(!file||(window.ZD&&(window.ZD.locked||window.ZD.focus)))return;toggleMenu(false);
  if(file.size>25*1024*1024){modal('File too large','<p>The file is over 25 MB. Export a shorter period and try again.</p>');return}
  const text=await file.text(),res=build(text,file.name);
  if(!res.ok){modal('This file was not loaded','<p>Nothing was changed. Fix these and upload again:</p><ul class="zerr">'+res.errors.map(e=>'<li><b>Line '+e.row+'</b> '+esc(e.msg)+'</li>').join('')+'</ul>'+(res.errors.length>=25?'<p class="hint">Showing the first 25 problems.</p>':''));return}
  await kvSet('csv',{name:file.name,text,savedAt:Date.now()});setChoice('upload');
  try{sessionStorage.setItem('zocus-skip-splash','1');sessionStorage.setItem('zocus-loaded-msg',JSON.stringify({n:res.ds.CONVS.length,name:file.name,w:res.warnings}))}catch(e){}
  location.reload()}
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-zact]');
  if(!t){const m=document.getElementById('dataMenu');if(m&&!m.hidden&&!e.target.closest('#dataMenu'))toggleMenu(false);return}
  const a=t.dataset.zact;
  if(a==='menu'){toggleMenu()}
  else if(a==='store'){setStore(t.dataset.id)}
  else if(a==='tour'){toggleMenu(false);const h=document.querySelector('[data-act="tour"]');if(h)h.click()}
  else if(a==='mclose'){document.getElementById('modalRoot').innerHTML=''}
  else if(a==='upload'){document.getElementById('zfile').click()}
  else if(a==='report'){toggleMenu(false);location.hash='#report'}
  else if(a==='crmpage'){toggleMenu(false);const q=[];if(window.ZD&&window.ZD.locked)q.push('dealer');try{const m=(location.hash||'').match(/^#(?:rep|coach)-(.+?)(?:\/|$)/);const id=m&&decodeURIComponent(m[1]);const rep=id&&(window.ZD.REPS||[]).find(r=>r.id===id);if(rep)q.push('rep='+encodeURIComponent(rep.first||rep.name))}catch(e){}location.href='crm.html'+(q.length?'?'+q.join('&'):'')}
  else if(a==='crm'){toggleMenu(false);try{const r=await fetch('data/cases/'+window.ZD.storeId+'-crm.csv',{cache:'no-store'});if(!r.ok)throw 0;download('zocus-crm-sheet.csv',await r.text())}catch(err){toast('The CRM sheet is not ready yet.')}}
  else if(a==='export'){download((window.ZD.isSample?'zocus-sample':'zocus-data')+'.csv',window.ZD.rawText);toggleMenu(false)}
  else if(a==='template'){toggleMenu(false);try{const r=await fetch(TEMPLATE_URL);download('zocus-template.csv',await r.text())}catch(err){toast('Could not load the template.')}}
  else if(a==='reset'){await kvDel('csv');setChoice('sample');try{sessionStorage.setItem('zocus-skip-splash','1')}catch(e){}location.reload()}
});
document.addEventListener('change',e=>{if(e.target.id==='zfile'){handleFile(e.target.files[0]);e.target.value=''}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleMenu(false);const m=document.getElementById('modalRoot');if(m&&m.innerHTML)m.innerHTML=''}});
let dragN=0;
addEventListener('dragenter',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){dragN++;document.getElementById('dropHint').hidden=false}});
addEventListener('dragleave',()=>{dragN=Math.max(0,dragN-1);if(!dragN)document.getElementById('dropHint').hidden=true});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dragN=0;document.getElementById('dropHint').hidden=true;if(e.dataTransfer.files&&e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])});

/* ---------- Boot ---------- */
function fatal(msg){document.body.insertAdjacentHTML('beforeend','<div class="zfatal"><div><h2>Could not load the data</h2><p>'+msg+'</p></div></div>')}
const CASES_URL='data/cases.json',CHOICE_KEY='zocus-store';
const choice=()=>{try{return localStorage.getItem(CHOICE_KEY)||''}catch(e){return ''}};
function setChoice(v){try{localStorage.setItem(CHOICE_KEY,v)}catch(e){}}
/* Stores = groups of real test conversations described in data/cases.json. A store is listed only if its CSV (data/cases/<id>.csv) is present. */
async function loadStores(){
  try{const r=await fetch(CASES_URL,{cache:'no-store'});if(!r.ok)return [];const j=await r.json(),out=[];
    await Promise.all((j.stores||[]).map(async st=>{try{const file=st.file||'data/cases/'+st.id+'.csv',c=await fetch(file,{cache:'no-store'});if(!c.ok)return;const text=await c.text();if(/^\s*<(!doctype|html)/i.test(text))return;let meta=null;try{const m=await fetch(file.replace(/\.csv$/,'.meta.json'),{cache:'no-store'});if(m.ok)meta=await m.json()}catch(e){}out.push({id:st.id,name:st.name,vertical:st.vertical||'',featured:(st.featured||[]).map(n=>'ZC-'+n),text,meta,isDefault:!!st.default,timeless:!!st.timeless,snapshot:!!st.snapshot,repFull:!!st.repFull,empty:parseCSV(text).length<2,group:st.group||(st.timeless?'test':'pilot')})}catch(e){}}));
    const order=(j.stores||[]).map(x=>x.id);return out.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id))}catch(e){return []}}
function setStore(id){setChoice(id);try{sessionStorage.setItem('zocus-skip-splash','1')}catch(e){}location.reload()}
/* For the pilot the site opens on the pilot store only (also …/?dealer); …/?all shows every store, demos and upload.
   Locked mode: no store switcher, no demo stores, no upload. It hides, it does not secure. */
const QS=(()=>{try{return new URLSearchParams(location.search)}catch(e){return new URLSearchParams('')}})();
const LOCKED=QS.has('dealer'),FOCUS=!LOCKED&&!QS.has('all'),FOCUS_IDS=['pilot','pilot-day'];
const dayName=s=>{const d=parseDate(s);return d?['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]+' '+d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]:''};
const clock=s=>{const m=String(s||'').match(/(\d{1,2}):(\d{2})\s*$/);if(!m)return '';const h=+m[1];return (h%12||12)+':'+m[2]+(h<12?' am':' pm')};
/* A one-day store with nothing ready yet: say so, instead of falling back to the sample store. app.js is not started. */
function emptyDay(st,stores,rec){
  const m=st.meta||{},wait=(m.analysing||[]).length,bits=[];
  if(m.recorded)bits.push(m.recorded+' recorded so far'+(wait?', '+wait+' still being analysed':''));
  if(m.exportedLocal)bits.push('last updated '+clock(m.exportedLocal));
  window.ZD={empty:true,locked:LOCKED,focus:FOCUS,isSample:false,storeId:st.id,store:st.name,file:st.id+'.csv',meta:m,CONVS:[],rawText:'',
    stores:stores.map(x=>({id:x.id,name:x.name,vertical:x.vertical,group:x.group})),hasUpload:!!(rec&&rec.text),uploadName:rec&&rec.name||''};
  document.documentElement.classList.add('emptyday');document.title=st.name+' · Zocus AI';
  const TABS=[['home','Overview'],['insights','Insights'],['team','Team'],['coaching','Coaching'],['conversations','Conversations'],['followups','Follow-ups']],demo=stores.find(x=>x.id==='pilot-day'&&!x.empty);
  const nav=()=>{const h=(location.hash||'#home').slice(1),cur=TABS.some(t=>t[0]===h)?h:'home',html=TABS.map(t=>'<a href="#'+t[0]+'"'+(t[0]===cur?' aria-current="page"':'')+'><span>'+t[1]+'</span></a>').join('');document.getElementById('nav').innerHTML=html;document.getElementById('bnav').innerHTML=html;const h1=document.querySelector('#page .phead h1');if(h1)h1.textContent=TABS.find(t=>t[0]===cur)[1]};
  addEventListener('hashchange',nav);setTimeout(nav,0);
  document.getElementById('page').innerHTML='<div class="phead"><h1>Overview</h1><p>'+esc(st.name)+' · '+esc(dayName(m.date)||'Pilot day')+'</p></div>'+
    '<section class="card" style="text-align:center;padding:52px 20px"><b style="font-size:18px">No conversations yet today</b>'+
    '<p class="hint" style="margin:8px auto 0;max-width:520px">Conversations appear here after they are recorded, analysed and the page is updated. Updates are planned around 12 pm, 4 pm and 8 pm.'+(bits.length?' '+esc(bits.join(' · ').replace(/^./,c=>c.toUpperCase()))+'.':'')+'</p>'+(demo&&!LOCKED?'<div class="btnrow" style="justify-content:center;margin-top:18px"><button class="btn primary" data-zact="store" data-id="pilot-day">See a sample day (fictional data)</button></div><p class="hint" style="margin:10px 0 0">Or pick it from the store menu at the top. Every tab fills in once real conversations arrive.</p>':'')+'</section>';
  fillStoreSelect();return window.ZD}
async function load(){
  let res=null;
  if(LOCKED)document.documentElement.classList.add('locked');
  const rec=LOCKED||FOCUS?null:await kvGet('csv'),stores=(await loadStores()).filter(x=>!FOCUS||FOCUS_IDS.includes(x.id)),pick=LOCKED?'':FOCUS&&!FOCUS_IDS.includes(choice())?'':choice();
  const st=stores.find(x=>x.id===pick)||(!pick?stores.find(x=>x.isDefault):null);
  if(LOCKED&&!st){fatal('The pilot data is not available yet. Please try again in a little while.');throw new Error('dealer link: no pilot store')}
  if(st&&st.empty&&st.snapshot)return emptyDay(st,stores,rec);
  if(st){const b=build(st.text,st.id+'.csv');if(b.ok){res=b;res.ds.isSample=false;res.ds.storeId=st.id;res.ds.featured=st.featured;res.ds.meta=st.meta;res.ds.timeless=st.timeless;res.ds.snapshot=st.snapshot;if(st.repFull)res.ds.REPS.forEach(r=>{r.first=r.name});res.ds.group=st.group;if(!res.ds.vertical)res.ds.vertical=st.vertical;if(st.snapshot)res.ds.store=st.name}}
  if(LOCKED&&!res){fatal('The pilot data could not be read. Please try again in a little while.');throw new Error('dealer link: pilot store invalid')}
  if(!res&&rec&&rec.text&&pick!=='sample'){const b=build(rec.text,rec.name);if(b.ok){res=b;res.ds.isSample=false;res.ds.storeId='upload'}}
  if(!res){
    let text;try{const r=await fetch(SAMPLE_URL);if(!r.ok)throw new Error(r.status);text=await r.text()}
    catch(e){fatal('The sample data could not be read. Open this page through a web server (for example <code>npx serve</code>), not by double-clicking the file.');throw e}
    res=build(text,'sample.csv');if(!res.ok)throw new Error('sample.csv invalid: '+res.errors[0].msg);res.ds.isSample=true;res.ds.storeId='sample'}
  res.ds.locked=LOCKED;res.ds.focus=FOCUS;
  res.ds.stores=stores.map(x=>({id:x.id,name:x.name,vertical:x.vertical,group:x.group}));res.ds.hasUpload=!!(rec&&rec.text);res.ds.uploadName=rec&&rec.name||'';
  const days=new Set(res.ds.CONVS.map(c=>c.d));res.ds.spanDays=days.size?Math.max(...days)+1:0;
  window.ZD=res.ds;fillStoreSelect();
  try{const m=JSON.parse(sessionStorage.getItem('zocus-loaded-msg')||'null');if(m){sessionStorage.removeItem('zocus-loaded-msg');
    setTimeout(()=>toast('Loaded '+m.n+' conversations from '+m.name+(m.w&&m.w.length?'. '+m.w[0]:'')),700)}}catch(e){}
  return res.ds}
const GROUPS=[['pilot','Pilot'],['test','Real test calls (no trends)'],['demo','Demo (fictional data)']];
function storeOptions(){const d=window.ZD,o=d.stores.map(s=>({id:s.id,label:s.name,group:s.group}));if(d.focus)return o;if(d.hasUpload)o.push({id:'upload',label:'Uploaded: '+d.uploadName,group:'upload'});o.push({id:'sample',label:'Sample store (fictional)',group:'demo'});return o}
function groupedOptions(sel){const o=storeOptions(),gs=[...GROUPS,['upload','Your upload']];return gs.map(([g,l])=>{const a=o.filter(x=>x.group===g);return a.length?{label:l,items:a}:null}).filter(Boolean).map(x=>'<optgroup label="'+esc(x.label)+'">'+x.items.map(i=>'<option value="'+esc(i.id)+'"'+(i.id===sel?' selected':'')+'>'+esc(i.label)+'</option>').join('')+'</optgroup>').join('')}
function fillStoreSelect(){const sel=document.getElementById('storeSel'),d=window.ZD;if(!sel||!d||!d.stores.length||d.locked)return;
  sel.innerHTML=groupedOptions(d.storeId);sel.hidden=false}
document.addEventListener('change',e=>{if(e.target.id==='storeSel')setStore(e.target.value)});
window.ZocusData={load,build,parseCSV,setStore};
})();
