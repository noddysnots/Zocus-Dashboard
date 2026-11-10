(function(){
'use strict';
/* ---------- Data (window.ZD is built from the CSV by js/data.js) ---------- */
const ZD=window.ZD;const TODAY=ZD.today;const DAY=864e5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SKILLS=[{id:'need',label:'Understanding the need'},{id:'budget',label:'Asking the budget'},{id:'pitch',label:'Showing the product'},{id:'objection',label:'Handling price doubts'},{id:'close',label:'Closing and next step'}];
const SK=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const REPS=ZD.REPS;const REP=Object.fromEntries(REPS.map(r=>[r.id,r]));
const PRODUCTS=ZD.PRODUCTS;
const PERSONAS=ZD.PERSONAS;const PER=Object.fromEntries(PERSONAS.map(p=>[p.id,p]));
const COMPS=ZD.COMPS;const COMP=Object.fromEntries(COMPS.map(c=>[c.id,c]));
const STAGES=['Talked to a rep','Need understood','Product shown','Price quoted','Sold'];
const REASONS={
 browse:{label:'Just browsing, need not found',stage:0,skill:'need',hi:'Bas dekh rahe the abhi, kuch final nahi hai.',en:'We were only looking, nothing decided yet.'},
 stock:{label:'Lightweight piece not in stock',stage:1,skill:null,hi:'Halka wala chahiye tha, 10 gram ke andar.',en:'I wanted a lighter one, under 10 grams.'},
 design:{label:'Did not like the designs',stage:2,skill:'pitch',hi:'Koi aur design nahi hai? Yeh thoda purana lag raha hai.',en:'No other designs? This one looks a bit dated.'},
 making:{label:'Making charges too high',stage:3,skill:'objection',hi:'Making charges bahut zyada hai, doosri jagah 8% tha.',en:'Making charges are too high, another store quoted 8%.'},
 budget:{label:'Over budget',stage:3,skill:'budget',hi:'Humara budget itna nahi tha, thoda kam mein dikhaiye.',en:'Our budget was lower, show us something cheaper.'},
 competitor:{label:'Comparing with another store',stage:3,skill:'objection',hi:'Ek baar aur jagah dekh ke aate hain, rate compare karna hai.',en:'We will check one more store first to compare rates.'},
 family:{label:'Needs family approval',stage:3,skill:'close',hi:'Mummy ko dikhana padega, kal leke aate hain.',en:'My mother needs to see it, we will bring her tomorrow.'}};
const BEST={
 making:{rep:'priya',hi:'Making pe aapko old gold exchange mein 100% value mil rahi hai, toh total kam padega.',en:'You get 100% value on your old gold exchange, so your total works out lower.'},
 budget:{rep:'priya',hi:'Aap kitne tak dekh rahe ho, taaki main sahi range dikhaun?',en:'What range are you looking at, so I can show you the right pieces?'},
 competitor:{rep:'arjun',hi:'Rate zaroor compare kijiye, saath mein hallmark aur buyback guarantee bhi dekhiye.',en:'Do compare the rate, and also compare our hallmark and buyback guarantee.'},
 family:{rep:'neha',hi:'Main yeh piece 2 din aapke liye hold kar deti hoon aur photo WhatsApp kar deti hoon.',en:'I will hold this piece for you for 2 days and WhatsApp you the photos.'},
 design:{rep:'vikram',hi:'Yeh catalogue dekhiye, yeh design 5 din mein aa jayega.',en:'Have a look at this catalogue, this design can arrive in 5 days.'},
 stock:{rep:'vikram',hi:'9 gram wala hum 7 din mein order kar sakte hain.',en:'We can order a 9 gram one for you in 7 days.'},
 browse:{rep:'priya',hi:'Kiske liye dekh rahe hain? Koi occasion aa raha hai?',en:'Who are you shopping for? Is there an occasion coming up?'}};
const COACH={need:'Ask who it is for and the occasion in the first 2 minutes, before showing any piece.',budget:'Ask the budget range before showing pieces. Top reps ask it within the first 3 minutes.',pitch:'For every piece shown, explain weight, 22K hallmark and making charges.',objection:'When the customer pushes on price, offer the old-gold exchange or buyback value before any discount.',close:'End every conversation with a next step: hold the piece, book a visit, or save the WhatsApp number.'};

REASONS.other={label:'No clear reason',stage:3,skill:null,hi:'',en:''};
ZD.customReasons.forEach(r=>{REASONS[r.code]={label:r.label,stage:r.stage,skill:null,hi:r.hi,en:r.en}});
const CONVS=ZD.CONVS;
const CONV=Object.fromEntries(CONVS.map(c=>[c.id,c]));
/* Best answer per objection: mined from the data (highest-scoring resolved reply); built-in lines are the fallback. */
function topRepFor(area){let best=null;REPS.forEach(r=>{const L=CONVS.filter(c=>c.rep===r.id);if(!L.length)return;const v=L.reduce((a,c)=>a+c.skills[area],0)/L.length;if(!best||v>best.v)best={id:r.id,v}});return best?best.id:REPS[0].id}
(function(){const builtin=Object.assign({},BEST);
 new Set(Object.keys(REASONS).concat(['competitor'])).forEach(k=>{
  const area=(REASONS[k]&&REASONS[k].skill)||'objection';
  const cand=CONVS.filter(c=>c.objection===k&&c.objResolved&&c.reply).sort((a,b)=>b.skills[area]-a.skills[area]||b.value-a.value)[0];
  if(cand){BEST[k]={rep:cand.rep,hi:cand.reply,en:cand.replyEn||cand.reply};return}
  const b=builtin[k];
  BEST[k]=b?{rep:topRepFor(area),hi:b.hi,en:b.en}:{rep:topRepFor(area),hi:'',en:'Ask the top rep how they handle this.'}})})();


/* ---------- Helpers ---------- */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function inr(v){v=Math.round(v);if(v>=1e7)return '₹'+(v/1e7).toFixed(2).replace(/\.?0+$/,'')+' Cr';if(v>=1e5)return '₹'+(v/1e5).toFixed(1).replace(/\.0$/,'')+'L';if(v>=1e3)return '₹'+Math.round(v/1e3)+'K';return '₹'+v}
const pct=x=>Math.round(x*100)+'%';
const Q=(hi,en)=>hi?`<div class="hi">"${esc(hi)}"</div><div class="en">${esc(en)}</div>`:`<div class="hi">"${esc(en)}"</div>`;
function greet(){const h=new Date().getHours();return (h<12?'Good morning':h<17?'Good afternoon':'Good evening')+(ZD.owner?', '+esc(ZD.owner):'')+'.'}
const lc=s=>s.charAt(0).toLowerCase()+s.slice(1);
const fdate=dt=>dt.getDate()+' '+MON[dt.getMonth()];
function ftime(dt){let h=dt.getHours();const m=dt.getMinutes(),ap=h>=12?'pm':'am';h=h%12||12;return h+':'+String(m).padStart(2,'0')+' '+ap}
function when(c){if(c.d===0)return 'Today, '+ftime(c.at);if(c.d===1)return 'Yesterday, '+ftime(c.at);return fdate(c.at)+', '+ftime(c.at)}
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const sumv=a=>a.reduce((s,c)=>s+c.value,0);
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
function groupBy(list,f){const m={};list.forEach(c=>{const k=f(c);if(k==null)return;(m[k]=m[k]||[]).push(c)});return m}

const ICON={
 home:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
 insights:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 3 5-6"/>',
 team:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.6.2 4.4 1.8 5 4.5"/>',
 conv:'<path d="M4 12h2M8 8v8M12 5v14M16 9v6M20 11v2"/>',
 calls:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 chev:'<path d="m6 9 6 6 6-6"/>', right:'<path d="m9 6 6 6-6 6"/>', left:'<path d="m15 6-6 6 6 6"/>',
 play:'<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>', pause:'<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" stroke="none"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>', copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
 up:'<path d="m6 14 6-6 6 6"/>', down:'<path d="m6 10 6 6 6-6"/>', check:'<path d="m5 12 5 5 9-10"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',coach:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'};
const ic=(n,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
function ring(score,size=38){const r=(size-6)/2,c=2*Math.PI*r,col=score>=70?'var(--good)':score>=55?'var(--warn)':'var(--bad)',h=size/2;
 return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Score ${score} out of 100"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="var(--line)" stroke-width="3.5"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${(c*score/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${h} ${h})"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="var(--ink)" font-size="${Math.round(size*.32)}" font-weight="700" font-family="Figtree,system-ui">${score}</text></svg>`}
const scoreCol=s=>s>=70?'var(--good)':s>=55?'var(--warn)':'var(--bad)';
function outcomePill(c){return c.outcome==='sold'?'<span class="pill good">Sold</span>':c.outcome==='followup'?'<span class="pill warn">Will return</span>':'<span class="pill bad">Did not buy</span>'}
function delta(cur,prev,opt){opt=opt||{};let diff,txt;
 if(opt.pts){diff=Math.round((cur-prev)*100);txt=Math.abs(diff)+(Math.abs(diff)===1?' pt':' pts')}else{if(!prev)return '<span class="delta flat">new</span>';diff=Math.round((cur-prev)/prev*100);txt=Math.abs(diff)+'%'}
 if(diff===0)return '<span class="delta flat">no change</span>';
 const good=opt.lowerBetter?diff<0:diff>0;
 return `<span class="delta ${good?'up':'down'}">${ic(diff>0?'up':'down',14)}${txt}</span>`}

/* ---------- State ---------- */
const S={period:30,tab:'drop',showAll:{},cf:{},page:0,sort:'date',ctype:'persona',drawer:null,drawerAt:null};
const CF_KEYS=['rep','outcome','persona','product','reason','stage','comp','kw'];
try{const p=+localStorage.getItem('zocus-period');if(p===7||p===30)S.period=p}catch(e){}
const cur=()=>CONVS.filter(c=>c.d<S.period);
const prev=()=>CONVS.filter(c=>c.d>=S.period&&c.d<2*S.period);
function stats(list){const n=list.length,sold=list.filter(c=>c.outcome==='sold'),lost=list.filter(c=>c.outcome!=='sold');
 const skill={};SKILLS.forEach(s=>skill[s.id]=n?Math.round(list.reduce((a,c)=>a+c.skills[s.id],0)/n):0);
 return {n,sold:sold.length,notSold:lost.length,conv:n?sold.length/n:0,soldValue:sumv(sold),lostValue:sumv(lost.filter(c=>c.outcome==='lost')),openValue:sumv(lost.filter(c=>c.outcome==='followup')),score:n?Math.round(list.reduce((a,c)=>a+c.score,0)/n):0,skill}}
function repRows(list){const store=stats(list);
 return REPS.map(r=>{const L=list.filter(c=>c.rep===r.id),s=stats(L);
   let weak=null,gap=0;SKILLS.forEach(k=>{const g=s.skill[k.id]-store.skill[k.id];if(weak===null||g<gap){weak=k.id;gap=g}});
   const status=s.score>=store.score+6?['good','Top performer']:s.score<=store.score-6?['bad','Needs coaching']:['neutral','On track'];
   return {rep:r,s,L,weak,gap,status}}).sort((a,b)=>b.s.score-a.s.score)}

/* ---------- Shell ---------- */
const NAV=[['home','Home','home'],['insights','Insights','insights'],['team','Team','team'],['coaching','Coaching','coach'],['conversations','Conversations','conv'],['followups','Follow-ups','calls']];
function routeName(){const h=(location.hash||'#home').slice(1);if(h.startsWith('rep-')&&REP[h.slice(4)])return h;if(h.startsWith('coach-')&&REP[h.slice(6)])return h;return NAV.some(n=>n[0]===h)?h:'home'}
function renderNav(){const rt=routeName(),base=rt.startsWith('rep-')?'team':rt.startsWith('coach-')?'coaching':rt,due=followups().length;
 const item=(n,m)=>`<a href="#${n[0]}" ${n[0]===base?'aria-current="page"':''} ${n[0]==='insights'?'data-tour="nav-insights"':n[0]==='coaching'?'data-tour="nav-coaching"':''}>${m?ic(n[2],20):''}<span>${m&&n[0]==='conversations'?'Recordings':n[1]}</span>${n[0]==='followups'&&due?`<span class="dot num">${due}</span>`:''}</a>`;
 document.getElementById('nav').innerHTML=NAV.map(n=>item(n,false)).join('');
 document.getElementById('bnav').innerHTML=NAV.map(n=>item(n,true)).join('');
 document.querySelectorAll('[data-act="period"]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.v===S.period)))}
function phead(title,sub){return `<div class="phead"><h1>${title}</h1><p>${sub}</p></div>`}
const periodTxt=()=>S.period===7?'last 7 days':'last 30 days';
const AFTER=['before the need was understood','after the need was understood','after the product was shown','after the price was quoted'];
function leaks(L){return [0,1,2,3].map(k=>{const a=L.filter(c=>c.stage===k);return {k,n:a.length,v:sumv(a)}})}

/* ---------- Home: briefing, 3 numbers, 3 actions, team pulse ---------- */
function computeActions(L){
 const rows=repRows(L),store=stats(L),acts=[];
 let best=null;rows.forEach(r=>{const tied=r.L.filter(c=>c.outcome!=='sold'&&c.reason&&REASONS[c.reason].skill===r.weak);const v=sumv(tied);const sc=-r.gap*v;if(!best||sc>best.sc)best={...r,tied,v,sc}});
 if(best)acts.push({impact:best.v,title:`Coach ${best.rep.first} on ${SK[best.weak].label.toLowerCase()}`,body:`Scores ${best.s.skill[best.weak]} vs the store's ${store.skill[best.weak]}. ${plural(best.tied.length,'customer')} left at this step.`,btn:'Coach',go:'#rep-'+best.rep.id});
 const fu=followups();
 if(fu.length)acts.push({impact:sumv(fu.map(f=>f.c)),title:`Call back ${plural(fu.length,'customer')}`,body:`${fu.filter(f=>f.status==='overdue').length} overdue. Messages are drafted and ready to copy.`,btn:'Call list',go:'#followups'});
 const oos=L.filter(c=>!c.inStock),byP=groupBy(oos,c=>c.product);let top=null;Object.entries(byP).forEach(([k,v])=>{if(!top||v.length>top.v.length)top={k,v}});
 if(top)acts.push({impact:sumv(top.v),title:`Restock ${lc(PRODUCTS[top.k].label)}`,body:`${plural(top.v.length,'customer')} asked and we had none.${/lightweight/i.test(PRODUCTS[top.k].label)?' Most wanted under 10 grams.':''}`,btn:'Demand',go:'#insights',tab:'want'});
 return acts.sort((a,b)=>b.impact-a.impact).slice(0,3)}
function kpi(o){return `<button class="card kpi" ${o.filter?`data-filter='${JSON.stringify(o.filter)}'`:`data-go="${o.go}"`}><div class="row"><span class="label">${o.label}</span><span class="tag">${o.tag}</span></div><div class="val num">${o.val}</div><div class="row"><span class="sub">${o.sub}</span>${o.delta}</div></button>`}
function renderHome(){
 const L=cur(),P=prev(),s=stats(L),p=stats(P),acts=computeActions(L),rows=repRows(L);
 const big=leaks(L).reduce((a,b)=>b.v>a.v?b:a);
 const short={good:'Top',neutral:'On track',bad:'Coach'};
 return `<section class="hero" data-tour="brief">
  <span class="mono">${ic('spark',14)} AI briefing · ${esc(ZD.store)} · ${periodTxt()} ${ZD.isSample?'<span class="sample">Sample data</span>':''}</span>
  <h1>${greet()}</h1>
  <p class="lede"><b>${pct(s.conv)} of customers bought</b>, ${s.conv>=p.conv?'up':'down'} from ${pct(p.conv)}. Most sales slipped <b>${AFTER[big.k]}</b>: ${plural(big.n,'customer')}, ${inr(big.v)}. The three actions below go after the biggest part of it.</p>
 </section>
 <div class="waveband" data-wave-anchor aria-hidden="true"><span class="wavehint">Live voice waves · hover or click</span></div>
 <section class="kpis" data-tour="kpis">
  ${kpi({label:'Sale conversion',tag:'Output',val:pct(s.conv),sub:`${s.sold} of ${s.n} customers`,delta:delta(s.conv,p.conv,{pts:true}),go:'#insights'})}
  ${kpi({label:'Sales closed',tag:'Output',val:inr(s.soldValue),sub:'Tagged as sold',delta:delta(s.soldValue,p.soldValue),filter:{outcome:'sold'}})}
  ${kpi({label:'Conversations recorded',tag:'Input',val:s.n,sub:`${(s.n/S.period/REPS.length).toFixed(1)} per rep per day`,delta:delta(s.n,p.n),go:'#team'})}
 </section>
 <section class="card" data-tour="actions"><div class="card-h"><h2>Today, do these three</h2><span class="hint">Ranked by money at stake</span></div>
  <div class="acts">${acts.map((a,i)=>`<div class="act"><span class="n">${i+1}</span><div><h3>${a.title}</h3><p>${a.body}</p></div><div class="r"><span class="pill gold num">${inr(a.impact)}</span><button class="btn ${i===0?'primary':''} sm" data-go="${a.go}" ${a.tab?`data-tab="${a.tab}"`:''}>${a.btn}${ic('right',14)}</button></div></div>`).join('')}</div></section>
 <section class="card" data-tour="pulse"><div class="card-h"><h2>Team at a glance</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div>
  <div class="pulse">${rows.map(r=>`<button class="pchip" data-go="#rep-${r.rep.id}">${ring(r.s.score,54)}<b>${r.rep.first}</b><span class="pill ${r.status[0]}">${short[r.status[0]]}</span></button>`).join('')}</div>
  <p class="hint" style="margin:10px 0 0">Ring shows conversation score out of 100. Store average ${s.score}. Tap a rep to coach.</p></section>`}

/* ---------- Insights: one tab at a time, one AI line on top ---------- */
function insightData(L,P){
 const notSold=L.filter(c=>c.outcome!=='sold');
 const reasons=Object.entries(groupBy(notSold,c=>c.reason)).map(([k,v])=>{const byRep=groupBy(v,c=>c.rep);const worst=Object.entries(byRep).sort((a,b)=>b[1].length-a[1].length)[0];
   return {k,n:v.length,v:sumv(v),share:v.length/notSold.length,prevN:P.filter(c=>c.outcome!=='sold'&&c.reason===k).length,worst:worst?[worst[0],worst[1].length]:null}}).sort((a,b)=>b.v-a.v);
 const products=Object.entries(groupBy(L,c=>c.product)).map(([k,v])=>{const oos=v.filter(c=>!c.inStock);return {k,n:v.length,sold:v.filter(c=>c.outcome==='sold').length,oos:oos.length,oosV:sumv(oos)}}).sort((a,b)=>b.n-a.n);
 const overall=stats(L).conv;
 const comps=Object.entries(groupBy(L,c=>c.competitor)).map(([k,v])=>({k,n:v.length,conv:v.filter(c=>c.outcome==='sold').length/v.length,risk:sumv(v.filter(c=>c.outcome!=='sold')),prevN:P.filter(c=>c.competitor===k).length})).sort((a,b)=>b.n-a.n);
 const pers=Object.entries(groupBy(L,c=>c.persona)).map(([k,v])=>{const sold=v.filter(c=>c.outcome==='sold');const br=REPS.map(r=>{const x=v.filter(c=>c.rep===r.id);return {r,n:x.length,conv:x.length?x.filter(c=>c.outcome==='sold').length/x.length:0}}).filter(o=>o.n>=3).sort((a,b)=>b.conv-a.conv)[0];
   return {k,n:v.length,share:v.length/L.length,conv:sold.length/v.length,ticket:sold.length?sumv(sold)/sold.length:0,best:br}}).sort((a,b)=>b.n-a.n);
 const kwc={},kwp={};L.forEach(c=>c.kw.forEach(k=>kwc[k]=(kwc[k]||0)+1));P.forEach(c=>c.kw.forEach(k=>kwp[k]=(kwp[k]||0)+1));
 const kws=Object.keys(kwc).map(k=>({k,n:kwc[k],p:kwp[k]||0})).sort((a,b)=>b.n-a.n);
 return {reasons,products,overall,comps,pers,kws}}
function funnel(L){const n=L.length,lk=leaks(L),big=lk.reduce((a,b)=>b.v>a.v?b:a);let h='<div class="fun">';
 for(let k=0;k<5;k++){const cnt=L.filter(c=>c.stage>=k).length;
  h+=`<div class="fstep ${k===4?'sold':''}"><span>${STAGES[k]}</span><span class="fbar"><i style="width:${n?cnt/n*100:0}%"></i></span><b class="num" style="text-align:right">${cnt}</b></div>`;
  if(k<4){const l=lk[k];h+=`<div class="leak ${l.k===big.k?'big':''}"><button data-filter='{"stage":"${k}"}'>${ic('down',13)}${l.n} left · ${inr(l.v)}${l.k===big.k?' · biggest leak':''}</button></div>`}}
 return h+'</div>'}
function renderInsights(){
 const L=cur(),P=prev(),D=insightData(L,P);
 const tabs=[['drop','Why they did not buy'],['want','What they want'],['comp','Competition'],['types','Customer types']];
 let lead='',body='';
 if(S.tab==='drop'){const r0=D.reasons[0],big=leaks(L).reduce((a,b)=>b.v>a.v?b:a);
  lead=`Most customers leave <b>${AFTER[big.k]}</b>. The costliest reason is <b>${lc(REASONS[r0.k].label)}</b>, ${inr(r0.v)} across ${plural(r0.n,'customer')}. ${REP[BEST[r0.k].rep].first} has an answer that works.`;
  body=`<div class="card-h"><h2>Where sales leak</h2><span class="hint">Tap a red line to see those customers</span></div>${funnel(L)}
  <div class="card-h" style="margin:26px 0 4px"><h2>Reasons, by money lost</h2></div>`+
  showAll('drop',D.reasons,3,(r,i)=>{const R0=REASONS[r.k],b=BEST[r.k];return `<details class="why" ${i===0?'open':''}><summary>
   <span><span class="t">${R0.label}</span><br><span class="m num">${plural(r.n,'customer')}${r.worst?` · most with ${REP[r.worst[0]].first}`:''}</span></span>
   <span style="display:flex;align-items:center;gap:12px"><span style="text-align:right"><b class="num">${inr(r.v)}</b><br>${delta(r.n,r.prevN,{lowerBetter:true})}</span><span class="chev">${ic('chev')}</span></span></summary>
   <div class="body"><div class="quote bad">${Q(R0.hi,R0.en)}<div class="by">Customers say</div></div>
   <div class="quote">${Q(b.hi,b.en)}<div class="by">What works · ${REP[b.rep].name}</div></div>
   <div class="btnrow"><button class="btn primary sm" data-act="copy" data-text="${esc(`Team briefing: when a customer says "${R0.en}", try ${REP[b.rep].first}'s answer: "${b.en}"`)}">${ic('copy',14)}Copy for team briefing</button><button class="btn sm" data-filter='{"reason":"${r.k}"}'>See ${plural(r.n,'conversation')}</button></div></div></details>`});
 }else if(S.tab==='want'){const sp=[...D.products].sort((a,b)=>b.oosV-a.oosV)[0];
  lead=sp&&sp.oos?`<b>${PRODUCTS[sp.k].label}</b> is the stock gap: ${plural(sp.oos,'customer')} asked when we had none, ${inr(sp.oosV)} of interest. "Lightweight" is a word customers keep using.`:'No stock gaps this period.';
  const rows=S.showAll.want?D.products:D.products.slice(0,5);
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>Asked for</th><th class="r">Asked</th><th class="r">Bought</th><th class="r">Not in stock</th><th class="r">Interest lost</th></tr></thead><tbody>${rows.map(p=>`<tr class="click" data-filter='{"product":"${p.k}"}'><td><b>${PRODUCTS[p.k].label}</b> ${p.oos/p.n>.2?'<span class="pill warn">Stock gap</span>':''}</td><td class="r num">${p.n}</td><td class="r num">${pct(p.sold/p.n)}</td><td class="r num">${p.oos||'-'}</td><td class="r num">${p.oos?inr(p.oosV):'-'}</td></tr>`).join('')}</tbody></table></div>
  ${D.products.length>5?`<div style="margin-top:10px"><button class="link" data-act="showall" data-k="want">${S.showAll.want?'Show top 5':'Show all '+D.products.length}</button></div>`:''}
  <div class="card-h" style="margin:26px 0 10px"><h2>Words customers keep using</h2><span class="hint">Tap to see them</span></div>
  <div class="chips">${D.kws.slice(0,8).map(k=>`<button class="chip" data-filter='{"kw":"${esc(k.k)}"}'>${esc(k.k)} <small class="num">${k.n}</small>${k.n>k.p*1.15?`<span class="delta up">${ic('up',13)}</span>`:k.n<k.p*.85?`<span class="delta down">${ic('down',13)}</span>`:''}</button>`).join('')}</div>`;
 }else if(S.tab==='comp'){const c0=D.comps[0],b=BEST.competitor;
  lead=c0?`When customers mention <b>${COMP[c0.k].label}</b>, we close ${pct(c0.conv)} vs ${pct(D.overall)} usually. They are pushing <b>${lc(COMP[c0.k].offer)}</b>.`:'No competitor mentions this period.';
  body=`<div class="comp">${D.comps.map(c=>`<div class="ccard"><div><h3 style="font-size:16px">${COMP[c.k].label}</h3><span class="hint">${plural(c.n,'mention')}</span></div>
   <div class="stat2"><div><b class="num" style="color:${c.conv<D.overall?'var(--bad)':'var(--good)'}">${pct(c.conv)}</b><span>we close when named</span></div><div><b class="num">${inr(c.risk)}</b><span>at risk</span></div></div>
   <div><span class="mono">They offer</span><div style="font-weight:500">${COMP[c.k].offer}</div></div>
   <button class="btn sm" data-filter='{"comp":"${c.k}"}' style="align-self:flex-start">See ${plural(c.n,'conversation')}</button></div>`).join('')}</div>
   <div class="quote" style="margin-top:16px">${Q(b.hi,b.en)}<div class="by">Best counter so far · ${REP[b.rep].name}</div></div>`;
 }else{const pl=[...D.pers].sort((a,b)=>a.conv-b.conv)[0];
  lead=`<b>${PER[pl.k].label}</b> customers convert least, at ${pct(pl.conv)}.${pl.best?` ${pl.best.r.first} closes ${pct(pl.best.conv)} of them: send these walk-ins to ${pl.best.r.first}.`:''}`;
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>Came in for</th><th>Share</th><th class="r">Conversion</th><th class="r">Avg sale</th><th>Best rep</th></tr></thead><tbody>${D.pers.map(p=>`<tr class="click" data-filter='{"persona":"${p.k}"}'><td><b>${PER[p.k].label}</b></td><td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1"><i style="width:${p.share*100}%;background:var(--ink)"></i></span><span class="num">${pct(p.share)}</span></div></td><td class="r num">${pct(p.conv)}</td><td class="r num">${p.ticket?inr(p.ticket):'-'}</td><td>${p.best?`${p.best.r.first} <span class="hint num">${pct(p.best.conv)}</span>`:'-'}</td></tr>`).join('')}</tbody></table></div>`;
 }
 return phead('Insights',`What ${L.length} customers told your team in the ${periodTxt()}.`)+
 `<div class="tabs" role="tablist">${tabs.map(t=>`<button role="tab" aria-selected="${S.tab===t[0]}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
 <div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
 <section class="card" id="itabs">${body}</section>`}
function showAll(key,items,limit,fn){const all=S.showAll[key];const shown=all?items:items.slice(0,limit);
 return shown.map(fn).join('')+(items.length>limit?`<div style="margin-top:12px"><button class="link" data-act="showall" data-k="${key}">${all?'Show top '+limit:'Show all '+items.length}</button></div>`:'')}

/* ---------- Team: summary, three charts, compact expandable rows ---------- */
const ZC=window.ZCharts;
const SHORT={need:'Need',budget:'Budget',pitch:'Product',objection:'Price doubts',close:'Closing'};
function weekly(list){const out=[];for(let w=7;w>=0;w--){const a=list.filter(c=>Math.floor(c.d/7)===w);out.push({label:w===0?'This week':w+' wk ago',s:stats(a)})}return out}
const wk=(W,f)=>W.map(x=>x.s.n>=2?f(x.s):null);
const dotOf=k=>`<i class="sdot ${k}"></i>`;
function renderTeam(){const L=cur(),P=prev(),rows=repRows(L),store=stats(L),p=stats(P),W=weekly(CONVS);
 const cls=(v,st)=>v>=st+5?'g':v<=st-5?'b':'w';
 const top=rows[0],low=rows[rows.length-1],need=rows.filter(r=>r.status[0]==='bad');
 const lead=rows.length?`Store score is <b>${store.score}</b>${p.n?`, ${store.score>=p.score?'up':'down'} from ${p.score}`:''}. <b>${esc(top.rep.first)}</b> leads at ${top.s.score}.${need.length?` ${plural(need.length,'rep')} need${need.length===1?'s':''} coaching, furthest behind is <b>${esc(low.rep.first)}</b> on ${SK[low.weak].label.toLowerCase()} (${low.s.skill[low.weak]} vs ${store.skill[low.weak]}).`:''}`:'No recordings in this period.';
 const tiles=[
  ZC.tile({label:'Conversation score',value:store.score,spark:ZC.spark(wk(W,x=>x.score)),sub:delta(store.score,p.score)+' vs previous'}),
  ZC.tile({label:'Sale conversion',value:pct(store.conv),spark:ZC.spark(wk(W,x=>x.conv*100)),sub:delta(store.conv,p.conv,{pts:true})+' vs previous'}),
  ZC.tile({label:'Conversations recorded',value:store.n,spark:ZC.spark(wk(W,x=>x.n)),sub:delta(store.n,p.n)+' vs previous'}),
  ZC.tile({label:'Sales closed',value:inr(store.soldValue),spark:ZC.spark(wk(W,x=>x.soldValue)),sub:delta(store.soldValue,p.soldValue)+' vs previous'})].join('');
 const trend=ZC.lineChart({labels:W.map(x=>x.label),series:[{name:'Store score',values:wk(W,x=>x.score)}],aria:'Store conversation score by week for the last 8 weeks'});
 const sc=ZC.scatter({points:rows.filter(r=>r.s.n).map(r=>({x:r.s.score,y:Math.round(r.s.conv*100),size:r.s.n,label:r.rep.first,href:'#rep-'+r.rep.id,tip:`${r.rep.name}|Score ${r.s.score}|Conversion ${pct(r.s.conv)}|${plural(r.s.n,'conversation')}`})),xLabel:'Conversation score',yLabel:'Conversion %',ySuffix:'%',refX:store.score,refY:Math.round(store.conv*100),aria:'Each rep plotted by conversation score and conversion'});
 const grid=ZC.heatGrid({cols:SKILLS.map(k=>SHORT[k.id]),rows:rows.map(r=>({label:r.rep.first,attr:`data-go="#rep-${r.rep.id}"`,cells:SKILLS.map(k=>({text:r.s.skill[k.id],cls:cls(r.s.skill[k.id],store.skill[k.id]),tip:`${r.rep.name}|${k.label}: ${r.s.skill[k.id]}|Store ${store.skill[k.id]}`}))})).concat([{label:'Store',foot:true,cells:SKILLS.map(k=>({text:store.skill[k.id],cls:'n'}))}])});
 const hi=rows.filter(r=>r.s.score>=store.score&&r.s.conv<store.conv).sort((a,b)=>a.s.conv-b.s.conv)[0];
 return phead('Team',`${plural(REPS.length,'rep')} in the ${periodTxt()}. Tap a row to open it.`)+
 `<div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
 <div class="ktiles">${tiles}</div>
 <div class="cgrid3">
  ${ZC.ccard('Score trend','Store, 8 weeks',trend)}
  ${ZC.ccard(hi?`${esc(hi.rep.first)} scores well but closes less`:'Score vs conversion','Dot size = recordings',sc)}
  ${ZC.ccard('Skills by rep','Green above store, red below',grid)}
 </div>
 <section class="card"><div class="card-h"><h2>Reps</h2><span class="hint">Ranked by conversation score</span></div>
 <div class="xr-h trow"><span>#</span><span>Rep</span><span class="r">Score</span><span class="r">Conv.</span><span class="r">Recorded</span><span>8-week score</span><span></span></div>
 ${rows.map((r,i)=>{const RW=weekly(CONVS.filter(c=>c.rep===r.rep.id));return `<details class="xrow"><summary class="trow"><span class="num rk">${i+1}</span><span class="nm"><b>${esc(r.rep.name)}</b><span class="st">${dotOf(r.status[0])}${r.status[1]}</span></span><span class="r num"><b>${r.s.score}</b></span><span class="r num">${pct(r.s.conv)}</span><span class="r num">${r.s.n}</span><span>${ZC.spark(wk(RW,x=>x.score),{w:96,h:24})}</span>${ic('chev',16)}</summary>
  <div class="xr-b"><div class="skills5">${SKILLS.map(k=>`<div class="skill"><div class="s2"><b style="font-weight:500">${SHORT[k.id]}</b><span class="num"><b style="color:var(--ink)">${r.s.skill[k.id]}</b> / ${store.skill[k.id]}</span></div><div class="bar"><i style="width:${r.s.skill[k.id]}%;background:${scoreCol(r.s.skill[k.id])}"></i><span class="tick" style="left:${store.skill[k.id]}%"></span></div></div>`).join('')}</div>
  <div class="xr-f"><span class="hint">Weakest vs store: <b style="color:var(--ink)">${SK[r.weak].label}</b> (${r.gap>0?'+':''}${r.gap}). ${inr(r.s.soldValue)} closed from ${plural(r.s.sold,'sale')}.</span><div class="btnrow"><button class="btn primary sm" data-go="#coach-${r.rep.id}">Coaching plan${ic('right',14)}</button><button class="btn sm" data-go="#rep-${r.rep.id}">Rep page</button><button class="btn sm" data-filter='{"rep":"${r.rep.id}"}'>Conversations</button></div></div></div></details>`}).join('')}
 </section>`}

/* ---------- Rep ---------- */
function renderRep(id){
 const L=cur(),rows=repRows(L),row=rows.find(r=>r.rep.id===id),store=stats(L),rep=row.rep,s=row.s,p=stats(prev().filter(c=>c.rep===id)),weak=row.weak;
 const mine=row.L.filter(c=>c.outcome!=='sold').sort((a,b)=>a.skills[weak]-b.skills[weak])[0];
 const top=L.filter(c=>c.rep!==id&&c.outcome==='sold').sort((a,b)=>b.skills[weak]-a.skills[weak])[0];
 const tied=row.L.filter(c=>c.outcome!=='sold'&&c.reason&&REASONS[c.reason].skill===weak);
 const note=`Coaching note for ${rep.first} (${periodTxt()})\nFocus: ${SK[weak].label}\nScore on this step: ${s.skill[weak]} vs store ${store.skill[weak]}\nTip: ${COACH[weak]}${mine?`\nListen to: ${mine.customer}, ${fdate(mine.at)}`:''}`;
 return `<button class="link back" data-go="#team">${ic('left',15)}Team</button>
 <div class="rephead"><span class="av">${rep.ini}</span><div class="grow"><h1>${rep.name}</h1><p>${rep.tenure?rep.tenure+' · ':''}rank ${rows.indexOf(row)+1} of ${rows.length} · <span class="pill ${row.status[0]}">${row.status[1]}</span></p></div>
  <button class="btn primary" data-act="copy" data-text="${esc(note)}">${ic('copy',15)}Copy coaching note</button></div>
 <div class="statline"><div><b class="num">${s.score}</b><span>Score · store ${store.score} ${delta(s.score,p.score)}</span></div><div><b class="num">${pct(s.conv)}</b><span>Conversion · store ${pct(store.conv)}</span></div><div><b class="num">${s.n}</b><span>Recorded · ${(s.n/S.period).toFixed(1)} a day</span></div><div><b class="num">${inr(s.soldValue)}</b><span>Closed · ${s.sold} sales</span></div></div>
 <div class="cols">
  <section class="card focus"><span class="mono" style="color:var(--warn)">Coaching focus</span><h3>${SK[weak].label}</h3>
   <p>${rep.first} scores <b class="num">${s.skill[weak]}</b> here vs the store's <b class="num">${store.skill[weak]}</b>${tied.length?`, and ${plural(tied.length,'customer')} (${inr(sumv(tied))}) left at this step`:''}. ${COACH[weak]}</p>
   <div class="listen">${mine?`<button data-conv="${mine.id}"><span class="playic">${ic('right',12)}</span><span><b>Where ${rep.first} missed it</b><small>${esc(mine.customer)} · ${PRODUCTS[mine.product].label} · ${fdate(mine.at)}</small></span></button>`:''}
   ${top?`<button data-conv="${top.id}"><span class="playic" style="background:var(--good)">${ic('right',12)}</span><span><b>How ${REP[top.rep].first} does it</b><small>${esc(top.customer)} · ${PRODUCTS[top.product].label} · sold</small></span></button>`:''}</div></section>
  <section class="card"><div class="card-h"><h2>Skills</h2><span class="hint">Line is the store average</span></div><div class="skills">${SKILLS.map(k=>`<div class="skill"><div class="s2"><b style="font-weight:500">${k.label}</b><span class="num"><b style="color:var(--ink)">${s.skill[k.id]}</b> / ${store.skill[k.id]}</span></div><div class="bar"><i style="width:${s.skill[k.id]}%;background:${scoreCol(s.skill[k.id])}"></i><span class="tick" style="left:${store.skill[k.id]}%"></span></div></div>`).join('')}</div></section>
 </div>
 <button class="link" data-filter='{"rep":"${id}"}' style="align-self:flex-start">All ${s.n} of ${rep.first}'s conversations${ic('right',14)}</button>`}
/* ---------- Conversations ---------- */
function convRow(c){const p=PRODUCTS[c.product];
 return `<button class="crow dense" data-conv="${c.id}">${ring(c.score,30)}<strong>${esc(c.customer)}</strong><small>${esc(p.label)} · ${esc(PER[c.persona].label)}</small><span class="c-rep">${esc(REP[c.rep].name)}</span><span class="c-val num">${inr(c.value)}</span><span>${outcomePill(c)}</span><span class="d num">${when(c)}</span></button>`}
function cfLabel(k,v){return {rep:()=>'Rep: '+REP[v].first,outcome:()=>'Result: '+({sold:'Sold',followup:'Will return',lost:'Did not buy'}[v]),persona:()=>PER[v].label,product:()=>PRODUCTS[v].label,reason:()=>REASONS[v].label,stage:()=>'Left after: '+STAGES[v],comp:()=>'Mentioned '+COMP[v].label,kw:()=>'Said "'+v+'"'}[k]()}
function filtered(){const f=S.cf,q=(f.q||'').toLowerCase().trim();
 return cur().filter(c=>(!f.rep||c.rep===f.rep)&&(!f.outcome||c.outcome===f.outcome)&&(!f.persona||c.persona===f.persona)&&(!f.product||c.product===f.product)&&(!f.reason||c.reason===f.reason)&&(f.stage===undefined||f.stage===''||(c.stage===+f.stage&&c.outcome!=='sold'))&&(!f.comp||c.competitor===f.comp)&&(!f.kw||c.kw.includes(f.kw))&&
  (!q||c.customer.toLowerCase().includes(q)||REP[c.rep].name.toLowerCase().includes(q)||PRODUCTS[c.product].label.toLowerCase().includes(q)||(c.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))))}
const PAGE=50;
function sortConvs(list){const k=S.sort;return k==='value'?[...list].sort((a,b)=>b.value-a.value):k==='score'?[...list].sort((a,b)=>a.score-b.score):k==='scorehi'?[...list].sort((a,b)=>b.score-a.score):list}
function convAnalytics(list){
 const n=list.length,by=o=>list.filter(c=>c.outcome===o),so=by('sold'),fu=by('followup'),lo=by('lost'),af=o=>`data-addf='${JSON.stringify(o)}'`;
 const split=ZC.splitBar([{name:'Sold',n:so.length,color:ZC.OUTCOME.sold,sub:inr(sumv(so)),attr:af({outcome:'sold'})},{name:'Will return',n:fu.length,color:ZC.OUTCOME.followup,sub:inr(sumv(fu)),attr:af({outcome:'followup'})},{name:'Did not buy',n:lo.length,color:ZC.OUTCOME.lost,sub:inr(sumv(lo)),attr:af({outcome:'lost'})}]);
 const days=[];for(let d=S.period-1;d>=0;d--){const a=list.filter(c=>c.d===d),dt=new Date(TODAY.getTime()-d*DAY),v={sold:0,followup:0,lost:0};a.forEach(c=>v[c.outcome]++);
  days.push({label:fdate(dt),vals:v,tip:`${fdate(dt)}|${plural(a.length,'conversation')}|${v.sold} sold · ${v.followup} will return · ${v.lost} did not buy`})}
 const time=ZC.columns({data:days,h:128,every:S.period===7?1:6,groups:[{key:'sold',name:'Sold',color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:'Did not buy',color:ZC.OUTCOME.lost}],aria:'Conversations per day, split by result'});
 const T=S.ctype,src=T==='reason'?list.filter(c=>c.outcome!=='sold'):list;
 const key={persona:c=>c.persona,product:c=>c.product,reason:c=>c.reason,rep:c=>c.rep}[T],lab={persona:k=>PER[k].label,product:k=>PRODUCTS[k].label,reason:k=>REASONS[k].label,rep:k=>REP[k].name}[T];
 const items=Object.entries(groupBy(src,key)).map(([k,v])=>{const sold=v.filter(c=>c.outcome==='sold').length;
  return {label:lab(k),value:v.length,text:T==='reason'?`${v.length} · ${inr(sumv(v))}`:`${v.length} · ${pct(sold/v.length)}`,attr:af({[T]:k}),tip:T==='reason'?`${lab(k)}|${plural(v.length,'customer')} left|${inr(sumv(v))} not closed`:`${lab(k)}|${plural(v.length,'conversation')}|${pct(sold/v.length)} bought`}}).sort((a,b)=>b.value-a.value).slice(0,6);
 const types=[['persona','Customer type'],['product','Product'],['reason','Reason'],['rep','Rep']];
 const bins=[[0,39],[40,49],[50,59],[60,69],[70,79],[80,89],[90,100]].map(([a,b])=>{const m=list.filter(c=>c.score>=a&&c.score<=b).length;return {label:a===0?'<40':a+'s',vals:{n:m},tip:`Score ${a} to ${b}|${plural(m,'conversation')}`}});
 const sc=list.map(c=>c.score).sort((a,b)=>a-b),med=sc.length?sc[Math.floor(sc.length/2)]:0,low=list.filter(c=>c.score<55).length;
 const hist=ZC.columns({data:bins,h:150,w:260,every:1,groups:[{key:'n',name:'Conversations'}],aria:'Number of conversations by score band'});
 return `<div class="agrid">
  ${ZC.ccard(n?`${pct(so.length/n)} bought, ${inr(sumv(lo))} walked out`:'Results','Tap a result to filter',split+`<div style="margin-top:14px">${time}</div>`,'a5')}
  ${ZC.ccard(T==='reason'?'Why they did not buy':'Who came in and who bought',T==='reason'?'Customers · value not closed':'Conversations · % bought',`<div class="seg mini" role="group" aria-label="Break down by">${types.map(t=>`<button data-act="ctype" data-v="${t[0]}" aria-pressed="${T===t[0]}">${t[1]}</button>`).join('')}</div>${ZC.barList(items)}`,'a4')}
  ${ZC.ccard(n?`Median score ${med}`:'Scores',n?`${plural(low,'conversation')} under 55`:'',hist,'a3')}
 </div>`}
function renderConversations(){const list=sortConvs(filtered()),tot=cur().length;
 const active=['persona','product','reason','stage','comp','kw'].filter(k=>S.cf[k]!==undefined&&S.cf[k]!=='');
 const sel=(k,opts,ph)=>`<select id="f-${k}" data-cf="${k}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(o=>`<option value="${o[0]}" ${S.cf[k]===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
 const pages=Math.max(1,Math.ceil(list.length/PAGE));S.page=clamp(S.page,0,pages-1);const from=S.page*PAGE,shown=list.slice(from,from+PAGE);
 return phead('Conversations',`${list.length} of ${tot} conversations in the ${periodTxt()}. Charts and list follow the same filters.`)+
 `<details class="xband" data-xk="conv-analytics" ${ZC.isOpen('conv-analytics',true)?'open':''}><summary><span class="mono">Analytics</span><span class="x-s">${list.length?`${pct(list.filter(c=>c.outcome==='sold').length/list.length)} bought · ${inr(sumv(list))} discussed`:''}</span>${ic('chev',16)}</summary>${convAnalytics(list)}</details>
 <section class="card clistc"><div class="filters stick"><input id="f-q" data-cf="q" type="search" placeholder="Customer, phone, rep or product" value="${esc(S.cf.q||'')}">${sel('rep',REPS.map(r=>[r.id,r.name]),'All reps')}${sel('outcome',[['sold','Sold'],['followup','Will return'],['lost','Did not buy']],'All results')}<select data-sort aria-label="Sort by">${[['date','Newest first'],['value','Highest value'],['score','Lowest score'],['scorehi','Highest score']].map(o=>`<option value="${o[0]}" ${S.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
 ${active.length?`<div class="activechips" style="margin-top:12px">${active.map(k=>`<button class="achip" data-act="unfilter" data-k="${k}">${esc(cfLabel(k,S.cf[k]))}${ic('x',14)}</button>`).join('')}<button class="link" data-act="clearf">Clear all</button></div>`:''}
 <div class="clist" style="margin-top:8px">${list.length?shown.map(c=>convRow(c)).join(''):`<div style="padding:32px 8px;text-align:center"><b>No conversations match these filters</b><p class="hint">Try the 30-day range or remove a filter.</p><button class="btn sm" data-act="clearf">Clear filters</button></div>`}</div>
 ${list.length>PAGE?`<div class="pager"><span class="hint num">${from+1} to ${Math.min(from+PAGE,list.length)} of ${list.length}</span><div class="btnrow"><button class="btn sm" data-act="page" data-v="-1" ${S.page===0?'disabled':''}>${ic('left',14)}Previous</button><button class="btn sm" data-act="page" data-v="1" ${S.page>=pages-1?'disabled':''}>Next${ic('right',14)}</button></div></div>`:''}</section>`}

/* ---------- Drawer ---------- */
function summaryFor(c){const b=summaryBase(c),s=c.sum||{};return {wanted:s.wanted||b.wanted,happened:s.happened||b.happened,why:s.why||b.why,next:s.next||b.next}}
function summaryBase(c){const rep=REP[c.rep],prod=PRODUCTS[c.product],R0=c.reason&&REASONS[c.reason];
 const due=c.due;
 return {wanted:`${PER[c.persona].label}. Looking at ${lc(prod.label)}, around ${inr(c.value)}.`,
  happened:c.outcome==='sold'?`${rep.first} showed ${lc(prod.label)} options and closed the sale.`:c.reason==='stock'?'The customer wanted a lighter piece and we did not have one in stock.':`Got as far as "${STAGES[c.stage].toLowerCase()}". The customer left: ${R0.label.toLowerCase()}.`,
  why:c.outcome==='sold'?soldWhy(c):R0.skill?`Weak step: ${SK[R0.skill].label.toLowerCase()} (scored ${c.skills[R0.skill]}).`:(c.reason==='stock'?'Stock gap, not a rep issue.':'Not tied to a specific rep skill.'),
  next:c.outcome==='sold'?'No action needed. Invite them for the next occasion.':c.outcome==='followup'?`Call back by ${fdate(due)}.${c.phone?'':' No phone saved.'}`:(c.phone?'Share new designs on WhatsApp in 2 weeks.':'No phone saved. Remind the team to save numbers.')}}
function soldWhy(c){const good=[],miss=[];[['need','asked the occasion'],['budget','asked the budget'],['close','agreed a next step']].forEach(([k,t])=>(c.skills[k]>=60?good:miss).push(t));
 return good.length===3?'Asked the occasion and budget early, and agreed a next step.':good.length?`${REP[c.rep].first} ${good.join(' and ')}. Missed: ${miss.join(', ')}.`:`The customer came in decided. The occasion and budget were never asked, so this is a lucky sale, not a repeatable one.`}
function momentsFor(c){const rep=REP[c.rep],T=c.dur*60,m=[];
 m.push(c.skills.need>=60?{t:T*.05,k:'good',label:'Asked the occasion',hi:'Kiske liye dekh rahe hain? Koi occasion hai?',en:'Who is it for? Is there an occasion?',by:rep.first}:{t:T*.05,k:'miss',label:'Occasion never asked',note:'Went straight to showing pieces.'});
 m.push(c.skills.budget>=60?{t:T*.16,k:'good',label:'Asked the budget',hi:'Aap kitne tak dekh rahe ho?',en:'What range are you looking at?',by:rep.first}:{t:T*.2,k:'miss',label:'Budget not asked',note:'Prices were shown before knowing the budget.'});
 if(c.competitor){const cp=COMP[c.competitor];m.push({t:T*.44,k:'key',label:'Mentioned '+cp.label,hi:cp.hi,en:cp.offer+' at '+cp.label+'.',note:(cp.offer?cp.offer+' at ':'')+cp.label+'.',by:'Customer'})}
 m.push(c.outcome==='sold'?{t:T*.82,k:'good',label:'Customer said yes',hi:'Theek hai, yeh pack kar dijiye.',en:'Okay, please pack this one.',by:'Customer'}:{t:T*.6,k:'key',label:REASONS[c.reason].label,hi:c.cq||REASONS[c.reason].hi,en:c.cqEn||REASONS[c.reason].en,note:'The customer left at this point.',by:'Customer'});
 m.push(c.skills.close>=60?{t:T*.92,k:'good',label:'Agreed a next step',hi:'Hum yeh piece aapke liye hold kar dete hain, number de dijiye.',en:'We will hold this piece for you, please share your number.',by:rep.first}:{t:T*.93,k:'miss',label:'No next step agreed',note:'Customer left without a follow-up plan.'});
 if(c.outcome==='sold'&&c.objection&&c.objAt!=null&&REASONS[c.objection]){
  m.push({t:c.objAt,k:'key',label:REASONS[c.objection].label,hi:c.objQuote,en:c.objQuoteEn||c.objQuote||REASONS[c.objection].label,note:'The customer raised this.',by:'Customer'});
  if(c.reply)m.push({t:c.objAt+25,k:'good',label:'Answered the objection',hi:c.reply,en:c.replyEn||c.reply,by:rep.first})}
 return m.map(x=>({...x,t:Math.round(clamp(x.t,0,T))})).sort((a,b)=>a.t-b.t)}
function openDrawer(id,at){S.drawer=+id;S.drawerAt=(at!=null&&!isNaN(at))?+at:null;drawDrawer()}
function closeDrawer(){S.drawer=null;document.getElementById('drawerRoot').innerHTML=''}
function drawDrawer(){const c=CONV[S.drawer];if(!c)return;const rep=REP[c.rep],sm=summaryFor(c),ms=momentsFor(c),T=c.dur*60;
 const hl=S.drawerAt!=null&&ms.length?ms.reduce((a,m)=>Math.abs(m.t-S.drawerAt)<Math.abs(a.t-S.drawerAt)?m:a):null;
 document.getElementById('drawerRoot').innerHTML=`<div class="drawer-scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Conversation with ${esc(c.customer)}">
 <div class="dhead">${ring(c.score,46)}<div style="flex:1;min-width:0"><h2>${esc(c.customer)} ${outcomePill(c)}</h2><p>${rep.name} · ${when(c)} · ${c.dur} min${c.phone?' · '+c.phone:''}</p></div><button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
 <div class="dbody">
  <section class="card"><span class="eyebrow">In 30 seconds</span><dl class="sumgrid" style="margin:10px 0 0"><dt>Wanted</dt><dd>${esc(sm.wanted)}</dd><dt>What happened</dt><dd>${esc(sm.happened)}</dd><dt>${c.outcome==='sold'?'Why it worked':'Why not closed'}</dt><dd>${esc(sm.why)}</dd><dt>Next step</dt><dd><b>${esc(sm.next)}</b></dd></dl></section>
  <div class="card player"><span class="eyebrow">Timeline · ${mmss(T)}</span>
   <div class="track tl"><span class="base"></span>${ms.map((m,i)=>`<button class="mk ${m.k} ${m===hl?'on':''}" style="left:${m.t/T*100}%" data-act="moment" data-i="${i}" title="${esc(mmss(m.t)+' '+m.label)}" aria-label="Go to ${esc(m.label)}"></button>`).join('')}</div>
   <span class="pnote">Green: done well. Red: missed. Gold: key customer moment. This dashboard shows the transcript moments, not the audio.</span>
   ${c.url?`<a class="btn sm" href="${esc(c.url)}" target="_blank" rel="noopener" style="align-self:flex-start">Open recording in Zocus${ic('right',14)}</a>`:''}</div>
  <section class="card"><span class="eyebrow">Key moments</span><div style="margin-top:6px">${ms.map((m,i)=>`<div class="moment ${m===hl?'hl':''}" id="mo-${i}"><span class="tbtn num">${mmss(m.t)}</span><span class="lbl">${esc(m.label)} <span class="pill ${m.by==='Customer'?'gold':m.k==='good'?'good':'bad'}">${m.by==='Customer'?'Customer':m.k==='good'?'Done well':'Missed'}</span></span>${m.hi?`<div class="quote ${m.k==='key'?'key':m.k==='miss'?'bad':''}"><div class="hi">"${esc(m.hi)}"</div><div class="en">${esc(m.en)}</div><div class="by">${esc(m.by)}</div></div>`:`<div class="note">${esc(m.note||m.en||'')}</div>`}</div>`).join('')}</div></section>
  <button class="btn" data-go="#rep-${rep.id}" style="align-self:flex-start">Open ${rep.first}'s coaching view${ic('right',14)}</button>
 </div></aside>`;
 const cl=document.querySelector('.drawer [data-act="close"].iconbtn');if(cl)cl.focus();
 if(hl){const el=document.getElementById('mo-'+ms.indexOf(hl));if(el)el.scrollIntoView({block:'center'})}}
function gotoMoment(i){document.querySelectorAll('.moment.hl').forEach(e=>e.classList.remove('hl'));document.querySelectorAll('.tl .mk.on').forEach(e=>e.classList.remove('on'));
 const el=document.getElementById('mo-'+i);if(el){el.classList.add('hl');el.scrollIntoView({block:'center',behavior:'smooth'})}const mk=document.querySelector('.tl .mk[data-i="'+i+'"]');if(mk)mk.classList.add('on')}

/* ---------- Follow-ups ---------- */
const DONE=new Set(CONVS.filter(c=>c.fuDone).map(c=>c.id));
function followups(){const start=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()).getTime();
 return CONVS.filter(c=>c.outcome==='followup'&&c.d<=4&&!DONE.has(c.id)).map(c=>{const due=c.due;const dd=new Date(due.getFullYear(),due.getMonth(),due.getDate()).getTime();
  return {c,due,status:dd<start?'overdue':dd===start?'today':'later'}}).sort((a,b)=>({overdue:0,today:1,later:2}[a.status]-{overdue:0,today:1,later:2}[b.status])||b.c.value-a.c.value)}
function draftFor(c){const name=c.customer.split(' ')[0];return `Hi ${name}, this is ${REP[c.rep].first} from ${ZD.store}. The ${lc(PRODUCTS[c.product].label)} you liked is on hold for you. Would you like to visit this week? I can also send photos on WhatsApp.`}
function renderFollowups(){const all=followups();const grp={overdue:[],today:[],later:[]};all.forEach(f=>grp[f.status].push(f));
 const sect=(k,title,cls)=>grp[k].length?`<div class="section-t"><h2>${title}</h2><span class="pill ${cls} num">${grp[k].length} · ${inr(sumv(grp[k].map(f=>f.c)))}</span></div><section class="card">${grp[k].map(f=>{const c=f.c;return `<div class="fu"><div><h3>${esc(c.customer)} <span class="pill gold num">${inr(c.value)}</span></h3><div class="meta"><span>${PRODUCTS[c.product].label} · ${REASONS[c.reason].label.toLowerCase()}</span><span>Rep: ${REP[c.rep].name} · visited ${fdate(c.at)}</span><span>${c.phone?`Phone: <span class="phone">${c.phone}</span>`:'<span style="color:var(--bad)">No phone saved</span>'}</span></div><button class="link" style="margin-top:6px" data-conv="${c.id}">See the conversation${ic('right',14)}</button></div>
  <div><div class="draft">${esc(draftFor(c))}</div><div class="btnrow"><button class="btn primary sm" data-act="copy" data-text="${esc(draftFor(c))}">${ic('copy',14)}Copy message</button><button class="btn sm" data-act="done" data-id="${c.id}">${ic('check',14)}Mark called</button></div></div></div>`}).join('')}</section>`:'';
 return phead('Follow-ups',`Customers who said they would come back, from the last 5 days. Zocus drafts the message; your team sends it.`)+
 (all.length?sect('overdue','Overdue','bad')+sect('today','Due today','warn')+sect('later','Coming up','neutral'):`<section class="card" style="text-align:center;padding:40px"><b>All caught up</b><p class="hint">New follow-ups appear when a customer says they will return.</p></section>`)}

/* ---------- Search palette ---------- */
function searchItems(q){q=q.toLowerCase().trim();if(!q)return [];const out=[];
 REPS.filter(r=>r.name.toLowerCase().includes(q)).slice(0,4).forEach(r=>out.push({g:'Reps',label:r.name,sub:'Coaching view',go:'#rep-'+r.id}));
 REPS.filter(r=>r.name.toLowerCase().includes(q)||'coaching'.includes(q)).slice(0,4).forEach(r=>out.push({g:'Coaching',label:r.name+' coaching plan',sub:'Plan',go:'#coach-'+r.id}));
 CONVS.filter(c=>c.customer.toLowerCase().includes(q)||(c.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))).slice(0,5).forEach(c=>out.push({g:'Customers',label:c.customer,sub:PRODUCTS[c.product].label+' · '+fdate(c.at),conv:c.id}));
 Object.entries(PRODUCTS).filter(([k,p])=>p.label.toLowerCase().includes(q)).slice(0,3).forEach(([k,p])=>out.push({g:'Products',label:p.label,sub:'Conversations',filter:{product:k}}));
 Object.entries(REASONS).filter(([k,r])=>r.label.toLowerCase().includes(q)).slice(0,3).forEach(([k,r])=>out.push({g:'Reasons',label:r.label,sub:'Conversations',filter:{reason:k}}));
 COMPS.filter(c=>c.label.toLowerCase().includes(q)).forEach(c=>out.push({g:'Competitors',label:c.label,sub:'Conversations',filter:{comp:c.id}}));
 return out}
let sIdx=0,sItems=[];
function openPal(){document.getElementById('palRoot').innerHTML=`<div class="pal-scrim" data-act="palclose"></div><div class="pal" role="dialog" aria-label="Search"><input id="q" type="search" autocomplete="off" placeholder="Search a rep, customer, phone, product or reason" aria-label="Search"><div class="res" id="results"></div><div class="foot">Arrow keys to move · Enter to open · Esc to close</div></div>`;sIdx=0;drawResults();document.getElementById('q').focus()}
function closePal(){document.getElementById('palRoot').innerHTML=''}
function drawResults(){const qi=document.getElementById('q');if(!qi)return;const q=qi.value,box=document.getElementById('results');sItems=searchItems(q);
 if(!q.trim()){box.innerHTML=`<h4>Try</h4>${[REPS[REPS.length-1].first,(Object.values(PRODUCTS)[0]||{label:''}).label.split(' ').pop(),'making charges',(COMPS[0]||{label:''}).label].filter(Boolean).map(t=>esc(t)).map(t=>`<button data-act="suggest" data-v="${t}"><span>${t}</span></button>`).join('')}`;return}
 if(!sItems.length){box.innerHTML=`<div class="empty">Nothing found for "${esc(q)}". Try a rep name, a customer, "bangles" or "making".</div>`;return}
 let g='',h='';sItems.forEach((it,i)=>{if(it.g!==g){g=it.g;h+=`<h4>${g}</h4>`}h+=`<button class="${i===sIdx?'on':''}" data-si="${i}"><span>${esc(it.label)}</span><small>${esc(it.sub)}</small></button>`});box.innerHTML=h}
function chooseResult(i){const it=sItems[i];if(!it)return;closePal();
 if(it.go)location.hash=it.go;else if(it.conv)openDrawer(it.conv);else if(it.filter)applyFilter(it.filter)}

/* ---------- Tour ---------- */
const TOUR=[
 {sel:null,title:'Welcome'+(ZD.owner?', '+ZD.owner:''),body:'This is your store briefing. It takes a minute to learn. Follow the glowing spots, like a game tutorial. Tip: move your cursor over the waves, or click to change their colour.'},
 {sel:'[data-tour="period"]',title:'Pick your time range',body:'Every number on every page follows this switch.'},
 {sel:'[data-tour="brief"]',title:'Read this first',body:'Your AI briefing: how the store did, and where sales slipped, in two sentences.'},
 {sel:'[data-tour="kpis"]',title:'Three numbers',body:'Output: did we sell? Input: did the team record? The arrow compares with the previous period. Tap one to dig in.'},
 {sel:'[data-tour="actions"]',title:'Your to-do for today',body:'Three actions, ranked by the money at stake. One tap takes you to the fix.'},
 {sel:'[data-tour="pulse"]',title:'Your team at a glance',body:'Each ring is a rep\'s conversation score. Tap a rep to see what to coach and see examples.'},
 {sel:'[data-tour="search"]',title:'Find anything',body:'A rep, a customer, a phone number, a product or a reason. Press / anytime.'},
 {sel:'[data-tour="nav-insights"]',title:'Go deeper',body:'Insights shows why customers did not buy, what they want, what competitors offer, and who your customers are.'},
 {sel:'[data-tour="nav-coaching"]',title:'A coaching plan per rep',body:'Built from where each rep scores low and how your best reps answer the same customers. Includes practice drills from real recordings.'},
 {sel:'[data-tour="help"]',title:'Replay anytime',body:'Tap here to run this tour again. You are all set.'}];
let tourI=-1;
function visibleEl(sel){return [...document.querySelectorAll(sel)].find(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden')}
function startTour(){closeDrawer();closePal();if(routeName()!=='home')location.hash='home';else render();tourI=0;setTimeout(showStep,120)}
function endTour(){tourI=-1;document.getElementById('tourRoot').innerHTML='';try{localStorage.setItem('zocus-tour-v3','1')}catch(e){}}
function showStep(){const st=TOUR[tourI],el=st.sel?visibleEl(st.sel):null;
 if(el){const r=el.getBoundingClientRect();if(r.top<80||r.bottom>innerHeight-20)el.scrollIntoView({block:'center'})}
 requestAnimationFrame(()=>placeStep(el,st))}
function placeStep(el,st){const root=document.getElementById('tourRoot'),last=tourI===TOUR.length-1;
 const card=`<div class="tour-card" role="dialog" aria-label="Guided tour" id="tcard"><span class="mono" style="color:var(--glow)">Step ${tourI+1} of ${TOUR.length}</span><h3>${st.title}</h3><p>${st.body}</p>
  <div class="dots">${TOUR.map((_,i)=>`<i class="${i===tourI?'on':''}"></i>`).join('')}</div>
  <div class="tf"><button class="skip" data-act="tskip">${last?'':'Skip tour'}</button><div class="btnrow">${tourI>0?`<button class="btn sm" data-act="tback">Back</button>`:''}<button class="btn primary sm" data-act="tnext">${last?'Done':tourI===0?'Show me':'Next'}</button></div></div></div>`;
 if(!el){root.innerHTML=`<div class="tour-full" data-act="tblock"></div>${card}`;const c=document.getElementById('tcard');c.style.left=(innerWidth-c.offsetWidth)/2+'px';c.style.top=Math.max(20,(innerHeight-c.offsetHeight)/2)+'px';c.querySelector('[data-act="tnext"]').focus({preventScroll:true});return}
 const r=el.getBoundingClientRect(),pad=6;
 root.innerHTML=`<div class="tour-block" data-act="tblock"></div><div class="tour-spot" style="left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px"></div>${card}`;
 const c=document.getElementById('tcard'),cw=c.offsetWidth,ch=c.offsetHeight;
 let top=r.bottom+16;if(top+ch>innerHeight-12)top=r.top-ch-16;if(top<12)top=Math.min(innerHeight-ch-12,Math.max(12,r.top+16));
 c.style.left=clamp(r.left+r.width/2-cw/2,12,innerWidth-cw-12)+'px';c.style.top=top+'px';c.querySelector('[data-act="tnext"]').focus({preventScroll:true})}

/* ---------- Voice waves: react to the cursor, change on every click ---------- */
const Waves=(function(){
 const cv=document.getElementById('waves'),ctx=cv.getContext('2d');let W=0,H=0;
 const PAL=[['#E8763A','#D9475B','#7B61FF'],['#22B8CF','#2E9E6B','#E6B33A'],['#FF6FA8','#7B61FF','#3BA7F0'],['#C6871E','#E8763A','#4F7A5B'],['#5B5BD6','#22B8CF','#F07A4A']];
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 let pi=0,col=PAL[0].map(hex),mx=-1e4,my=0,tmx=-1e4,tmy=0,near=0,tNear=0,energy=0,t=0,ripples=[],raf=0;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const baseY=()=>W<860?H-118:H-56;let lastBase=0;
 function size(){const d=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(d,0,0,d,0,0);if(reduce)draw()}
 function draw(){
  const target=PAL[pi].map(hex);col=col.map((c,i)=>c.map((v,j)=>v+(target[i][j]-v)*.06));
  mx+=(tmx-mx)*.09;my+=(tmy-my)*.09;near+=(tNear-near)*.06;energy*=.965;t+=.011*(1+energy*.9);
  ctx.clearRect(0,0,W,H);const an=document.querySelector('[data-wave-anchor]');let base,A;if(an){const r=an.getBoundingClientRect();base=r.top+r.height/2;A=Math.min(r.height*.42,58)}else{base=baseY();A=Math.min(H*.045,36)}lastBase=base;
  ctx.globalCompositeOperation='multiply';
  for(let w=0;w<6;w++){const k=w/6,c=col[w%3].map(Math.round).join(',');
   ctx.beginPath();
   for(let x=0;x<=W;x+=5){
    const env=Math.pow(Math.sin(Math.PI*x/W),1.3),g=Math.exp(-Math.pow((x-mx)/230,2));
    const amp=A*(.45+.55*Math.sin(t*.8+w*1.7))*env*(1+g*near*.6+energy*.5);
    const y=base+Math.sin(x*.0055*(1+k*.7)+t*(1.1+k*.9)+w*1.3)*amp+Math.sin(x*.014+t*2.1+w)*amp*.22+g*near*(my-base)*.04;
    x?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   ctx.strokeStyle=`rgba(${c},${.27-k*.025})`;ctx.lineWidth=2.4-k*.25;ctx.stroke();
   ctx.lineTo(W,base);ctx.lineTo(0,base);ctx.closePath();ctx.fillStyle=`rgba(${c},.025)`;ctx.fill()}
  ctx.globalCompositeOperation='source-over';
  ripples=ripples.filter(r=>r.a>0.01);ripples.forEach(r=>{r.r+=5+energy*2;r.a*=.955;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.strokeStyle=`rgba(${r.c},${r.a*.22})`;ctx.lineWidth=1.5;ctx.stroke()});
 }
 function loop(){draw();raf=requestAnimationFrame(loop)}
 addEventListener('resize',size);size();
 addEventListener('pointermove',e=>{tmx=e.clientX;tmy=e.clientY;const base=lastBase;tNear=Math.max(0,1-Math.abs(e.clientY-base)/(H*.38));if(reduce)draw()},{passive:true});
 document.addEventListener('pointerleave',()=>{tNear=0});
 addEventListener('pointerdown',e=>{pi=(pi+1)%PAL.length;energy=Math.min(energy+.5,1.2);ripples.push({x:e.clientX,y:e.clientY,r:6,a:1,c:hex(PAL[pi][0]).join(',')});if(reduce){col=PAL[pi].map(hex);draw()}},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(reduce)return;if(document.hidden)cancelAnimationFrame(raf);else loop()});
 if(reduce)draw();else loop();
 return {}})();

const C=ZocusCoach({S,REPS,REP,SKILLS,SK,REASONS,COACH,CONVS,BEST,ZD,esc,ic,ring,inr,pct,plural,fdate,sumv,cur,prev,stats,repRows,periodTxt,phead,render:()=>render(),toast,Q,scoreCol,groupBy});
/* ---------- Render & events ---------- */
function render(){const rt=routeName();renderNav();const pg=document.getElementById('page');
 pg.innerHTML=rt==='home'?renderHome():rt==='insights'?renderInsights():rt==='team'?renderTeam():rt==='conversations'?renderConversations():rt==='followups'?renderFollowups():rt==='coaching'?C.renderHub():rt.startsWith('coach-')?C.renderPlan(rt.slice(6)):renderRep(rt.slice(4))}
function applyFilter(f){S.cf={...f};S.page=0;closeDrawer();if(routeName()!=='conversations')location.hash='conversations';else{render();scrollTo(0,0)}}
function toast(t){const r=document.getElementById('toastRoot');r.innerHTML=`<div class="toast" role="status">${t}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>r.innerHTML='',1800)}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied')}catch(e){toast('Copy is blocked here. Select the text instead.')}}
window.addEventListener('hashchange',()=>{closeDrawer();render();scrollTo(0,0)});
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act],[data-go],[data-conv],[data-filter],[data-addf],[data-si]');if(!t)return;
 if(t.dataset.addf){S.cf={...S.cf,...JSON.parse(t.dataset.addf)};S.page=0;render();return}
 if(t.dataset.si!==undefined){chooseResult(+t.dataset.si);return}
 if(t.dataset.filter){applyFilter(JSON.parse(t.dataset.filter));return}
 if(t.dataset.conv){openDrawer(t.dataset.conv,t.dataset.at!==undefined?+t.dataset.at:undefined);return}
 if(t.dataset.go){if(t.dataset.tab)S.tab=t.dataset.tab;closeDrawer();if(routeName()===t.dataset.go.slice(1))render();else location.hash=t.dataset.go;return}
 const a=t.dataset.act;
 if(a==='period'){S.period=+t.dataset.v;try{localStorage.setItem('zocus-period',S.period)}catch(e){}render()}
 else if(a==='tab'){S.tab=t.dataset.v;render()}
 else if(a==='showall'){S.showAll[t.dataset.k]=!S.showAll[t.dataset.k];render()}
 else if(a==='unfilter'){delete S.cf[t.dataset.k];render()}
 else if(a==='clearf'){S.cf={};render()}
 else if(a==='page'){S.page+=+t.dataset.v;render();const el=document.querySelector('.clistc');if(el)el.scrollIntoView({block:'start'})}
 else if(a==='ctype'){S.ctype=t.dataset.v;render()}
 else if(a==='xall'){ZC.setAll(t.dataset.v==='1')}
 else if(a==='copy'){copy(t.dataset.text)}
 else if(a==='done'){DONE.add(+t.dataset.id);render();toast('Marked as called')}
 else if(a==='close'){closeDrawer()}
 else if(a==='moment'){gotoMoment(+t.dataset.i)}
 else if(a==='palopen'){openPal()}
 else if(a==='palclose'){closePal()}
 else if(a==='suggest'){const q=document.getElementById('q');q.value=t.dataset.v;sIdx=0;drawResults();q.focus()}
 else if(a==='tour'){startTour()}
 else if(a&&a.indexOf('coach')===0){C.act(a,t)}
 else if(a==='tnext'){if(tourI>=TOUR.length-1)endTour();else{tourI++;showStep()}}
 else if(a==='tback'){tourI=Math.max(0,tourI-1);showStep()}
 else if(a==='tskip'){endTour()}
});
document.addEventListener('change',e=>{if(e.target.dataset.sort!==undefined){S.sort=e.target.value;S.page=0;render();return}const k=e.target.dataset.cf;if(k&&k!=='q'){S.cf[k]=e.target.value;if(!e.target.value)delete S.cf[k];S.page=0;render()}});
document.addEventListener('input',e=>{if(e.target.id==='q'){sIdx=0;drawResults()}else if(e.target.dataset.cf==='q'){S.cf.q=e.target.value;S.page=0;const pos=e.target.selectionStart;render();const i=document.getElementById('f-q');if(i){i.focus();i.setSelectionRange(pos,pos)}}});
document.addEventListener('keydown',e=>{
 if(tourI>=0){if(e.key==='Escape')endTour();else if(e.key==='ArrowRight'){e.preventDefault();if(tourI>=TOUR.length-1)endTour();else{tourI++;showStep()}}else if(e.key==='ArrowLeft'&&tourI>0){e.preventDefault();tourI--;showStep()}return}
 const q=document.getElementById('q');
 if(q){if(e.key==='ArrowDown'){e.preventDefault();sIdx=Math.min(sIdx+1,sItems.length-1);drawResults()}else if(e.key==='ArrowUp'){e.preventDefault();sIdx=Math.max(sIdx-1,0);drawResults()}else if(e.key==='Enter'){e.preventDefault();chooseResult(sIdx)}else if(e.key==='Escape')closePal();return}
 if((e.key==='/'||(e.key==='k'&&(e.metaKey||e.ctrlKey)))&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();openPal();return}
 if(e.key==='Escape'&&S.drawer)closeDrawer();
});
window.addEventListener('resize',()=>{if(tourI>=0)showStep()});
window.addEventListener('scroll',()=>{if(tourI>=0){const st=TOUR[tourI];if(st.sel)requestAnimationFrame(()=>placeStep(visibleEl(st.sel),st))}},{passive:true});
render();
let seen=false;try{seen=localStorage.getItem('zocus-tour-v3')==='1'}catch(e){}
(window.ZSplash?ZSplash.done:Promise.resolve()).then(()=>{if(!seen)setTimeout(startTour,300)});
})();
