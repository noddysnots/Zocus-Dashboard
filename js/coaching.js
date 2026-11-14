/* AI coaching module.
   For each rep: (1) find the skills where they score below the store, (2) find the customer objections they fail to
   resolve in those areas, (3) show how reps who score high on the same skill resolved the SAME objection, and
   (4) turn the rep's own recorded objections into practice drills. Everything is computed from the loaded dataset.
   Assign / reviewed / drill progress is kept in this browser (localStorage) until the backend has coaching_assignments. */
window.ZocusCoach=function(X){
'use strict';
const {W,CAR,PLAYBOOK,FLAT,SNAP,inTxt,baseTxt,S,REPS,REP,SKILLS,REASONS,COACH,CONVS,BEST,ZD,esc,ic,ring,inr,plural,fdate,sumv,cur,prev,stats,repRows,periodTxt,phead,render,toast,Q,scoreCol,groupBy}=X;
const LS='zocus-coach-v1';
let st={assign:{},drills:{},base:{}};
try{const r=JSON.parse(localStorage.getItem(LS)||'null');if(r&&typeof r==='object')st=Object.assign(st,r)}catch(e){}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}};
const open={},typed={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lc=s=>s.charAt(0).toLowerCase()+s.slice(1);

/* ---------- Plan builder (pure: reads the dataset, returns plain objects) ---------- */
const codesFor=sk=>Object.keys(REASONS).filter(k=>REASONS[k].skill===sk);
const objOf=c=>ZD.hasObjection?c.objection:(c.outcome!=='sold'?c.reason:null);
const isResolved=c=>ZD.hasObjection&&c.objResolved===true;

function peersFor(code,sk,repId,rows,store){
  let good=rows.filter(r=>r.rep.id!==repId&&r.s.skill[sk]>=store.skill[sk]+5).map(r=>r.rep.id);
  if(!good.length)good=rows.filter(r=>r.rep.id!==repId).sort((a,b)=>b.s.skill[sk]-a.s.skill[sk]).slice(0,2).map(r=>r.rep.id);
  const skillOf=Object.fromEntries(rows.map(r=>[r.rep.id,r.s.skill[sk]]));
  const pick=list=>list.filter(c=>good.includes(c.rep)&&objOf(c)===code&&isResolved(c)&&c.reply&&(ZD.isSample||c.skills[sk]>=70))
    .sort((a,b)=>b.skills[sk]-a.skills[sk]||b.value-a.value);
  let list=pick(cur());if(!list.length)list=pick(CONVS);
  const seen=new Set(),out=[];
  list.forEach(c=>{if(!seen.has(c.rep)&&out.length<2){seen.add(c.rep);out.push(c)}});
  list.forEach(c=>{if(out.length<2&&!out.includes(c))out.push(c)});
  if(out.length)return out.map(c=>({c,rep:REP[c.rep],skill:skillOf[c.rep],hi:c.reply,en:c.replyEn||c.reply,fallback:false}));
  const b=BEST[code],pb=PLAYBOOK[code];
  if(b&&(b.hi||b.en)&&(b.real||ZD.isSample))return [{c:null,rep:REP[b.rep],skill:skillOf[b.rep],hi:b.hi,en:b.en,fallback:true}];
  return pb?[{c:null,rep:null,skill:null,hi:pb.hi,en:pb.en,fallback:true,playbook:true}]:[]}
/* comparing reps with each other needs at least two tagged reps with three conversations each */
const cmpOK=rows=>rows.filter(r=>r.rep.name!=='Rep not tagged'&&r.s.n>=3).length>=2;

function weekly(repId,sk){
  const rep=[],store=[];
  for(let w=7;w>=0;w--){
    const all=CONVS.filter(c=>Math.floor(c.d/7)===w),mine=all.filter(c=>c.rep===repId);
    const avg=l=>l.length>=2?Math.round(l.reduce((a,c)=>a+c.skills[sk],0)/l.length):null;
    rep.push(avg(mine));store.push(all.length>=2?Math.round(all.reduce((a,c)=>a+c.skills[sk],0)/all.length):null)}
  return {rep,store}}
function clearedSkills(repId){
  return SKILLS.filter(k=>{const w=weekly(repId,k.id);const a=w.rep.slice(-2),b=w.store.slice(-2);
    return a.every(v=>v!=null)&&b.every(v=>v!=null)&&a[0]>=b[0]&&a[1]>=b[1]})}

function plan(id){
  const L=cur(),store=stats(L),rows=repRows(L),row=rows.find(r=>r.rep.id===id);if(!row)return null;
  const s=row.s,rep=row.rep;
  const gaps=SKILLS.map(k=>({id:k.id,label:k.label,mine:s.skill[k.id],store:store.skill[k.id],gap:s.skill[k.id]-store.skill[k.id],best:Math.max(...rows.map(r=>r.s.skill[k.id]))})).sort((a,b)=>a.gap-b.gap);
  const focus=gaps.filter(g=>g.gap<0).slice(0,2).map(g=>{
    const codes=codesFor(g.id);
    const fails=row.L.filter(c=>codes.includes(objOf(c))&&!isResolved(c));
    const lost=fails.filter(c=>c.outcome!=='sold');
    const groups=Object.entries(groupBy(fails,c=>objOf(c))).map(([code,list])=>{
      list.sort((a,b)=>a.skills[g.id]-b.skills[g.id]);
      const lostList=list.filter(c=>c.outcome!=='sold'),w=list[0];
      return {code,label:REASONS[code].label,n:list.length,lostN:lostList.length,lostV:sumv(lostList),worst:w,
        hi:w.objQuote||w.cq||REASONS[code].hi||'',en:w.objQuoteEn||w.cqEn||REASONS[code].en||'',
        peers:peersFor(code,g.id,id,rows,store)}}).sort((a,b)=>b.lostV-a.lostV||b.n-a.n).slice(0,3);
    return Object.assign({},g,{codes,lostN:lost.length,lostV:sumv(lost),groups})});
  const drills=[];
  focus.forEach(f=>f.groups.forEach(g=>{if((g.hi||g.en)&&drills.length<4)drills.push({key:id+'|'+f.id+'|'+g.code,skill:f,group:g})}));
  const pp=stats(prev().filter(c=>c.rep===id)),trend=pp.n?clamp(50+(s.score-pp.score)*5,0,100):50;
  const done=drills.filter(d=>st.drills[d.key]).length,practice=drills.length?done/drills.length*100:0;
  const readiness=Math.round(.7*s.score+.15*trend+.15*practice);
  return {rep,row,s,store,gaps,focus,drills,done,readiness,opportunity:focus.reduce((a,f)=>a+f.lostV,0),rows}}

function ensureBase(p){if(p.focus[0]&&!st.base[p.rep.id]){st.base[p.rep.id]={skill:p.focus[0].id,val:p.focus[0].mine,at:Date.now()};save()}}
function statusOf(p){const b=st.base[p.rep.id],a=st.assign[p.rep.id];
  if(b&&p.s.skill[b.skill]>=b.val+3)return ['good','Improving'];
  if(a==='reviewed')return ['neutral','Reviewed'];if(a==='assigned')return ['warn','Assigned'];
  return p.focus.length?['gold','Plan ready']:['good','On track']}

/* ---------- Pieces ---------- */
const ZC=window.ZCharts;
const SHORT={need:'Need',budget:'Budget',pitch:W.pitchShort,objection:'Price doubts',close:'Closing'};
let hubSkill=null;const tabs={};
function skillBar(g){return `<div class="bar" style="margin:8px 0 6px"><i style="width:${g.mine}%;background:${scoreCol(g.mine)}"></i><span class="tick" style="left:${g.store}%"></span></div>
  <div class="hint num">${g.mine} · ${W.Store} ${g.store}${g.cmp===false?'':` · Best rep ${g.best}`}</div>`}
const see=(c)=>c?`<button class="tbtn" data-conv="${c.id}">Open conversation${ic('right',10)}</button>`:'';
function peerHtml(g){return g.peers.length?g.peers.map(pr=>pr.playbook?`<div class="quote">${Q(pr.hi,pr.en)}<div class="by">Suggested line · Zocus playbook</div></div><p class="hint" style="margin:6px 0 0">No answer recorded so far scored well enough to use as the example, so this is a playbook line, not a rep's words.</p>`:`<div class="quote">${Q(pr.hi,pr.en)}<div class="by">${pr.fallback?'Suggested answer':'What works'} · <span class="rlink" role="link" tabindex="0" data-go="#rep-${pr.rep.id}">${esc(pr.rep.name)}</span>${pr.skill!=null?` · scores ${pr.skill} here`:''}</div>
    ${pr.c?`<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${see(pr.c,pr.c.objAt)}<span class="hint">${esc(pr.c.customer)} · ${fdate(pr.c.at)} · ${pr.c.outcome==='sold'?W.soldLc:'objection resolved'}</span></div>`:''}</div>`).join(''):
    `<p class="hint" style="margin:0">No resolved example from a high scorer yet. ${esc(COACH[g.skillId]||'')}</p>`}
function groupBlock(rep,f,g){return `<div class="cols2"><div><span class="mono">Where ${esc(rep.first)} lost it</span><div class="quote bad" style="margin-top:6px">${Q(g.hi,g.en)}<div class="by">${esc(g.worst.customer)} · ${fdate(g.worst.at)} · ${esc(rep.first)} scored ${g.worst.skills[f.id]}</div>
    <div style="margin-top:8px">${see(g.worst,g.worst.objAt)}</div></div></div>
  <div><span class="mono">${g.peers[0]&&g.peers[0].playbook?'A line to try':'How top reps answer it'}</span><div class="peers" style="margin-top:6px">${peerHtml(Object.assign({},g,{skillId:f.id}))}</div></div></div>`}

/* ---------- Pages ---------- */
function renderHub(){
  const L=cur(),store=stats(L);
  const all=REPS.map(r=>plan(r.id)).filter(Boolean).sort((a,b)=>b.opportunity-a.opportunity||a.readiness-b.readiness);
  const total=all.reduce((a,p)=>a+p.opportunity,0),assigned=all.filter(p=>st.assign[p.rep.id]).length,withFocus=all.filter(p=>p.focus.length);
  const drillsAll=all.reduce((a,p)=>a+p.drills.length,0),drillsDone=all.reduce((a,p)=>a+p.done,0);
  const bySkill=SKILLS.map(k=>{const lost=L.filter(c=>c.outcome!=='sold'&&c.reason&&REASONS[c.reason].skill===k.id);return {k,v:sumv(lost),n:lost.length}}).sort((a,b)=>b.v-a.v);
  const topSkill=bySkill[0]&&bySkill[0].v?bySkill[0]:null;
  const avgR=all.length?Math.round(all.reduce((a,p)=>a+p.readiness,0)/all.length):0;
  const plans=hubSkill?all.filter(p=>p.focus.some(f=>f.id===hubSkill)):all;
  const allThin=SNAP&&all.every(p=>p.row.thin);
  const lead=allThin?`No rep has 3 conversations yet, so reps are not rated. Start with what the whole floor misses, below.`:withFocus.length?`<b>${plural(withFocus.length,'rep')}</b> ${withFocus.length===1?'has':'have'} a clear focus area.${topSkill?` The costliest step for the ${W.store} is <b>${esc(topSkill.k.label.toLowerCase())}</b>: ${plural(topSkill.n,'customer')}, ${inr(topSkill.v)}.`:''} Start with <b>${esc(all[0].rep.first)}</b>.`:`Every rep is at or above the ${W.store} average on every skill.`;
  const tiles=ZC.tile({label:'Reps with a focus area',value:withFocus.length,sub:'of '+all.length})+ZC.tile({label:'Left at those steps',value:inr(total),sub:'value not closed'})+ZC.tile({label:'Plans assigned',value:assigned,sub:'of '+withFocus.length+' ready'})+ZC.tile({label:'Practice drills done',value:drillsDone,sub:'of '+drillsAll});
  const money=ZC.barList(bySkill.filter(x=>x.v).map(x=>({label:x.k.label,value:x.v,text:inr(x.v),on:hubSkill===x.k.id,attr:`data-act="coach-skill" data-key="${x.k.id}" aria-pressed="${hubSkill===x.k.id}"`,tip:`${x.k.label}|${plural(x.n,'customer')} left at this step|${inr(x.v)} not closed`})),{empty:'No lost '+W.sales+' tied to a skill in this period.'});
  const ready=ZC.barList([...all].filter(p=>!p.row.thin).sort((a,b)=>b.readiness-a.readiness).map(p=>({label:p.rep.first,value:p.readiness,text:String(p.readiness),attr:`data-go="#coach-${p.rep.id}"`,tip:`${p.rep.name}|Readiness ${p.readiness}|Score ${p.s.score} · ${p.done} of ${p.drills.length} drills`})),{max:100,ref:avgR});
  const grid=ZC.heatGrid({cols:SKILLS.map(k=>SHORT[k.id]),rows:[...all].sort((a,b)=>b.s.score-a.s.score).map(p=>({label:p.rep.first,attr:`data-go="#coach-${p.rep.id}"`,cells:SKILLS.map(k=>{const g=p.s.skill[k.id]-store.skill[k.id];return {text:(g>0?'+':'')+g,cls:g>=5?'g':g<=-5?'b':'n',tip:`${p.rep.name}|${k.label}: ${p.s.skill[k.id]}|${W.Store} ${store.skill[k.id]}`}})}))});
  const floorMiss=(()=>{if(!SNAP)return '';const m={};L.forEach(c=>(c.aiChecks||[]).filter(x=>x.id!=='experience'&&x.mark!=='na'&&(x.mark?x.mark!=='done':!x.ok)).forEach(x=>{const r=m[x.label]||(m[x.label]={n:0,miss:0,ex:c,why:x.why});r.n++;if(x.mark==='missed'||x.ok===false)r.miss++}));const scored=L.filter(c=>c.aiChecks&&c.aiChecks.length).length,top=Object.entries(m).sort((a,b)=>(b[1].miss*2+b[1].n)-(a[1].miss*2+a[1].n)).slice(0,5);
    if(!top.length)return '';return `<section class="card"><div class="card-h"><h2>What the floor missed today</h2><span class="hint">across ${plural(scored,'scored conversation')} · missed first, then partly done</span></div>${top.map(([t,v])=>`<div class="chk"><span class="pill ${v.miss?'bad':'warn'} num">${v.miss?v.miss+' missed':v.n+' partly'}</span><div>${esc(t)}${v.why?`<small>${esc(v.why)}</small>`:''}<div style="margin-top:6px">${see(v.ex)}</div></div></div>`).join('')}</section>`})();
  return phead('Coaching',`A plan for every rep, built from the skills they score low on and how your best reps answer the same customers. Based on ${baseTxt()}.`)+
  `<div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
  ${ZD.hasObjection||CAR?'':`<p class="hint" style="margin:-8px 0 0">This file has no objection columns, so suggested answers are Zocus's built-in examples, not your best reps' words. Add <b>objection</b>, <b>objection_resolved</b> and <b>objection_reply</b> to personalise them.</p>`}
  ${floorMiss}
  <div class="ktiles">${tiles}</div>
  <div class="cgrid3">
    ${ZC.ccard(topSkill?`Most money is lost at ${esc(topSkill.k.label.toLowerCase())}`:'Where the money leaks','Tap a skill to filter reps',money)}
    ${ZC.ccard('Readiness by rep',`Line is the average, ${avgR}`,ready)}
    ${ZC.ccard('Skill gap vs '+W.store,'Points above or below',grid)}
  </div>
  <section class="card"><div class="card-h"><h2>Coaching plans${hubSkill?` · ${esc(SKILLS.find(k=>k.id===hubSkill).label)}`:''}</h2>${hubSkill?`<button class="link" data-act="coach-skill" data-key="${hubSkill}">Show all reps</button>`:'<span class="hint">Biggest opportunity first. Tap a row to open it.</span>'}</div>
  ${plans.length?plans.map(p=>{const stt=statusOf(p),f=p.focus[0],g=f&&f.groups[0],pr=g&&g.peers[0];
    return `<details class="xrow"><summary class="crow2">${p.row.thin?`<span class="hint num" style="width:36px;text-align:center">${p.s.n}</span>`:ring(p.readiness,36)}<span class="nm"><b>${esc(p.rep.name)}</b></span><span class="fc">${f?esc(f.label):'Above '+W.store+' on every skill'}</span><span class="num gp">${f?`<span class="pill bad">${f.gap} vs ${W.store}</span>`:''}</span><span class="num mv">${f&&f.lostV?inr(f.lostV):''}</span><span><span class="pill ${stt[0]}">${stt[1]}</span></span>${ic('chev',16)}</summary>
    <div class="xr-b">${f?`<div class="cols2"><div><span class="mono">${g?'Loses it when customers say':'Focus'}</span>${g?`<div class="quote bad" style="margin-top:6px">${Q(g.hi,g.en)}<div class="by">${esc(g.label)} · ${plural(g.n,'time')}${g.lostV?' · '+inr(g.lostV)+' lost':''}</div></div>`:`<p style="margin:6px 0 0">${esc(COACH[f.id])}</p>`}</div>
      <div><span class="mono">${pr?(pr.playbook?'A line to try':pr.fallback?'Suggested answer':'What '+esc(pr.rep.first)+' says'):'Tip'}</span>${pr?`<div class="quote" style="margin-top:6px">${Q(pr.hi,pr.en)}<div class="by">${pr.playbook?'Suggested line · Zocus playbook':esc(pr.rep.name)+(pr.skill!=null?' · scores '+pr.skill+' here':'')}</div></div>`:`<p style="margin:6px 0 0">${esc(COACH[f.id])}</p>`}</div></div>`:`<p class="hint" style="margin:0">Their answers are what the rest of the team learns from.</p>`}
    <div class="xr-f"><span class="hint">${f&&p.focus[1]?`Then: ${esc(p.focus[1].label)} (${p.focus[1].mine} vs ${p.focus[1].store}). `:''}${p.drills.length?`${p.done} of ${plural(p.drills.length,'drill')} done.`:''}</span><div class="btnrow"><button class="btn primary sm" data-go="#rep-${p.rep.id}/coaching">Open full plan${ic('right',14)}</button><button class="btn sm" data-go="#rep-${p.rep.id}">Profile</button>${f&&st.assign[p.rep.id]!=='assigned'?`<button class="btn sm" data-act="coach-assign" data-id="${p.rep.id}">Assign plan</button>`:''}</div></div></div></details>`}).join(''):'<p class="hint">No rep has this as a focus area.</p>'}
  </section>
  <p class="hint">Readiness is the conversation score (70%), the change since the previous period (15%) and practice drills done (15%).</p>`}

function noteFor(p){const rep=p.rep;return `Coaching plan for ${rep.name} (${periodTxt()})\nReadiness ${p.readiness}\n`+(p.focus.length?p.focus.map((f,i)=>`${i+1}. ${f.label}: ${f.mine} vs ${W.store} ${f.store}. ${COACH[f.id]}${f.groups[0]&&f.groups[0].peers[0]?`\n   Try: "${f.groups[0].peers[0].en}" (${f.groups[0].peers[0].playbook?'Zocus playbook':f.groups[0].peers[0].rep.first})`:''}`).join('\n'):'On track. No focus area.');}
function renderPlan(id){
  const p=plan(id);if(!p)return phead('Coaching','No conversations for this rep '+inTxt()+'.');
  ensureBase(p);
  const rep=p.rep,stt=statusOf(p),f0=p.focus[0],cleared=clearedSkills(id),cmp=cmpOK(p.rows);
  const top=f0&&f0.groups[0]&&f0.groups[0].peers[0];
  const lead=f0?`${esc(rep.first)} loses most ${W.sales} at <b>${esc(lc(f0.label))}</b>: ${f0.mine} against the ${W.store}'s ${f0.store}.${f0.lostN?` ${plural(f0.lostN,'customer')} (${inr(f0.lostV)}) left at this step.`:''}${top&&!top.playbook?` ${esc(top.rep.first)} has an answer that worked on the same objection.`:''}`:
    `${esc(rep.first)} is at or above the ${W.store} average on every skill. Their answers are what the rest of the team learns from.`;
  const note=noteFor(p);
  const best=p.gaps[p.gaps.length-1],improved=st.base[id]?p.s.skill[st.base[id].skill]-st.base[id].val:0;
  const sk=(f0||best).id,w=weekly(id,sk),labels=w.rep.map((_,i)=>i===7?'This week':(7-i)+' wk ago');
  const focusCards=p.focus.map((f,i)=>{const key=id+'|'+f.id,ti=Math.min(tabs[key]||0,Math.max(0,f.groups.length-1)),g=f.groups[ti];
    return ZC.xcard('cf-'+key,`${i+1}. ${esc(f.label)}`,`<span class="num">${f.mine} vs ${W.store} ${f.store}</span>${f.lostN?` · ${plural(f.lostN,'customer')} left, ${inr(f.lostV)}`:''}`,
     skillBar(Object.assign({},f,{cmp:cmp}))+(f.groups.length?`<div class="otabs" role="tablist">${f.groups.map((x,xi)=>`<button role="tab" aria-selected="${xi===ti}" data-act="coach-tab" data-key="${esc(key)}" data-i="${xi}">${esc(x.label)} <small class="num">${x.n}</small></button>`).join('')}</div>${groupBlock(rep,f,g)}`:
       `<p class="hint" style="margin:12px 0 0">No recorded objections tied to this skill in the period.</p>`)+
     `<div class="try"><span class="mono">Try this</span><p>${esc(COACH[f.id])}${f.groups[0]&&f.groups[0].peers[0]?` Start with: <b>"${esc(f.groups[0].peers[0].en)}"</b>`:''}</p></div>`,
     {open:i===0,right:`<span class="pill bad num">${f.gap} vs ${W.store}</span>`})}).join('');
  const flagged=(()=>{if(!ZD.has||!ZD.has.ai)return '';const all=cur().filter(c=>c.rep===id),L=all.filter(c=>c.aiCoach&&c.aiCoach.length);if(!L.length)return '';
    const m={};L.forEach(c=>c.aiCoach.forEach(t=>{const i=t.indexOf(': '),title=i>0?t.slice(0,i):t;(m[title]||(m[title]={n:0,ex:c,sug:i>0?t.slice(i+2):''})).n++}));
    const top=Object.entries(m).sort((a,b)=>b[1].n-a[1].n).slice(0,3);
    return ZC.xcard('ca-'+id,'What the AI flagged',`${L.length} of ${plural(all.length,'conversation')} had coaching tips`,top.map(([t,v])=>`<div class="aitip"><b>${esc(t)}</b> <span class="pill neutral num">${v.n}x</span>${v.sug?`<br><span>${esc(v.sug)}</span>`:''}<div style="margin-top:6px">${see(v.ex)}</div></div>`).join(''),{open:false})})();
  const missed=(()=>{const all=cur().filter(c=>c.rep===id&&c.aiChecks&&c.aiChecks.length);if(!all.length)return '';const m={};
    all.forEach(c=>c.aiChecks.filter(x=>!x.ok).forEach(x=>{(m[x.label]||(m[x.label]={n:0,ex:c,why:x.why})).n++}));
    const top=Object.entries(m).sort((a,b)=>b[1].n-a[1].n).slice(0,4);if(!top.length)return '';
    return ZC.xcard('cm-'+id,'Skill checks missed most',`across ${plural(all.length,'scored conversation')}`,top.map(([t,v])=>`<div class="chk"><span class="pill bad num">${v.n}x</span><div>${esc(t)}${v.why?`<small>${esc(v.why)}</small>`:''}<div style="margin-top:6px">${see(v.ex)}</div></div></div>`).join(''),{open:false})})();
  const drills=p.drills.length?ZC.xcard('cd-'+id,'Practice drills',`${p.done} of ${p.drills.length} done · real customer lines from ${esc(rep.first)}'s conversations`,
    p.drills.map((d,i)=>{const done=!!st.drills[d.key],o=!!open[d.key];return `<div class="drill ${done?'done':''}"><div class="dr-h"><span class="n">${i+1}</span><b>${esc(d.skill.label)}</b><span class="pill ${done?'good':'neutral'}">${done?'Done':'To do'}</span></div>
      <div class="quote bad">${Q(d.group.hi,d.group.en)}<div class="by">Customer says</div></div>
      <textarea rows="2" placeholder="How would you answer? (optional)" data-coach-ta="${esc(d.key)}" aria-label="Your answer">${esc(typed[d.key]||'')}</textarea>
      <div class="btnrow"><button class="btn sm" data-act="coach-reveal" data-key="${esc(d.key)}">${o?'Hide answers':'Show how top reps answer'}</button><button class="btn ${done?'':'primary'} sm" data-act="coach-drill" data-key="${esc(d.key)}">${done?'Undo':'Mark done'}</button></div>
      ${o?`<div class="peers" style="margin-top:10px">${peerHtml(Object.assign({},d.group,{skillId:d.skill.id}))}<div class="try" style="margin-top:8px"><span class="mono">Work on</span><p>${esc(COACH[d.skill.id])}</p></div></div>`:''}</div>`}).join(''),{open:false}):'';
  const progress=ZC.xcard('cp-'+id,'Progress',`${esc((f0||best).label)}${st.base[id]?` · ${improved>0?'+':''}${improved} pts since the plan started`:''}`,
    ZC.lineChart({labels,series:[{name:rep.first,values:w.rep},{name:W.Store,values:w.store,color:'#A39A8A'}],aria:'Weekly score for this skill, rep against the store'})+
    `<div class="chips" style="margin-top:10px">${cleared.length?cleared.map(k=>`<span class="pill good">${ic('check',12)}Cleared: ${esc(k.label)}</span>`).join(''):'<span class="hint">A skill is cleared after two weeks at or above the '+W.store+' average.</span>'}</div>`,{open:false});
  const review=ZC.xcard('cr-'+id,SNAP?'Today\'s review':'This week\'s review',`Did well: ${esc(SHORT[best.id])} · Work on: ${f0?esc(SHORT[f0.id]):'sharing'}`,
    `<div class="review"><div><span class="mono" style="color:var(--good)">Did well</span><p>${esc(best.label)}: <b class="num">${best.mine}</b> against the ${W.store}'s <b class="num">${best.store}</b>${best.gap>=0?'':`, the closest to the ${W.store} average`}.${improved>0?` Up ${improved} pts on ${esc(SKILLS.find(k=>k.id===st.base[id].skill).label.toLowerCase())} since the plan started.`:''}</p></div>
      <div><span class="mono" style="color:var(--warn)">Work on</span><p>${f0?`${esc(f0.label)}. ${esc(COACH[f0.id])}`:'Keep sharing your approach with newer reps.'}</p></div></div>`,{open:false});
  return `<div class="ctool"><span class="pill ${stt[0]}">${stt[1]}</span><button class="btn sm" data-act="coach-assign" data-id="${id}">${ic('check',14)}${st.assign[id]==='assigned'?'Assigned':'Assign plan'}</button><button class="btn sm" data-act="coach-review" data-id="${id}">${st.assign[id]==='reviewed'?'Reviewed':'Mark reviewed'}</button><span style="flex:1"></span>${ZC.xtools()}</div>
  ${ZD.hasObjection?'':`<p class="hint" style="margin:0">No objection columns in this file, so suggested answers are Zocus's built-in examples.</p>`}
  ${focusCards}
  ${flagged}
  ${missed}
  ${cmp?'':`<p class="hint" style="margin:0">Comparing reps with each other needs at least two tagged reps with three conversations each. Until then ${esc(rep.first)} is compared with the ${W.store} average, and example answers come from any conversation that scored 70 or more, or from the Zocus playbook.</p>`}
  ${!p.focus.length?mentorHtml(id):''}
  ${drills}
  <div class="cols">${FLAT?'':progress}${review}</div>
  <p class="hint">Assigned and reviewed status is saved in this browser until coaching is connected to the backend.</p>`}

function mentorHtml(id){
  const mine=CONVS.filter(c=>c.rep===id&&isResolved(c)&&c.reply).sort((a,b)=>b.skills.objection-a.skills.objection||b.value-a.value).slice(0,3);
  return mine.length?`<section class="card"><div class="card-h"><h2>${REPS.length<2?'Answers worth reusing':'Answers other reps learn from'}</h2></div>${mine.map(c=>`<div class="quote" style="margin-bottom:8px">${Q(c.reply,c.replyEn||c.reply)}<div class="by">${esc(REASONS[c.objection]?REASONS[c.objection].label:'Objection')} · ${esc(c.customer)}</div><div style="margin-top:8px">${see(c,c.objAt)}</div></div>`).join('')}</section>`:''}

/* ---------- Actions ---------- */
function act(a,t){
  const id=t.dataset.id,key=t.dataset.key;
  if(a==='coach-assign'&&id){const p=plan(id);if(p)ensureBase(p);st.assign[id]='assigned';save();toast('Plan assigned to '+REP[id].first);render()}
  else if(a==='coach-review'&&id){st.assign[id]='reviewed';save();toast('Marked as reviewed');render()}
  else if(a==='coach-reveal'&&key){open[key]=!open[key];render()}
  else if(a==='coach-skill'&&key){hubSkill=hubSkill===key?null:key;render()}
  else if(a==='coach-tab'&&key){tabs[key]=+t.dataset.i;render()}
  else if(a==='coach-drill'&&key){st.drills[key]=!st.drills[key];if(!st.drills[key])delete st.drills[key];save();render()}}
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.coachTa;if(k)typed[k]=e.target.value});

return {renderHub,renderPlan,act,plan,noteFor:id=>{const p=plan(id);return p?noteFor(p):''},status:id=>{const p=plan(id);return p?statusOf(p):['neutral','']}};
};
