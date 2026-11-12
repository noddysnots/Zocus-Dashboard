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
  if(cand){BEST[k]={rep:cand.rep,hi:cand.reply,en:cand.replyEn||cand.reply,real:true};return}
  const b=builtin[k];
  BEST[k]=b?{rep:topRepFor(area),hi:b.hi,en:b.en}:{rep:topRepFor(area),hi:'',en:'Ask the top rep how they handle this.'}})})();
/* Wording per business type. Labels only; numbers are untouched. */
const VERT={car:{stock:'Model or variant not available',design:'Did not like the options shown',making:'On-road price or charges too high',budget:'Over budget',competitor:'Comparing with another dealer',family:'Needs family approval',browse:'Just looking'},
 'two-wheeler':{stock:'Model or colour not available',design:'Did not like the options shown',making:'On-road price or charges too high',competitor:'Comparing with another dealer'},
 real_estate:{stock:'Unit or layout not available',design:'Did not like the options shown',making:'Price or charges too high',competitor:'Comparing with another project'}}[ZD.vertical];
if(VERT)Object.keys(VERT).forEach(k=>{if(REASONS[k])REASONS[k].label=VERT[k]});
/* The prototype ships example quotes and answers. They are fine for the sample store but must never pass as a real store's words:
   for uploaded data keep only quotes that come from the CSV. */
if(!ZD.isSample){const custom=new Set((ZD.customReasons||[]).map(c=>c.code));
 const real=k=>CONVS.filter(c=>(c.reason===k&&c.cq)||(c.objection===k&&c.objQuote)).sort((a,b)=>b.at-a.at)[0];
 Object.keys(REASONS).forEach(k=>{if(custom.has(k))return;const c=real(k);REASONS[k].hi=c?((c.reason===k&&c.cq)||c.objQuote):'';REASONS[k].en=c?((c.reason===k&&c.cqEn)||c.objQuoteEn||''):''});
 Object.keys(BEST).forEach(k=>{if(!BEST[k].real){BEST[k].hi='';BEST[k].en=''}})}


/* ---------- Helpers ---------- */
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
function inr(v){v=Math.round(v);if(v>=1e7)return '₹'+(v/1e7).toFixed(2).replace(/\.?0+$/,'')+' Cr';if(v>=1e5)return '₹'+(v/1e5).toFixed(1).replace(/\.0$/,'')+'L';if(v>=1e3)return '₹'+Math.round(v/1e3)+'K';return '₹'+v}
const pct=x=>Math.round(x*100)+'%';
const needs=t=>`<div class="needs">${ic('clock',16)}<span>${t} <b>Coming soon.</b></span></div>`;
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
 up:'<path d="m6 14 6-6 6 6"/>', down:'<path d="m6 10 6 6 6-6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check:'<path d="m5 12 5 5 9-10"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',coach:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'};
const ic=(n,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
function ring(score,size=38){score=Math.round(score);const r=(size-6)/2,c=2*Math.PI*r,col=score>=70?'var(--good)':score>=55?'var(--warn)':'var(--bad)',h=size/2;
 return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Score ${score} out of 100"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="var(--line)" stroke-width="3.5"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" class="rv" style="--len:${(c*score/100).toFixed(1)}" stroke-dasharray="${(c*score/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${h} ${h})"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="var(--ink)" font-size="${Math.round(size*.32)}" font-weight="700" font-family="Figtree,system-ui">${score}</text></svg>`}
const scoreCol=s=>s>=70?'var(--good)':s>=55?'var(--warn)':'var(--bad)';
function outcomePill(c){return c.outcome==='sold'?'<span class="pill good">Sold</span>':c.outcome==='followup'?'<span class="pill warn">Will return</span>':'<span class="pill bad">Did not buy</span>'}
function delta(cur,prev,opt){opt=opt||{};let diff,txt;if(!hasBase())return '';
 if(opt.pts){diff=Math.round((cur-prev)*100);txt=Math.abs(diff)+(Math.abs(diff)===1?' pt':' pts')}else{if(!prev)return '<span class="delta flat">new</span>';diff=Math.round((cur-prev)/prev*100);txt=Math.abs(diff)+'%'}
 if(diff===0)return '<span class="delta flat">no change</span>';
 const good=opt.lowerBetter?diff<0:diff>0;
 return `<span class="delta ${good?'up':'down'}">${ic(diff>0?'up':'down',14)}${txt}</span>`}

/* ---------- State ---------- */
const RANGES={live:{days:1,lo:0,hi:0,plo:-1,phi:-1},today:{days:1,lo:0,hi:0,plo:7,phi:7},yesterday:{days:1,lo:1,hi:1,plo:8,phi:8},'7':{days:7,lo:0,hi:6,plo:7,phi:13},'30':{days:30,lo:0,hi:29,plo:30,phi:59}};
const S={from:'team',rcf:{},rcfFor:null,period:'30',tab:'drop',showAll:{},cf:{},page:0,sort:'date',ctype:'persona',drawer:null,drawerAt:null,block:null};
const CF_KEYS=['rep','outcome','persona','product','reason','stage','comp','kw'];
try{const p=localStorage.getItem('zocus-period');if(RANGES[p]&&p!=='live')S.period=p}catch(e){}
if(ZD.liveDay)S.period='live';else if(ZD.spanDays<3)S.period='today';
const R=()=>RANGES[S.period];
const LIVE=()=>S.period==='live';
const inBlock=(c,b)=>{const h=c.at.getHours();return h>=b&&h<b+2};
const h12=h=>(h%24)%12||12,blockLabel=b=>`${h12(b)} to ${h12(b+2)} ${(b+2)%24<12?'am':'pm'}`;
const cur=()=>{const r=R();const L=CONVS.filter(c=>c.d>=r.lo&&c.d<=r.hi);return LIVE()&&S.block!=null?L.filter(c=>inBlock(c,S.block)):L};
const prev=()=>{if(LIVE())return S.block==null?[]:CONVS.filter(c=>c.d===0&&inBlock(c,S.block-2));const r=R();return CONVS.filter(c=>c.d>=r.plo&&c.d<=r.phi)};
const hasBase=()=>prev().length>0;
const VS=()=>hasBase()?' vs '+cmpTxt():'';
const rangeDays=()=>R().days;
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dayDate=()=>new Date(TODAY.getTime()-R().lo*DAY);
const cmpTxt=()=>LIVE()?blockLabel(S.block-2):rangeDays()===1?'last '+WD[dayDate().getDay()]:'previous';
function setPeriod(v){if(!RANGES[v]||v===S.period)return;S.period=v;S.block=null;S.page=0;delete S.cf.day;delete S.cf.hour;if(v!=='live'&&!ZD.liveDay)try{localStorage.setItem('zocus-period',v)}catch(e){}render();Waves.pulse()}
function setBlock(b){S.block=b;S.page=0;delete S.cf.hour;render();Waves.pulse()}
function stats(list){const n=list.length,sold=list.filter(c=>c.outcome==='sold'),lost=list.filter(c=>c.outcome!=='sold');
 const skill={};SKILLS.forEach(s=>skill[s.id]=n?Math.round(list.reduce((a,c)=>a+c.skills[s.id],0)/n):0);
 return {n,sold:sold.length,notSold:lost.length,conv:n?sold.length/n:0,soldValue:sumv(sold),lostValue:sumv(lost.filter(c=>c.outcome==='lost')),openValue:sumv(lost.filter(c=>c.outcome==='followup')),score:n?Math.round(list.reduce((a,c)=>a+c.score,0)/n):0,skill}}
function repRows(list){const store=stats(list);
 return REPS.map(r=>{const L=list.filter(c=>c.rep===r.id),s=stats(L);
   let weak=null,gap=0;SKILLS.forEach(k=>{const g=s.skill[k.id]-store.skill[k.id];if(weak===null||g<gap){weak=k.id;gap=g}});
   const status=s.score>=store.score+6?['good','Top performer']:s.score<=store.score-6?['bad','Needs coaching']:['neutral','On track'];
   return {rep:r,s,L,weak,gap,status}}).sort((a,b)=>b.s.score-a.s.score)}

/* ---------- Shell ---------- */
const NAV=[['home','Overview','home'],['insights','Insights','insights'],['team','Team','team'],['coaching','Coaching','coach'],['conversations','Conversations','conv'],['followups','Follow-ups','calls']];
function parseRep(){let h=(location.hash||'').slice(1);try{h=decodeURIComponent(h)}catch(e){}const m=h.match(/^(rep|coach)-(.+?)(?:\/(overview|coaching|conversations))?$/);return m&&REP[m[2]]?{id:m[2],tab:m[3]||(m[1]==='coach'?'coaching':'overview')}:null}
function routeName(){const r=parseRep();if(r)return 'rep-'+r.id;const h=(location.hash||'#home').slice(1);return NAV.some(n=>n[0]===h)?h:'home'}
function renderNav(){const rt=routeName(),base=rt.startsWith('rep-')?(S.from==='coaching'?'coaching':'team'):rt,due=followups().length;
 const item=(n,m)=>`<a href="#${n[0]}" ${n[0]===base?'aria-current="page"':''} ${n[0]==='insights'?'data-tour="nav-insights"':n[0]==='coaching'?'data-tour="nav-coaching"':''}>${m?ic(n[2],20):''}<span>${m&&n[0]==='conversations'?'Chats':n[1]}</span>${n[0]==='followups'&&due?`<span class="dot num">${due}</span>`:''}</a>`;
 document.getElementById('nav').innerHTML=NAV.map(n=>item(n,false)).join('');
 document.getElementById('bnav').innerHTML=NAV.map(n=>item(n,true)).join('');
 document.querySelectorAll('[data-act="period"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.period)));const rs=document.getElementById('rangeSel');if(rs)rs.value=S.period;
 document.querySelectorAll('[data-act="period"],#rangeSel option').forEach(b=>{const v=b.dataset.v||b.value,hide=(ZD.spanDays<3&&(v==='7'||v==='30'))||(ZD.spanDays<2&&v==='yesterday')||(ZD.liveDay&&v==='today');b.hidden=hide;if(b.tagName==='OPTION')b.disabled=hide});
 const seg=document.querySelector('.seg[data-tour="period"]'),one=[...document.querySelectorAll('[data-act="period"]')].filter(b=>!b.hidden).length<2;if(seg)seg.classList.toggle('solo',one);if(rs)rs.classList.toggle('solo',one)}
function phead(title,sub){return `<div class="phead"><h1>${title}</h1><p>${sub}</p></div>`}
const periodTxt=()=>LIVE()?(S.block==null?'today so far':'today, '+blockLabel(S.block)):({today:'today',yesterday:'yesterday','7':'last 7 days','30':'last 30 days'})[S.period];
const inTxt=()=>rangeDays()===1?periodTxt():'in the '+periodTxt();
const baseTxt=()=>rangeDays()===1?periodTxt():'the '+periodTxt();
const AFTER=['before the need was understood','after the need was understood','after the product was shown','after the price was quoted'];
function leaks(L){return [0,1,2,3].map(k=>{const a=L.filter(c=>c.stage===k);return {k,n:a.length,v:sumv(a)}})}

/* ---------- Home: briefing, 3 numbers, 3 actions, team pulse ---------- */
function computeActions(L){
 const rows=repRows(L),store=stats(L),acts=[];
 let best=null;rows.forEach(r=>{const tied=r.L.filter(c=>c.outcome!=='sold'&&c.reason&&REASONS[c.reason].skill===r.weak);const v=sumv(tied);const sc=-r.gap*v;if(!best||sc>best.sc)best={...r,tied,v,sc}});
 if(best)acts.push({impact:best.v,title:`Coach ${best.rep.first} on ${SK[best.weak].label.toLowerCase()}`,body:`Scores ${best.s.skill[best.weak]} vs the store's ${store.skill[best.weak]}. ${plural(best.tied.length,'customer')} left at this step.`,btn:'Coach',go:'#rep-'+best.rep.id+'/coaching'});
 const fu=followups();
 if(fu.length)acts.push({impact:sumv(fu.map(f=>f.c)),title:`Call back ${plural(fu.length,'customer')}`,body:`${fu.filter(f=>f.status==='overdue').length} overdue. Messages are drafted and ready to copy.`,btn:'Call list',go:'#followups'});
 const oos=L.filter(c=>!c.inStock),byP=groupBy(oos,c=>c.product);let top=null;Object.entries(byP).forEach(([k,v])=>{if(!top||v.length>top.v.length)top={k,v}});
 if(top)acts.push({impact:sumv(top.v),title:`Restock ${lc(PRODUCTS[top.k].label)}`,body:`${plural(top.v.length,'customer')} asked and we had none.${/lightweight/i.test(PRODUCTS[top.k].label)?' Most wanted under 10 grams.':''}`,btn:'Demand',go:'#insights',tab:'want'});
 return acts.sort((a,b)=>b.impact-a.impact).slice(0,3)}
function lede(s,p,big){
 if(!s.n)return `<b>No conversations recorded ${inTxt()}.</b> ${ZD.spanDays<3?'New recordings appear after the next data refresh.':'Switch to 7 or 30 days to see the picture.'}`;
 const cmp=p.n?`, ${s.conv===p.conv?'the same as':s.conv>p.conv?'up from':'down from'} ${pct(p.conv)}${LIVE()?' in '+cmpTxt():rangeDays()===1?' '+cmpTxt():''}`:'';
 return `<b>${pct(s.conv)} of customers bought</b>${cmp}. Most sales slipped <b>${AFTER[big.k]}</b>: ${plural(big.n,'customer')}, ${inr(big.v)}. The three actions below go after the biggest part of it.${s.n<8?` Only ${plural(s.n,'conversation')} so far, so read the percentages with care.`:''}`}
function homePanel(s){const W=weekly(CONVS),by=o=>cur().filter(c=>c.outcome===o),fo=o=>`data-filter='${JSON.stringify({outcome:o})}'`;
 return `<aside class="card hpanel" aria-label="Trend and results"><div class="cc-h"><h3>Conversion, last 8 weeks</h3><span class="hint">Store</span></div>
  ${ZC.lineChart({labels:W.map(x=>x.label),series:[{name:'Conversion',values:wk(W,x=>x.conv*100)}],fmt:v=>Math.round(v)+'%',w:760,h:128,aria:'Store sale conversion by week'})}
  <div class="cc-h" style="margin-top:6px"><h3>Results ${esc(inTxt())}</h3><span class="hint">Tap to filter</span></div>
  ${ZC.splitBar([{name:'Sold',n:by('sold').length,color:ZC.OUTCOME.sold,sub:inr(sumv(by('sold'))),attr:fo('sold')},{name:'Will return',n:by('followup').length,color:ZC.OUTCOME.followup,sub:inr(sumv(by('followup'))),attr:fo('followup')},{name:'Did not buy',n:by('lost').length,color:ZC.OUTCOME.lost,sub:inr(sumv(by('lost'))),attr:fo('lost')}])}</aside>`}
function dayBlocks(){const L=CONVS.filter(c=>c.d===0);if(!L.length)return [];let lo=24,hi=0;L.forEach(c=>{const h=c.at.getHours();lo=Math.min(lo,h);hi=Math.max(hi,h)});lo-=lo%2;
 const out=[];for(let b=lo;b<=hi;b+=2){const a=L.filter(c=>inBlock(c,b));out.push({b,a,s:stats(a)})}return out}
const mins=m=>m>=60?Math.floor(m/60)+' h '+String(Math.round(m%60)).padStart(2,'0')+' min':Math.round(m)+' min';
function liveStrip(){if(!LIVE())return '';const B=dayBlocks(),all=CONVS.filter(c=>c.d===0),m=ZD.meta||{},bits=[];
 if(m.exportedAt){const d=new Date(m.exportedAt);bits.push('Data as of '+(new Date().toDateString()===d.toDateString()?'':fdate(d)+', ')+ftime(d))}
 bits.push(plural(all.length,'conversation')+' on '+fdate(TODAY));
 if(S.block!=null)bits.push(hasBase()?`<b>arrows compare with ${blockLabel(S.block-2)}</b>`:'nothing recorded in the block before, so no comparison');
 if(m.analysing&&m.analysing.length)bits.push(`<b>${m.analysing.length} still being analysed</b>`);
 if(all.length){const last=all.reduce((a,c)=>c.at>a.at?c:a),ago=(Date.now()-last.at)/6e4;bits.push('last recording '+(ago>=0&&ago<720?(ago<60?Math.round(ago)+' min':(ago/60).toFixed(1)+' h')+' ago':ftime(last.at)))}
 const chip=(b,label,a,st)=>`<button class="bchip" data-act="block" data-v="${b==null?'':b}" aria-pressed="${S.block===b}"><b>${label}</b><span class="num">${a.length} ${a.length===1?'chat':'chats'}${a.length?` · ${st.sold} sold · score ${st.score}`:''}</span></button>`;
 return `<div class="livebar"><div class="livehead"><span class="livedot" aria-hidden="true"></span><span>${bits.join(' · ')}</span></div>
  <div class="bstrip" role="group" aria-label="Time of day">${chip(null,'All day',all,stats(all))}${B.map(x=>chip(x.b,blockLabel(x.b),x.a,x.s)).join('')}</div></div>`}
function liveHomePanel(){const B=dayBlocks(),by=o=>cur().filter(c=>c.outcome===o),fo=o=>`data-filter='${JSON.stringify({outcome:o})}'`;
 const data=B.map(x=>{const v={sold:0,followup:0,lost:0};x.a.forEach(c=>v[c.outcome]++);return {label:h12(x.b)+((x.b)%24<12?'a':'p'),vals:v,tip:`${blockLabel(x.b)}|${plural(x.a.length,'conversation')}|${v.sold} sold · ${v.followup} will return · ${v.lost} did not buy`}});
 return `<aside class="card hpanel" aria-label="Day so far"><div class="cc-h"><h3>Conversations by 2-hour block</h3><span class="hint">${fdate(TODAY)}</span></div>
  ${ZC.columns({data,h:128,w:760,every:1,groups:[{key:'sold',name:'Sold',color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:'Did not buy',color:ZC.OUTCOME.lost}],aria:'Conversations in each 2-hour block by result'})}
  <div class="cc-h" style="margin-top:6px"><h3>Results ${esc(inTxt())}</h3><span class="hint">Tap to filter</span></div>
  ${ZC.splitBar([{name:'Sold',n:by('sold').length,color:ZC.OUTCOME.sold,sub:inr(sumv(by('sold'))),attr:fo('sold')},{name:'Will return',n:by('followup').length,color:ZC.OUTCOME.followup,sub:inr(sumv(by('followup'))),attr:fo('followup')},{name:'Did not buy',n:by('lost').length,color:ZC.OUTCOME.lost,sub:inr(sumv(by('lost'))),attr:fo('lost')}])}</aside>`}
function timeCard(L,title){if(!L.length)return '';const tot=L.reduce((a,c)=>a+c.dur,0),longest=L.reduce((a,c)=>c.dur>a.dur?c:a),tk=L.filter(c=>c.talkRep!=null);
 const avgBy=o=>{const a=L.filter(c=>c.outcome===o);return a.length?Math.round(a.reduce((x,c)=>x+c.dur,0)/a.length):0};
 const items=[['sold','Sold'],['followup','Will return'],['lost','Did not buy']].filter(([o])=>L.some(c=>c.outcome===o)).map(([o,n])=>({label:n,value:avgBy(o),text:avgBy(o)+' min',tip:`${n}|Average ${avgBy(o)} min per conversation`}));
 return `<section class="card"><div class="card-h"><h2>${title||'Time with customers'}</h2><span class="hint">${esc(periodTxt())}</span></div>
  <div class="statline"><div><b class="num">${mins(tot)}</b><span>in conversations</span></div><div><b class="num">${Math.round(tot/L.length)} min</b><span>average length</span></div><div><b class="num">${longest.dur} min</b><span>longest</span></div>${tk.length?`<div><b class="num">${Math.round(tk.reduce((a,c)=>a+c.talkRep,0)/tk.length)}%</b><span>of words by the rep</span></div>`:''}</div>
  <div class="cc-h" style="margin-top:12px"><h3>Average length by result</h3></div>${ZC.barList(items)}
  <button class="link" data-conv="${longest.id}" style="margin-top:8px">Open the longest conversation${ic('right',14)}</button></section>`}
function liveCards(L){if(!LIVE()||!L.length)return '';const rows=repRows(L);
 const reps=`<section class="card"><div class="card-h"><h2>Reps ${esc(periodTxt())}</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Rep</th><th class="r">Chats</th><th class="r">Talk time</th><th class="r">Score</th><th>Results</th></tr></thead><tbody>${rows.map(r=>{const a=L.filter(c=>c.rep===r.rep.id);return `<tr class="click" data-go="#rep-${r.rep.id}"><td><b>${esc(r.rep.name)}</b></td><td class="r num">${a.length}</td><td class="r num">${mins(a.reduce((x,c)=>x+c.dur,0))}</td><td class="r num">${r.s.score}</td><td style="min-width:120px">${ZC.miniSplit([{name:'Sold',n:a.filter(c=>c.outcome==='sold').length,color:ZC.OUTCOME.sold},{name:'Will return',n:a.filter(c=>c.outcome==='followup').length,color:ZC.OUTCOME.followup},{name:'Did not buy',n:a.filter(c=>c.outcome==='lost').length,color:ZC.OUTCOME.lost}])}</td></tr>`}).join('')}</tbody></table></div></section>`;
 const latest=[...L].sort((a,b)=>b.at-a.at).slice(0,5);
 return `<div class="homegrid2">${reps}${timeCard(L)}</div><section class="card"><div class="card-h"><h2>Latest conversations</h2><button class="link" data-go="#conversations">All ${L.length}${ic('right',14)}</button></div><div class="clist">${latest.map(c=>`<button class="crow dense latest" data-conv="${c.id}">${ring(c.score,30)}<strong>${esc(PRODUCTS[c.product].label)}</strong><small>${esc(clipTxt((c.sum&&c.sum.happened)||'',150))}</small><span class="c-rep">${esc(REP[c.rep].first)} · ${c.dur} min</span><span>${outcomePill(c)}</span><span class="d num">${ftime(c.at)}</span></button>`).join('')}</div>${pendingHtml()}</section>`}
function pendingHtml(){const m=ZD.meta;if(!m||!LIVE())return '';const row=(x,t)=>`<div class="crow dense pending"><span class="pdot" aria-hidden="true"></span><strong>${t}</strong><small>${esc(x.rep)}${x.min?' · '+x.min+' min':''}</small><span class="d num">${esc((x.at||'').slice(11))}</span></div>`;
 const h=(m.analysing||[]).map(x=>row(x,'Being analysed')).join('')+(m.unscored||[]).map(x=>row(x,'Too short or unclear to score')).join('')+(m.failed||[]).map(x=>row(x,'Upload failed, needs re-upload')).join('');
 return h?`<div class="clist pendlist">${h}</div>`:''}
function kpi(o){return `<button class="card kpi" ${o.filter?`data-filter='${JSON.stringify(o.filter)}'`:`data-go="${o.go}"`}><div class="row"><span class="label">${o.label}</span><span class="tag">${o.tag}</span></div><div class="val num">${o.val}</div><div class="row"><span class="sub">${o.sub}</span>${o.delta}</div></button>`}
function renderHome(){
 const L=cur(),P=prev(),s=stats(L),p=stats(P),acts=computeActions(L),rows=repRows(L);
 const big=leaks(L).reduce((a,b)=>b.v>a.v?b:a);
 const short={good:'Top',neutral:'On track',bad:'Coach'};
 return `<div class="homegrid"><section class="hero" data-tour="brief">
  <span class="mono">${ic('spark',14)} AI briefing · ${esc(ZD.store)} · ${periodTxt()}${rangeDays()===1?' · '+fdate(dayDate()):''} ${ZD.isSample?'<span class="sample">Sample data</span>':''}</span>
  <h1>${greet()}</h1>
  <p class="lede">${lede(s,p,big)}</p>
  </section>${LIVE()?liveHomePanel():homePanel(s)}</div>
  <div class="waveband" data-wave-anchor aria-hidden="true"><span class="wavehint">Live voice waves · hover or click</span></div>
 <section class="kpis" data-tour="kpis">
  ${kpi({label:'Sale conversion',tag:'Output',val:pct(s.conv),sub:`${s.sold} of ${s.n} customers`,delta:delta(s.conv,p.conv,{pts:true}),go:'#insights'})}
  ${kpi({label:'Sales closed',tag:'Output',val:inr(s.soldValue),sub:'Tagged as sold',delta:delta(s.soldValue,p.soldValue),filter:{outcome:'sold'}})}
  ${kpi({label:'Conversations recorded',tag:'Input',val:s.n,sub:`${(s.n/rangeDays()/REPS.length).toFixed(1)} per rep per day`,delta:delta(s.n,p.n),go:'#team'})}
 </section>
  <div class="homegrid2"><section class="card" data-tour="actions"><div class="card-h"><h2>Today, do these three</h2><span class="hint">Ranked by money at stake</span></div>
  <div class="acts">${acts.map((a,i)=>`<div class="act"><span class="n">${i+1}</span><div><h3>${a.title}</h3><p>${a.body}</p></div><div class="r"><span class="pill gold num">${inr(a.impact)}</span><button class="btn ${i===0?'primary':''} sm" data-go="${a.go}" ${a.tab?`data-tab="${a.tab}"`:''}>${a.btn}${ic('right',14)}</button></div></div>`).join('')}</div></section>
 <section class="card" data-tour="pulse"><div class="card-h"><h2>Team at a glance</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div>
  <div class="pulse">${rows.map(r=>`<button class="pchip" data-go="#rep-${r.rep.id}">${ring(r.s.score,54)}<b>${r.rep.first}</b><span class="pill ${r.status[0]}">${short[r.status[0]]}</span></button>`).join('')}</div>
  <p class="hint" style="margin:10px 0 0">Ring shows conversation score out of 100. Store average ${s.score}. Tap a rep to coach.</p>${featuredHtml()}</section></div>${liveCards(L)}`}
function featuredHtml(){const f=(ZD.featured||[]).map(r=>CONVS.find(c=>c.ref===r)).filter(Boolean);if(!f.length)return '';
 return `<div class="card-h" style="margin:14px 0 8px"><h2>Start here</h2><span class="hint">Real test conversations</span></div><div class="featured">${f.map(c=>`<button class="feat" data-conv="${c.id}">${ring(c.score,40)}<span style="min-width:0"><b>${esc(PRODUCTS[c.product].label)}</b><span class="m">${esc(REP[c.rep].first)} · ${c.dur} min · ${esc(clipTxt((c.sum&&c.sum.happened)||'',90))}</span></span></button>`).join('')}</div>`}
const clipTxt=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;

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
  lead=`Most customers leave <b>${AFTER[big.k]}</b>. The costliest reason is <b>${lc(REASONS[r0.k].label)}</b>, ${inr(r0.v)} across ${plural(r0.n,'customer')}. ${BEST[r0.k].real||ZD.isSample?`${REP[BEST[r0.k].rep].first} has an answer that works.`:''}`;
  body=`<div class="ins2"><div><div class="card-h"><h2>Where sales leak</h2><span class="hint">Tap a red line to see those customers</span></div>${funnel(L)}</div>
  <div><div class="card-h" style="margin:0 0 4px"><h2>Reasons, by money lost</h2></div>`+
  showAll('drop',D.reasons,3,(r,i)=>{const R0=REASONS[r.k],b=BEST[r.k];return `<details class="why" ${i===0?'open':''}><summary>
   <span><span class="t">${R0.label}</span><br><span class="m num">${plural(r.n,'customer')}${r.worst?` · most with ${repLink(r.worst[0],REP[r.worst[0]].first)}`:''}</span></span>
   <span style="display:flex;align-items:center;gap:12px"><span style="text-align:right"><b class="num">${inr(r.v)}</b><br>${delta(r.n,r.prevN,{lowerBetter:true})}</span><span class="chev">${ic('chev')}</span></span></summary>
   <div class="body">${R0.hi||R0.en?`<div class="quote bad">${Q(R0.hi||R0.en,R0.en||R0.hi)}<div class="by">Customers say</div></div>`:''}
   ${b.real||ZD.isSample?`<div class="quote">${Q(b.hi,b.en)}<div class="by">What works · ${repLink(b.rep,REP[b.rep].name)}</div></div>`:`<p class="hint" style="margin:6px 0">No resolved answer recorded yet for this objection.</p>`}
   <div class="btnrow"><button class="btn primary sm" data-act="copy" data-text="${esc(`Team briefing: when a customer says "${R0.en}", try ${REP[b.rep].first}'s answer: "${b.en}"`)}">${ic('copy',14)}Copy for team briefing</button><button class="btn sm" data-filter='{"reason":"${r.k}"}'>See ${plural(r.n,'conversation')}</button></div></div></details>`})+'</div></div>';
 }else if(S.tab==='want'){const sp=[...D.products].sort((a,b)=>b.oosV-a.oosV)[0];
  const topAsk=[...D.products].sort((x,y)=>y.n-x.n)[0];
  lead=!ZD.has.stock?(topAsk?`Customers asked for <b>${esc(PRODUCTS[topAsk.k].label)}</b> most: ${plural(topAsk.n,'conversation')}.`:'No requests this period.'):sp&&sp.oos?`<b>${PRODUCTS[sp.k].label}</b> is the stock gap: ${plural(sp.oos,'customer')} asked when we had none, ${inr(sp.oosV)} of interest.${ZD.isSample?' "Lightweight" is a word customers keep using.':''}`:'No stock gaps this period.';
  const rows=S.showAll.want?D.products:D.products.slice(0,5);
  body=(ZD.has.stock?'':needs('Stock levels are not in this data yet, so the "Not in stock" and "Interest lost" columns stay empty.')+'<div style="height:12px"></div>')+`<div class="tblwrap"><table class="tbl"><thead><tr><th>Asked for</th><th class="r">Asked</th><th class="r">Bought</th><th class="r">Not in stock</th><th class="r">Interest lost</th></tr></thead><tbody>${rows.map(p=>`<tr class="click" data-filter='{"product":"${p.k}"}'><td><b>${PRODUCTS[p.k].label}</b> ${p.oos/p.n>.2?'<span class="pill warn">Stock gap</span>':''}</td><td class="r num">${p.n}</td><td class="r num">${pct(p.sold/p.n)}</td><td class="r num">${p.oos||'-'}</td><td class="r num">${p.oos?inr(p.oosV):'-'}</td></tr>`).join('')}</tbody></table></div>
  ${D.products.length>5?`<div style="margin-top:10px"><button class="link" data-act="showall" data-k="want">${S.showAll.want?'Show top 5':'Show all '+D.products.length}</button></div>`:''}
  <div class="card-h" style="margin:26px 0 10px"><h2>Words customers keep using</h2><span class="hint">Tap to see them</span></div>
  <div class="chips">${D.kws.slice(0,8).map(k=>`<button class="chip" data-filter='{"kw":"${esc(k.k)}"}'>${esc(k.k)} <small class="num">${k.n}</small>${k.n>k.p*1.15?`<span class="delta up">${ic('up',13)}</span>`:k.n<k.p*.85?`<span class="delta down">${ic('down',13)}</span>`:''}</button>`).join('')}</div>`;
 }else if(S.tab==='comp'){const c0=D.comps[0],b=BEST.competitor;
  lead=c0?`When customers mention <b>${COMP[c0.k].label}</b>, we close ${pct(c0.conv)} vs ${pct(D.overall)} usually. ${COMP[c0.k].offer?` They are pushing <b>${lc(COMP[c0.k].offer)}</b>.`:''}`:'No competitor mentions this period.';
  body=`<div class="comp">${D.comps.map(c=>`<div class="ccard"><div><h3 style="font-size:16px">${COMP[c.k].label}</h3><span class="hint">${plural(c.n,'mention')}</span></div>
   <div class="stat2"><div><b class="num" style="color:${c.conv<D.overall?'var(--bad)':'var(--good)'}">${pct(c.conv)}</b><span>we close when named</span></div><div><b class="num">${inr(c.risk)}</b><span>at risk</span></div></div>
   ${COMP[c.k].offer?`<div><span class="mono">They offer</span><div style="font-weight:500">${COMP[c.k].offer}</div></div>`:`<div class="hint">What they offer: not captured yet.</div>`}
   <button class="btn sm" data-filter='{"comp":"${c.k}"}' style="align-self:flex-start">See ${plural(c.n,'conversation')}</button></div>`).join('')}</div>
   ${b.real||ZD.isSample?`<div class="quote" style="margin-top:16px">${Q(b.hi,b.en)}<div class="by">Best counter so far · ${REP[b.rep].name}</div></div>`:''}`;
 }else{const pl=[...D.pers].sort((a,b)=>a.conv-b.conv)[0];
  lead=`<b>${PER[pl.k].label}</b> customers convert least, at ${pct(pl.conv)}.${pl.best?` ${pl.best.r.first} closes ${pct(pl.best.conv)} of them: send these walk-ins to ${pl.best.r.first}.`:''}`;
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>Came in for</th><th>Share</th><th class="r">Conversion</th><th class="r">Avg sale</th><th>Best rep</th></tr></thead><tbody>${D.pers.map(p=>`<tr class="click" data-filter='{"persona":"${p.k}"}'><td><b>${PER[p.k].label}</b></td><td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1"><i style="width:${p.share*100}%;background:var(--ink)"></i></span><span class="num">${pct(p.share)}</span></div></td><td class="r num">${pct(p.conv)}</td><td class="r num">${p.ticket?inr(p.ticket):'-'}</td><td>${p.best?`${repLink(p.best.r.id,p.best.r.first)} <span class="hint num">${pct(p.best.conv)}</span>`:'-'}</td></tr>`).join('')}</tbody></table></div>`;
 }
 return phead('Insights',`What ${L.length} customers told your team ${inTxt()}.`)+
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
  ZC.tile({label:'Conversation score',value:store.score,spark:ZC.spark(wk(W,x=>x.score)),sub:delta(store.score,p.score)+VS()}),
  ZC.tile({label:'Sale conversion',value:pct(store.conv),spark:ZC.spark(wk(W,x=>x.conv*100)),sub:delta(store.conv,p.conv,{pts:true})+VS()}),
  ZC.tile({label:'Conversations recorded',value:store.n,spark:ZC.spark(wk(W,x=>x.n)),sub:delta(store.n,p.n)+VS()}),
  ZC.tile({label:'Sales closed',value:inr(store.soldValue),spark:ZC.spark(wk(W,x=>x.soldValue)),sub:delta(store.soldValue,p.soldValue)+VS()})].join('');
 const trend=ZC.lineChart({labels:W.map(x=>x.label),series:[{name:'Store score',values:wk(W,x=>x.score)}],aria:'Store conversation score by week for the last 8 weeks'});
 const sc=ZC.scatter({points:rows.filter(r=>r.s.n).map(r=>({x:r.s.score,y:Math.round(r.s.conv*100),size:r.s.n,label:r.rep.first,href:'#rep-'+r.rep.id,tip:`${r.rep.name}|Score ${r.s.score}|Conversion ${pct(r.s.conv)}|${plural(r.s.n,'conversation')}`})),xLabel:'Conversation score',yLabel:'Conversion %',ySuffix:'%',refX:store.score,refY:Math.round(store.conv*100),aria:'Each rep plotted by conversation score and conversion'});
 const grid=ZC.heatGrid({cols:SKILLS.map(k=>SHORT[k.id]),rows:rows.map(r=>({label:r.rep.first,attr:`data-go="#rep-${r.rep.id}"`,cells:SKILLS.map(k=>({text:r.s.skill[k.id],cls:cls(r.s.skill[k.id],store.skill[k.id]),tip:`${r.rep.name}|${k.label}: ${r.s.skill[k.id]}|Store ${store.skill[k.id]}`}))})).concat([{label:'Store',foot:true,cells:SKILLS.map(k=>({text:store.skill[k.id],cls:'n'}))}])});
 const hi=rows.filter(r=>r.s.score>=store.score&&r.s.conv<store.conv).sort((a,b)=>a.s.conv-b.s.conv)[0];
 return phead('Team',`${plural(REPS.length,'rep')} ${inTxt()}. Tap a row to open it.`)+
 `<div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
 <div class="ktiles">${tiles}</div>
 <div class="cgrid3">
  ${ZC.ccard('Score trend','Store, 8 weeks',trend)}
  ${ZC.ccard(hi?`${esc(hi.rep.first)} scores well but closes less`:'Score vs conversion','Dot size = conversations',sc)}
  ${ZC.ccard('Skills by rep','Green above store, red below',grid)}
 </div>
 <section class="card"><div class="card-h"><h2>Reps</h2><span class="hint">Ranked by conversation score</span></div>
 <div class="xr-h trow"><span>#</span><span>Rep</span><span class="r">Score</span><span class="r">Conv.</span><span class="r">Recorded</span><span>8-week score</span><span></span></div>
 ${rows.map((r,i)=>{const RW=weekly(CONVS.filter(c=>c.rep===r.rep.id));return `<details class="xrow"><summary class="trow"><span class="num rk">${i+1}</span><span class="nm"><b>${esc(r.rep.name)}</b><span class="st">${dotOf(r.status[0])}${r.status[1]}</span></span><span class="r num"><b>${r.s.score}</b></span><span class="r num">${pct(r.s.conv)}</span><span class="r num">${r.s.n}</span><span>${ZC.spark(wk(RW,x=>x.score),{w:96,h:24})}</span>${ic('chev',16)}</summary>
  <div class="xr-b"><div class="skills5">${SKILLS.map(k=>`<div class="skill"><div class="s2"><b style="font-weight:500">${SHORT[k.id]}</b><span class="num"><b style="color:var(--ink)">${r.s.skill[k.id]}</b> / ${store.skill[k.id]}</span></div><div class="bar"><i style="width:${r.s.skill[k.id]}%;background:${scoreCol(r.s.skill[k.id])}"></i><span class="tick" style="left:${store.skill[k.id]}%"></span></div></div>`).join('')}</div>
  <div class="xr-f"><span class="hint">Weakest vs store: <b style="color:var(--ink)">${SK[r.weak].label}</b> (${r.gap>0?'+':''}${r.gap}). ${inr(r.s.soldValue)} closed from ${plural(r.s.sold,'sale')}.</span><div class="btnrow"><button class="btn primary sm" data-go="#rep-${r.rep.id}/coaching">Coaching plan${ic('right',14)}</button><button class="btn sm" data-go="#rep-${r.rep.id}">Profile</button><button class="btn sm" data-go="#rep-${r.rep.id}/conversations">Conversations</button></div></div></div></details>`}).join('')}
 </section>`}

/* ---------- Rep profile: everything about one rep in one place (Overview, Coaching, Conversations) ---------- */
const repLink=(id,txt)=>`<span class="rlink" role="link" tabindex="0" data-go="#rep-${id}">${esc(txt)}</span>`;
const LEFT=['Before need understood','After need understood','After product shown','After price quoted'];
const rf=o=>`data-rf='${JSON.stringify(o)}'`;
function timeBuckets(list,af){const mk=()=>({sold:0,followup:0,lost:0}),n=rangeDays(),out=[];
 if(n===1){let lo=10,hi=20;list.forEach(c=>{const h=c.at.getHours();lo=Math.min(lo,h);hi=Math.max(hi,h)});
  for(let h=lo;h<=hi;h++){const a=list.filter(c=>c.at.getHours()===h),v=mk();a.forEach(c=>v[c.outcome]++);const h12=h%12||12,ap=h<12?'am':'pm';
   out.push({label:h12+ap[0],vals:v,tip:`${h12} ${ap}|${plural(a.length,'conversation')}|${v.sold} sold · ${v.followup} will return · ${v.lost} did not buy${a.length&&af?'|Click to filter to this hour':''}`,attr:a.length&&af?af({hour:h}):''})}
  return {data:out,every:1}}
 for(let d=R().lo+n-1;d>=R().lo;d--){const a=list.filter(c=>c.d===d),dt=new Date(TODAY.getTime()-d*DAY),v=mk();a.forEach(c=>v[c.outcome]++);
  out.push({label:fdate(dt),vals:v,tip:`${fdate(dt)}|${plural(a.length,'conversation')}|${v.sold} sold · ${v.followup} will return · ${v.lost} did not buy${a.length&&af?'|Click to filter to this day':''}`,attr:a.length&&af?af({day:d}):''})}
 return {data:out,every:n<=7?1:5}}
function renderRep(id){
 const tab=(parseRep()||{}).tab||'overview',L=cur(),rows=repRows(L),row=rows.find(r=>r.rep.id===id),store=stats(L),rep=row.rep,s=row.s,pl=C.plan(id);
 const i=rows.indexOf(row),pv=rows[(i-1+rows.length)%rows.length].rep.id,nx=rows[(i+1)%rows.length].rep.id,sfx=tab==='overview'?'':'/'+tab;
 const from=NAV.find(n=>n[0]===S.from)||NAV[2],stt=C.status(id);
 const lost=row.L.filter(c=>c.outcome!=='sold'),byReason=Object.entries(groupBy(lost,c=>c.reason)).map(([k,v])=>({k,n:v.length,v:sumv(v)})).sort((a,b)=>b.v-a.v);
 const d=s.score-store.score,f0=pl&&pl.focus[0],peer=f0&&f0.groups[0]&&f0.groups[0].peers[0];
 const story=!s.n?`${esc(rep.first)} has no conversations ${inTxt()}.`:
  `${esc(rep.first)} scores <b>${s.score}</b>, ${d===0?'level with':Math.abs(d)+(d>0?' above':' below')} the store, and closes <b>${pct(s.conv)}</b> of customers vs ${pct(store.conv)}.`+
  (byReason[0]?` Most money is lost to <a class="slink" href="#rep-${id}/conversations" ${rf({reason:byReason[0].k})}>${esc(lc(REASONS[byReason[0].k].label))}</a>, ${inr(byReason[0].v)}.`:'')+
  (f0?` Focus: <a class="slink" href="#rep-${id}/coaching">${esc(lc(f0.label))}</a>${peer&&!peer.fallback?`, where ${esc(peer.rep.first)}'s answer worked on the same objection`:''}.`:' Above the store on every skill.');
 const tabs=[['overview','Overview'],['coaching','Coaching'+(pl&&pl.focus.length?` · ${pl.focus.length}`:'')],['conversations',`Conversations · ${s.n}`]];
 const body=tab==='coaching'?C.renderPlan(id):tab==='conversations'?repConvs(id,row):repOverview(id,row,store,rows);
 return `<div class="rnav"><button class="link back" data-go="#${from[0]}">${ic('left',15)}${from[1]}</button><span style="flex:1"></span>
  <div class="rsw"><button class="iconbtn sm" data-go="#rep-${pv}${sfx}" aria-label="Previous rep" title="Previous rep">${ic('left',15)}</button><select data-repsel aria-label="Switch rep">${rows.map((r,x)=>`<option value="${r.rep.id}" ${r.rep.id===id?'selected':''}>${x+1}. ${esc(r.rep.name)}</option>`).join('')}</select><button class="iconbtn sm" data-go="#rep-${nx}${sfx}" aria-label="Next rep" title="Next rep">${ic('right',15)}</button></div></div>
 <div class="rephead"><span class="av">${esc(rep.ini)}</span><div class="grow"><h1>${esc(rep.name)}</h1><p>${rep.tenure?esc(rep.tenure)+' · ':''}rank ${i+1} of ${rows.length} · <span class="pill ${row.status[0]}">${row.status[1]}</span>${pl?` · Readiness <b class="num">${pl.readiness}</b>`:''}${stt[1]&&stt[1]!=='On track'?` · <span class="pill ${stt[0]}">${stt[1]}</span>`:''}</p></div>
  <button class="btn primary" data-act="copy" data-text="${esc(C.noteFor(id))}">${ic('copy',15)}Copy 1:1 note</button></div>
 <div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${story}</p></div>
 <div class="tabs rtabs" role="tablist">${tabs.map(t=>`<button role="tab" aria-selected="${tab===t[0]}" data-go="#rep-${id}${t[0]==='overview'?'':'/'+t[0]}">${t[1]}</button>`).join('')}</div>
 <div class="rbody">${body}</div>`}

function repOverview(id,row,store,rows){
 const rep=row.rep,s=row.s,L=cur(),mine=row.L,p=stats(prev().filter(c=>c.rep===id));
 if(!s.n)return `<section class="card" style="text-align:center;padding:40px"><b>No conversations ${inTxt()}</b><p class="hint">Switch to 30 days, or check that ${esc(rep.first)} is recording conversations.</p></section>`;
 const RW=weekly(CONVS.filter(c=>c.rep===id)),SW=weekly(CONVS),rs=wk(RW,x=>x.score),first=rs.find(v=>v!=null),last=[...rs].reverse().find(v=>v!=null),ch=first!=null?last-first:0;
 const tiles=ZC.tile({label:'Conversation score',value:s.score,spark:ZC.spark(rs),sub:`Store ${store.score} · ${delta(s.score,p.score)}`})+
  ZC.tile({label:'Sale conversion',value:pct(s.conv),spark:ZC.spark(wk(RW,x=>x.conv*100)),sub:`Store ${pct(store.conv)} · ${delta(s.conv,p.conv,{pts:true})}`})+
  ZC.tile({label:'Conversations recorded',value:s.n,spark:ZC.spark(wk(RW,x=>x.n)),sub:`${(s.n/rangeDays()).toFixed(1)} a day · ${delta(s.n,p.n)}`})+
  ZC.tile({label:'Sales closed',value:inr(s.soldValue),spark:ZC.spark(wk(RW,x=>x.soldValue)),sub:`${plural(s.sold,'sale')} · ${delta(s.soldValue,p.soldValue)}`});
 const trend=ZC.lineChart({labels:SW.map(x=>x.label),series:[{name:rep.first,values:rs},{name:'Store',values:wk(SW,x=>x.score),color:'#A39A8A'}],aria:`${rep.first}'s weekly conversation score against the store`});
 const gaps=SKILLS.map(k=>({k,mine:s.skill[k.id],st:store.skill[k.id],best:Math.max(...rows.map(r=>r.s.skill[k.id]))})),hiS=[...gaps].sort((a,b)=>(b.mine-b.st)-(a.mine-a.st));
 const skills=`<div class="skl-w">${gaps.map(g=>`<a class="skl" href="#rep-${id}/coaching" data-tip="${esc(`${g.k.label}|${rep.first} ${g.mine}|Store ${g.st} · Best rep ${g.best}`)}"><span class="s2"><b>${g.k.label}</b><span class="num"><b>${g.mine}</b> / ${g.st}</span></span><span class="bar"><i style="width:${g.mine}%;background:${scoreCol(g.mine)}"></i><span class="tick" style="left:${g.st}%"></span><span class="bestm" style="left:${g.best}%"></span></span></a>`).join('')}</div><div class="hint">Line = store average, dot = best rep. Tap a skill for coaching.</div>`;
 const seg=(list,click)=>{const by=o=>list.filter(c=>c.outcome===o);return [['sold','Sold'],['followup','Will return'],['lost','Did not buy']].map(([o,n])=>({name:n,n:by(o).length,color:ZC.OUTCOME[o],sub:inr(sumv(by(o))),attr:click?rf({outcome:o}):''}))};
 const outcomes=`<span class="mono">${esc(rep.first)}</span>`+ZC.splitBar(seg(mine,true))+`<span class="mono" style="margin-top:10px">Store</span>`+ZC.miniSplit(seg(L,false));
 const lk=[0,1,2,3].map(k=>({k,a:mine.filter(c=>c.outcome!=='sold'&&c.stage===k).length/s.n*100,b:L.filter(c=>c.outcome!=='sold'&&c.stage===k).length/L.length*100,n:mine.filter(c=>c.outcome!=='sold'&&c.stage===k).length}));
 const bigL=lk.reduce((a,b)=>b.a>a.a?b:a);
 const leak=ZC.pairList(lk.map(x=>({label:LEFT[x.k],a:x.a,b:x.b,text:Math.round(x.a)+'%',attr:rf({stage:String(x.k)}),tip:`${LEFT[x.k]}|${rep.first}: ${plural(x.n,'customer')} (${Math.round(x.a)}%)|Store: ${Math.round(x.b)}%`})),{aName:rep.first,bName:'Store'});
 const lost=mine.filter(c=>c.outcome!=='sold'),byR=Object.entries(groupBy(lost,c=>c.reason)).map(([k,v])=>({k,n:v.length,v:sumv(v)})).sort((a,b)=>b.v-a.v).slice(0,5);
 const reasons=ZC.barList(byR.map(x=>({label:REASONS[x.k].label,value:x.v,text:inr(x.v),attr:rf({reason:x.k}),tip:`${REASONS[x.k].label}|${plural(x.n,'customer')}|${inr(x.v)} not closed`})),{empty:'Every customer bought in this period.'});
 const ob=ZD.hasObjection?Object.entries(groupBy(mine.filter(c=>c.objection),c=>c.objection)).map(([k,v])=>({k,t:v.length,r:v.filter(c=>c.objResolved).length})).sort((a,b)=>b.t-a.t):[];
 const obT=ob.reduce((a,x)=>a+x.t,0),obR=ob.reduce((a,x)=>a+x.r,0);
 const objections=ZD.hasObjection?ZC.legend([{name:'Resolved',color:ZC.OUTCOME.sold},{name:'Not resolved',color:ZC.OUTCOME.lost}])+ZC.barList(ob.slice(0,5).map(x=>({label:REASONS[x.k].label,value:x.t,parts:[{v:x.r,color:ZC.OUTCOME.sold},{v:x.t-x.r,color:ZC.OUTCOME.lost}],text:`${x.r} of ${x.t}`,attr:`data-go="#rep-${id}/coaching"`,tip:`${REASONS[x.k].label}|Resolved ${x.r} of ${x.t}`})),{empty:'No objections recorded.'}):'<p class="hint empty">This file has no objection columns.</p>';
 const pers=Object.entries(groupBy(mine,c=>c.persona)).map(([k,v])=>{const all=L.filter(c=>c.persona===k);return {k,n:v.length,a:v.filter(c=>c.outcome==='sold').length/v.length*100,b:all.filter(c=>c.outcome==='sold').length/all.length*100}}).sort((a,b)=>b.n-a.n).slice(0,5);
 const bestP=[...pers].filter(x=>x.n>=3).sort((a,b)=>(b.a-b.b)-(a.a-a.b))[0];
 const persona=ZC.pairList(pers.map(x=>({label:PER[x.k].label,a:x.a,b:x.b,text:`${Math.round(x.a)}% · ${x.n}`,attr:rf({persona:x.k}),tip:`${PER[x.k].label}|${rep.first}: ${Math.round(x.a)}% of ${x.n} bought|Store: ${Math.round(x.b)}%`})),{aName:rep.first,bName:'Store',max:100});
 const TB=timeBuckets(mine);
 const act=ZC.columns({data:TB.data,h:120,w:560,every:TB.every,groups:[{key:'sold',name:'Sold',color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:'Did not buy',color:ZC.OUTCOME.lost}],aria:`${rep.first}'s conversations per day by result`});
 return `<div class="ktiles">${tiles}</div>
 <div class="cgrid3">
  ${ZC.ccard(first==null?'Score trend':ch===0?'Score is flat over 8 weeks':`Score is ${ch>0?'up':'down'} ${Math.abs(ch)} pts in 8 weeks`,'vs store',trend)}
  ${ZC.ccard(`Strongest: ${SHORT[hiS[0].k.id]}. Weakest: ${SHORT[hiS[hiS.length-1].k.id]}`,'Score / store',skills)}
  ${ZC.ccard(`Closes ${pct(s.conv)}, store closes ${pct(store.conv)}`,'Tap a result',outcomes)}
 </div>
 <div class="cgrid3">
  ${ZC.ccard(bigL.a?`Most leave ${AFTER[bigL.k]}`:'Where sales leak','% of conversations',leak)}
  ${ZC.ccard(byR[0]?`${esc(REASONS[byR[0].k].label)} costs the most`:'Why customers did not buy','Value not closed',reasons)}
  ${ZC.ccard(obT?`Resolves ${obR} of ${obT} objections`:'Objections','Tap for coaching',objections)}
 </div>
 <div class="agrid">
  ${ZC.ccard(bestP&&bestP.a>bestP.b?`Best with ${esc(lc(PER[bestP.k].label))} customers`:'Conversion by customer type','% bought · conversations',persona,'a5')}
  ${ZC.ccard(rangeDays()===1?`${plural(s.n,'conversation')} ${periodTxt()}, by hour`:`${(s.n/rangeDays()).toFixed(1)} conversations a day`,periodTxt(),act,'a7')}
 </div>`}

function repConvs(id,row){const f=S.rcf||{};
 const list=sortConvs(row.L.filter(c=>(!f.outcome||c.outcome===f.outcome)&&(!f.reason||c.reason===f.reason)&&(f.stage===undefined||(c.outcome!=='sold'&&c.stage===+f.stage))&&(!f.persona||c.persona===f.persona)));
 const lab={outcome:v=>'Result: '+({sold:'Sold',followup:'Will return',lost:'Did not buy'}[v]),reason:v=>REASONS[v].label,stage:v=>'Left: '+lc(LEFT[v]),persona:v=>PER[v].label};
 const keys=Object.keys(f).filter(k=>lab[k]);
 const pages=Math.max(1,Math.ceil(list.length/PAGE));S.page=clamp(S.page,0,pages-1);const from=S.page*PAGE;
 return `<section class="card clistc"><div class="filters"><div class="activechips" style="flex:1">${keys.length?keys.map(k=>`<button class="achip" data-act="rcf-x" data-k="${k}">${esc(lab[k](f[k]))}${ic('x',14)}</button>`).join(''):`<span class="hint">${plural(list.length,'conversation')} ${inTxt()}. Tap one for the summary.</span>`}</div>
  <select data-rcf="outcome" aria-label="Result"><option value="">All results</option>${[['sold','Sold'],['followup','Will return'],['lost','Did not buy']].map(o=>`<option value="${o[0]}" ${f.outcome===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>
  <select data-sort aria-label="Sort by">${[['date','Newest first'],['value','Highest value'],['score','Lowest score'],['scorehi','Highest score']].map(o=>`<option value="${o[0]}" ${S.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
 <div class="clist" style="margin-top:8px">${list.length?list.slice(from,from+PAGE).map(c=>convRow(c,true)).join(''):`<div style="padding:28px 8px;text-align:center"><b>No conversations match</b><p class="hint">Remove a filter to see more.</p></div>`}</div>
 ${list.length>PAGE?`<div class="pager"><span class="hint num">${from+1} to ${Math.min(from+PAGE,list.length)} of ${list.length}</span><div class="btnrow"><button class="btn sm" data-act="page" data-v="-1" ${S.page===0?'disabled':''}>${ic('left',14)}Previous</button><button class="btn sm" data-act="page" data-v="1" ${S.page>=pages-1?'disabled':''}>Next${ic('right',14)}</button></div></div>`:''}</section>`}

/* ---------- Conversations ---------- */
function convRow(c,own){const p=PRODUCTS[c.product];
 return `<button class="crow dense" data-conv="${c.id}">${ring(c.score,30)}<strong>${esc(c.customer)}</strong><small>${esc(p.label)} · ${esc(PER[c.persona].label)}${own?'':' · '+c.dur+' min'}</small><span class="c-rep">${own?c.dur+' min':repLink(c.rep,REP[c.rep].name)}</span><span class="c-val num">${inr(c.value)}</span><span>${outcomePill(c)}</span><span class="d num">${when(c)}</span></button>`}
function cfLabel(k,v){return {rep:()=>'Rep: '+REP[v].first,outcome:()=>'Result: '+({sold:'Sold',followup:'Will return',lost:'Did not buy'}[v]),persona:()=>PER[v].label,product:()=>PRODUCTS[v].label,reason:()=>REASONS[v].label,stage:()=>'Left after: '+STAGES[v],comp:()=>'Mentioned '+COMP[v].label,kw:()=>'Said "'+v+'"',day:()=>'On '+fdate(new Date(TODAY.getTime()-v*DAY)),hour:()=>'At '+((+v%12)||12)+(+v<12?' am':' pm')}[k]()}
function filtered(skipDay){const f=S.cf,q=(f.q||'').toLowerCase().trim();
 return cur().filter(c=>(skipDay||((f.day===undefined||c.d===+f.day)&&(f.hour===undefined||c.at.getHours()===+f.hour)))&&(!f.rep||c.rep===f.rep)&&(!f.outcome||c.outcome===f.outcome)&&(!f.persona||c.persona===f.persona)&&(!f.product||c.product===f.product)&&(!f.reason||c.reason===f.reason)&&(f.stage===undefined||f.stage===''||(c.stage===+f.stage&&c.outcome!=='sold'))&&(!f.comp||c.competitor===f.comp)&&(!f.kw||c.kw.includes(f.kw))&&
  (!q||c.customer.toLowerCase().includes(q)||REP[c.rep].name.toLowerCase().includes(q)||PRODUCTS[c.product].label.toLowerCase().includes(q)||(c.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))))}
const PAGE=50;
function sortConvs(list){const k=S.sort;return k==='value'?[...list].sort((a,b)=>b.value-a.value):k==='score'?[...list].sort((a,b)=>a.score-b.score):k==='scorehi'?[...list].sort((a,b)=>b.score-a.score):list}
function convAnalytics(list){
 const n=list.length,by=o=>list.filter(c=>c.outcome===o),so=by('sold'),fu=by('followup'),lo=by('lost'),af=o=>`data-addf='${JSON.stringify(o)}'`;
 const split=ZC.splitBar([{name:'Sold',n:so.length,color:ZC.OUTCOME.sold,sub:inr(sumv(so)),attr:af({outcome:'sold'})},{name:'Will return',n:fu.length,color:ZC.OUTCOME.followup,sub:inr(sumv(fu)),attr:af({outcome:'followup'})},{name:'Did not buy',n:lo.length,color:ZC.OUTCOME.lost,sub:inr(sumv(lo)),attr:af({outcome:'lost'})}]);
 const dl=(S.cf.day!==undefined||S.cf.hour!==undefined)?filtered(true):list,TB=timeBuckets(dl,af);
 const time=ZC.columns({data:TB.data,h:128,every:TB.every,groups:[{key:'sold',name:'Sold',color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:'Did not buy',color:ZC.OUTCOME.lost}],aria:'Conversations per day, split by result'});
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
 const active=['day','hour','persona','product','reason','stage','comp','kw'].filter(k=>S.cf[k]!==undefined&&S.cf[k]!=='');
 const sel=(k,opts,ph)=>`<select id="f-${k}" data-cf="${k}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(o=>`<option value="${o[0]}" ${S.cf[k]===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
 const pages=Math.max(1,Math.ceil(list.length/PAGE));S.page=clamp(S.page,0,pages-1);const from=S.page*PAGE,shown=list.slice(from,from+PAGE);
 return phead('Conversations',`${list.length} of ${tot} conversations ${inTxt()}. Charts and list follow the same filters.`)+
 `<details class="xband" data-xk="conv-analytics" ${ZC.isOpen('conv-analytics',true)?'open':''}><summary><span class="mono">Analytics</span><span class="x-s">${list.length?`${pct(list.filter(c=>c.outcome==='sold').length/list.length)} bought · ${inr(sumv(list))} discussed`:''}</span>${ic('chev',16)}</summary>${convAnalytics(list)}</details>
 ${S.cf.rep&&REP[S.cf.rep]?(()=>{const r=REP[S.cf.rep],rs=stats(cur().filter(c=>c.rep===r.id)),st=stats(cur());return `<div class="card cstrip">${ring(rs.score,40)}<div class="grow"><b>${esc(r.name)}</b><span class="hint num">Score ${rs.score} (store ${st.score}) · closes ${pct(rs.conv)} (store ${pct(st.conv)}) · ${plural(rs.n,'conversation')}</span></div><button class="btn sm" data-go="#rep-${r.id}">Open profile${ic('right',14)}</button><button class="btn sm" data-go="#rep-${r.id}/coaching">Coaching plan</button></div>`})():''}
 <section class="card clistc"><div class="filters stick"><input id="f-q" data-cf="q" type="search" placeholder="Customer, phone, rep or product" value="${esc(S.cf.q||'')}">${sel('rep',REPS.map(r=>[r.id,r.name]),'All reps')}${sel('outcome',[['sold','Sold'],['followup','Will return'],['lost','Did not buy']],'All results')}<select data-sort aria-label="Sort by">${[['date','Newest first'],['value','Highest value'],['score','Lowest score'],['scorehi','Highest score']].map(o=>`<option value="${o[0]}" ${S.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
 ${active.length?`<div class="activechips" style="margin-top:12px">${active.map(k=>`<button class="achip" data-act="unfilter" data-k="${k}">${esc(cfLabel(k,S.cf[k]))}${ic('x',14)}</button>`).join('')}<button class="link" data-act="clearf">Clear all</button></div>`:''}
 <div class="clist" style="margin-top:8px">${list.length?shown.map(c=>convRow(c)).join(''):`<div style="padding:32px 8px;text-align:center"><b>No conversations match these filters</b><p class="hint">Try the 30-day range or remove a filter.</p><button class="btn sm" data-act="clearf">Clear filters</button></div>`}</div>
 ${list.length>PAGE?`<div class="pager"><span class="hint num">${from+1} to ${Math.min(from+PAGE,list.length)} of ${list.length}</span><div class="btnrow"><button class="btn sm" data-act="page" data-v="-1" ${S.page===0?'disabled':''}>${ic('left',14)}Previous</button><button class="btn sm" data-act="page" data-v="1" ${S.page>=pages-1?'disabled':''}>Next${ic('right',14)}</button></div></div>`:''}</section>`}

/* ---------- Drawer ---------- */
function summaryFor(c){const b=summaryBase(c),s=c.sum||{};return {wanted:s.wanted||b.wanted,happened:s.happened||b.happened,why:s.why||b.why,next:s.next||b.next}}
function summaryBase(c){const rep=REP[c.rep],prod=PRODUCTS[c.product],R0=c.reason&&REASONS[c.reason];
 const due=c.due;
 return {wanted:`${PER[c.persona].label}. Looking at ${lc(prod.label)}, around ${inr(c.value)}.`,
  happened:c.outcome==='sold'?`${rep.first} showed ${lc(prod.label)} options and closed the sale.`:c.reason==='stock'?'The customer wanted something we did not have in stock.':`Got as far as "${STAGES[c.stage].toLowerCase()}". The customer left: ${R0.label.toLowerCase()}.`,
  why:c.outcome==='sold'?soldWhy(c):R0.skill?(c.skills[R0.skill]<60?`Weak step: ${SK[R0.skill].label.toLowerCase()} (scored ${c.skills[R0.skill]}).`:`${SK[R0.skill].label} scored ${c.skills[R0.skill]}, so this was not a skill gap. See the AI notes.`):(c.reason==='stock'?'Stock gap, not a rep issue.':'Not tied to a specific rep skill.'),
  next:c.outcome==='sold'?'No action needed. Invite them for the next occasion.':c.outcome==='followup'?`Call back by ${fdate(due)}.${c.phone?'':' No phone saved.'}`:(c.phone?'Share new designs on WhatsApp in 2 weeks.':'No phone saved. Remind the team to save numbers.')}}
function soldWhy(c){const good=[],miss=[];[['need','asked the occasion'],['budget','asked the budget'],['close','agreed a next step']].forEach(([k,t])=>(c.skills[k]>=60?good:miss).push(t));
 return good.length===3?'Asked the occasion and budget early, and agreed a next step.':good.length?`${REP[c.rep].first} ${good.join(' and ')}. Missed: ${miss.join(', ')}.`:`The customer came in decided. The occasion and budget were never asked, so this is a lucky sale, not a repeatable one.`}
function momentsFor(c){const rep=REP[c.rep],m=[],seen=new Set();
 /* only things the data really says: no invented timeline, no canned lines */
 const add=x=>{const k=(x.hi||x.note||'').toLowerCase();if(k&&seen.has(k))return;if(k)seen.add(k);m.push(x)};
 if(c.objection&&c.objQuote&&REASONS[c.objection])add({k:'key',label:REASONS[c.objection].label,hi:c.objQuote,en:c.objQuoteEn||'',by:'Customer'});
 if(c.cq&&c.outcome!=='sold'&&REASONS[c.reason])add({k:'key',label:REASONS[c.reason].label,hi:c.cq,en:c.cqEn||'',by:'Customer'});
 if(c.reply)add({k:c.objResolved===true?'good':c.objResolved===false?'miss':'key',label:'How '+rep.first+' answered',hi:c.reply,en:c.replyEn||'',by:rep.first});
 if(c.competitor&&COMP[c.competitor])add({k:'key',label:'Mentioned '+COMP[c.competitor].label,note:COMP[c.competitor].offer||'Compared with another store.',by:'Customer'});
 return m}
const checksCard=c=>{if(!c.aiChecks||!c.aiChecks.length)return '';const met=c.aiChecks.filter(x=>x.ok).length;
 return ZC.xcard('ck-'+c.id,'Skill checks',`${met} of ${c.aiChecks.length} met`,c.aiChecks.map(x=>`<div class="chk"><span class="pill ${x.ok?'good':'bad'}">${x.ok?'Met':'Missed'}</span><div>${esc(x.label)}${x.why?`<small>${esc(x.why)}</small>`:''}</div></div>`).join(''),{open:false,cls:'ckcard'})};
const TCHUNK=80;
const jumpBtn=(c,q)=>c.turns&&q?`<button class="tjump" data-act="tjump" data-q="${esc(q.slice(0,60))}">Find in transcript</button>`:'';
const transcriptCard=c=>{if(!c.transcript)return '';const w=c.transcript.split(/\s+/).length;
 if(!c.turns)return ZC.xcard('tx-'+c.id,'Transcript',`${w} words`,`<pre class="tscript">${esc(c.transcript)}</pre><p class="tsnote">Audio and the timeline are coming soon.</p>`,{open:false,cls:'txcard'});
 const repNames=new Set(REPS.map(r=>r.first)),n=c.turns.length;
 return ZC.xcard('tx-'+c.id,'Transcript',`${n} turns · ${w} words${c.talkRep!=null?' · rep spoke '+c.talkRep+'%':''}`,
  `<input class="tsearch" type="search" placeholder="Search this conversation" data-tsearch aria-label="Search this conversation">
   <div class="turns" data-turns>${c.turns.map((t,i)=>`<div class="turn ${repNames.has(t.who)||t.who==='Staff'?'rep':''}" ${i>=TCHUNK?'hidden':''}><time>${mmss(t.t)}</time><div><b>${esc(t.who)}</b>${esc(t.text)}</div></div>`).join('')}</div>
   ${n>TCHUNK?`<button class="link" data-act="tmore" style="margin-top:8px">Show more of the conversation</button>`:''}<p class="tsnote" data-tcount>${n>TCHUNK?`Showing the first ${TCHUNK} of ${n} turns. `:''}Audio is coming soon.</p>`,{open:false,cls:'txcard'})};
function tMore(){const hid=[...document.querySelectorAll('.drawer .turn[hidden]')];hid.slice(0,TCHUNK).forEach(e=>e.hidden=false);const left=hid.length-TCHUNK,b=document.querySelector('.drawer [data-act="tmore"]'),n=document.querySelector('.drawer [data-tcount]');
 if(left<=0&&b)b.remove();if(n)n.textContent=(left>0?`${left} more turns below. `:'')+'Audio is coming soon.'}
function tSearch(q){q=q.trim().toLowerCase();const T=[...document.querySelectorAll('.drawer .turn')];let hits=0;
 T.forEach((e,i)=>{e.classList.remove('hit');if(!q){e.hidden=i>=TCHUNK;return}const ok=e.textContent.toLowerCase().includes(q);e.hidden=!ok;if(ok)hits++});
 const n=document.querySelector('.drawer [data-tcount]');if(n)n.textContent=q?`${hits} of ${T.length} turns mention "${q}".`:'Audio is coming soon.';const b=document.querySelector('.drawer [data-act="tmore"]');if(b)b.hidden=!!q}
function tJump(q){const d=document.querySelector('.drawer details.txcard');if(!d)return;d.open=true;const key=q.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim().slice(0,28);
 const T=[...d.querySelectorAll('.turn')],norm=e=>e.textContent.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ');const el=T.find(e=>key&&norm(e).includes(key));
 if(!el){toast('That line was not found word for word in the transcript.');return}
 T.forEach(e=>{e.classList.remove('hit')});const i=T.indexOf(el);T.forEach((e,k)=>{if(k<=i+3)e.hidden=false});el.classList.add('hit');el.scrollIntoView({block:'center',behavior:'smooth'})}
const aiCard=c=>{if(!(c.aiCoach.length||c.aiPromises.length||c.aiNext||c.aiNotes.length))return '';
 const tip=t=>{const i=t.indexOf(': ');return i>0?`<b>${esc(t.slice(0,i))}</b> <span>${esc(t.slice(i+2))}</span>`:`<b>${esc(t)}</b>`};
 const body=(c.aiCoach.length?`<div class="aihead">Coaching tips</div>${c.aiCoach.map((t,i)=>`<div class="aitip">${tip(t)}${i===0&&c.aiQuote?`<div class="quote key"><div class="hi">"${esc(c.aiQuote)}"</div><div class="by">Line the AI points to</div>${jumpBtn(c,c.aiQuote)}</div>`:''}</div>`).join('')}`:'')+
  (c.aiPromises.length?`<div class="aihead">Promised in the conversation</div>${c.aiPromises.map(t=>`<div class="aitip">${esc(t)}</div>`).join('')}`:'')+
  (c.aiNext?`<div class="aihead">Suggested next step</div><div class="aitip"><b>${esc(c.aiNext)}</b></div>`:'')+
  (c.aiNotes.length?`<div class="aihead">Notes</div>${c.aiNotes.map(t=>`<div class="aitip">${esc(t)}</div>`).join('')}`:'');
 const n=c.aiCoach.length;
 return ZC.xcard('ai-'+c.id,'What the AI said',(n?n+' coaching tip'+(n>1?'s':''):'Notes')+(c.aiPromises.length?' · '+c.aiPromises.length+' promise'+(c.aiPromises.length>1?'s':''):''),body,{open:true,cls:'aicard'})};
function openDrawer(id){S.drawer=+id;drawDrawer()}
function closeDrawer(){S.drawer=null;document.getElementById('drawerRoot').innerHTML=''}
function drawDrawer(){const c=CONV[S.drawer];if(!c)return;const rep=REP[c.rep],sm=summaryFor(c),ms=momentsFor(c);
 document.getElementById('drawerRoot').innerHTML=`<div class="drawer-scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Conversation with ${esc(c.customer)}"><span class="grab" aria-hidden="true"></span>
 <div class="dhead">${ring(c.score,46)}<div style="flex:1;min-width:0"><h2>${esc(c.customer)} ${outcomePill(c)}</h2><p>${repLink(rep.id,rep.name)} · ${when(c)} · ${c.dur} min${c.talkRep!=null?` · ${esc(rep.first)} spoke ${c.talkRep}%`:''}${c.phone?' · '+c.phone:''}</p></div><button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
 <div class="dbody">
  <section class="card"><span class="eyebrow">In 30 seconds</span><dl class="sumgrid" style="margin:10px 0 0"><dt>Wanted</dt><dd>${esc(sm.wanted)}</dd><dt>What happened</dt><dd>${esc(sm.happened)}</dd><dt>${c.outcome==='sold'?'Why it worked':'Why not closed'}</dt><dd>${esc(sm.why)}</dd><dt>Next step</dt><dd><b>${esc(sm.next)}</b></dd></dl></section>
  ${aiCard(c)}
  ${checksCard(c)}
  ${transcriptCard(c)}
  <div class="card soon"><span class="eyebrow">Recording and transcript timeline</span><p>Coming soon. For now this panel shows the numbers and what the AI wrote about the conversation.</p></div>
  <section class="card"><span class="eyebrow">What was said</span><div style="margin-top:6px">${ms.length?ms.map(m=>`<div class="moment"><span class="lbl">${esc(m.label)} <span class="pill ${m.by==='Customer'?'gold':m.k==='good'?'good':m.k==='miss'?'bad':'neutral'}">${m.by==='Customer'?'Customer':esc(m.by)}</span></span>${m.hi?`<div class="quote ${m.k==='key'?'key':m.k==='miss'?'bad':''}"><div class="hi">"${esc(m.hi)}"</div>${m.en&&m.en!==m.hi?`<div class="en">${esc(m.en)}</div>`:''}${jumpBtn(c,m.hi)}</div>`:`<div class="note">${esc(m.note||'')}</div>`}</div>`).join(''):'<p class="hint" style="margin:0">No quotes captured for this conversation.</p>'}</div></section>
  <section class="card"><span class="eyebrow">Where this sits</span>${(()=>{const ra=stats(cur().filter(x=>x.rep===c.rep)).score||c.score,sa=stats(cur()).score||c.score;return `<div class="bar cmp"><i style="width:${c.score}%;background:${scoreCol(c.score)}"></i><span class="tick" style="left:${ra}%"></span><span class="tick st" style="left:${sa}%"></span></div><p class="hint num" style="margin:0">This conversation <b style="color:var(--ink)">${c.score}</b> · ${esc(rep.first)}'s average ${ra} · store ${sa}</p>`})()}
   <div class="btnrow" style="margin-top:10px"><button class="btn primary sm" data-go="#rep-${rep.id}">${esc(rep.first)}'s profile${ic('right',14)}</button><button class="btn sm" data-go="#rep-${rep.id}/coaching">Coaching plan</button>${c.reason?`<button class="btn sm" data-filter='${JSON.stringify({rep:c.rep,reason:c.reason})}'>More like this</button>`:''}</div></section>
 </div></aside>`;
 const cl=document.querySelector('.drawer [data-act="close"].iconbtn');if(cl)cl.focus();}

/* ---------- Follow-ups ---------- */
const DONE=new Set(CONVS.filter(c=>c.fuDone).map(c=>c.id));
function followups(){const start=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()).getTime();
 return CONVS.filter(c=>c.outcome==='followup'&&c.d<=4&&!DONE.has(c.id)).map(c=>{const due=c.due;const dd=new Date(due.getFullYear(),due.getMonth(),due.getDate()).getTime();
  return {c,due,status:dd<start?'overdue':dd===start?'today':'later'}}).sort((a,b)=>({overdue:0,today:1,later:2}[a.status]-{overdue:0,today:1,later:2}[b.status])||b.c.value-a.c.value)}
function draftFor(c){const name=c.customer.split(' ')[0];return `Hi ${name}, this is ${REP[c.rep].first} from ${ZD.store}. The ${lc(PRODUCTS[c.product].label)} you liked is on hold for you. Would you like to visit this week? I can also send photos on WhatsApp.`}
function renderFollowups(){const all=followups();const grp={overdue:[],today:[],later:[]};all.forEach(f=>grp[f.status].push(f));
 const sect=(k,title,cls)=>grp[k].length?`<div class="fucol"><div class="section-t"><h2>${title}</h2><span class="pill ${cls} num">${grp[k].length} · ${inr(sumv(grp[k].map(f=>f.c)))}</span></div><section class="card">${grp[k].map(f=>{const c=f.c;return `<div class="fu"><div><h3>${esc(c.customer)} <span class="pill gold num">${inr(c.value)}</span></h3><div class="meta"><span>${PRODUCTS[c.product].label} · ${REASONS[c.reason].label.toLowerCase()}</span><span>Rep: ${repLink(c.rep,REP[c.rep].name)} · visited ${fdate(c.at)}</span><span>${c.phone?`Phone: <span class="phone">${c.phone}</span>`:'<span style="color:var(--bad)">No phone saved</span>'}</span></div><button class="link" style="margin-top:6px" data-conv="${c.id}">See the conversation${ic('right',14)}</button></div>
  <div><div class="draft">${esc(draftFor(c))}</div><div class="btnrow"><button class="btn primary sm" data-act="copy" data-text="${esc(draftFor(c))}">${ic('copy',14)}Copy message</button><button class="btn sm" data-act="done" data-id="${c.id}">${ic('check',14)}Mark called</button></div></div></div>`}).join('')}</section></div>`:'';
 return phead('Follow-ups',`Customers who said they would come back, from the last 5 days. Zocus drafts the message; your team sends it.`)+
 (all.length?'<div class="fugrid">'+sect('overdue','Overdue','bad')+sect('today','Due today','warn')+sect('later','Coming up','neutral')+'</div>':`<section class="card" style="text-align:center;padding:40px"><b>All caught up</b><p class="hint">New follow-ups appear when a customer says they will return.</p></section>`)}

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
 if(!sItems.length){box.innerHTML=`<div class="empty">Nothing found for "${esc(q)}". Try a rep name, a customer or a product.</div>`;return}
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
 {sel:'[data-tour="nav-coaching"]',title:'A coaching plan per rep',body:'Built from where each rep scores low and how your best reps answer the same customers. Includes practice drills from real conversations.'},
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
 return {pulse(){energy=Math.min(energy+.8,1.2)}}})();

const C=ZocusCoach({inTxt,baseTxt,S,REPS,REP,SKILLS,SK,REASONS,COACH,CONVS,BEST,ZD,esc,ic,ring,inr,pct,plural,fdate,sumv,cur,prev,stats,repRows,periodTxt,phead,render:()=>render(),toast,Q,scoreCol,groupBy});
/* ---------- Render & events ---------- */
function emptyFor(rt){const none=!cur().length;
 const card=(t,b)=>phead(NAV.find(n=>n[0]===rt)[1],`${rangeDays()===1?'Only one day is selected.':'Nothing to show.'}`)+`<section class="card" style="text-align:center;padding:44px 20px"><b style="font-size:17px">${t}</b><p class="hint" style="margin:8px 0 16px">${b}</p><div class="btnrow" style="justify-content:center">${ZD.spanDays<3?(LIVE()&&S.block!=null?'<button class="btn primary sm" data-act="block" data-v="">Show all day</button>':''):'<button class="btn primary sm" data-act="period" data-v="30">Show last 30 days</button><button class="btn sm" data-act="period" data-v="7">Show last 7 days</button>'}</div></section>`;
 if(['insights','team','coaching'].includes(rt)&&none)return card('No conversations recorded '+inTxt(),ZD.spanDays<3?'Nothing was recorded in this part of the day.':'Pick a longer range to see charts and coaching.');
 if(rt==='insights'&&S.tab==='drop'&&!cur().some(c=>c.outcome!=='sold'))return card('Everyone who came in bought '+inTxt(),'There are no lost sales to explain. Try a longer range.');
 return ''}
function fitHome(){const pg=document.getElementById('page');if(!pg||pg.dataset.route!=='home')return;pg.classList.remove('tight','tighter');if(LIVE())return;
 if(matchMedia('(max-width:860px)').matches)return;const over=()=>document.documentElement.scrollHeight>innerHeight+1;
 if(!over())return;pg.classList.add('tight');if(!over())return;pg.classList.add('tighter')}
window.addEventListener('resize',()=>{clearTimeout(fitHome.t);fitHome.t=setTimeout(fitHome,120)});
function render(){ZM.flip(renderNow)}
function renderNow(){document.title=(ZD.store||'Zocus')+' · Zocus AI';const rt=routeName();renderNav();const pg=document.getElementById('page');pg.dataset.route=rt.startsWith('rep-')?'rep':rt;
 pg.innerHTML=liveStrip()+(emptyFor(rt)||(rt==='home'?renderHome():rt==='insights'?renderInsights():rt==='team'?renderTeam():rt==='conversations'?renderConversations():rt==='followups'?renderFollowups():rt==='coaching'?C.renderHub():renderRep(rt.slice(4))));fitHome()}
function applyFilter(f){S.cf={...f};S.page=0;closeDrawer();if(routeName()!=='conversations')location.hash='conversations';else{render();scrollTo(0,0)}}
function toast(t){const r=document.getElementById('toastRoot');r.innerHTML=`<div class="toast" role="status">${t}</div>`;clearTimeout(toast.t);toast.t=setTimeout(()=>r.innerHTML='',1800)}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied')}catch(e){toast('Copy is blocked here. Select the text instead.')}}
const ridx=r=>{const k=r.startsWith('rep-')?S.from:r,i=NAV.findIndex(n=>n[0]===k);return (i<0?0:i)+(r.startsWith('rep-')?.5:0)};
let lastRoute=routeName();
window.addEventListener('hashchange',()=>{closeDrawer();const rt=routeName(),changed=rt!==lastRoute,o=ridx(lastRoute);
 if(changed&&rt.startsWith('rep-')){if(!lastRoute.startsWith('rep-'))S.from=lastRoute;if(S.rcfFor!==rt)S.rcf={};S.page=0}
 lastRoute=rt;
 const dir=ridx(rt)-o>0?'r':ridx(rt)-o<0?'l':'u';
 if(changed)ZM.page(()=>{render();scrollTo(0,0)},dir);else{render();ZM.enter(document.querySelector('.rbody'))}});
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act],[data-go],[data-conv],[data-filter],[data-addf],[data-rf],[data-si]');if(!t)return;
 if(t.dataset.rf){e.preventDefault();const r=parseRep();if(!r)return;S.rcf=JSON.parse(t.dataset.rf);S.rcfFor='rep-'+r.id;S.page=0;const h='#rep-'+r.id+'/conversations';if(location.hash===h){render();ZM.enter(document.querySelector('.rbody'))}else location.hash=h;return}
 if(t.dataset.addf){S.cf={...S.cf,...JSON.parse(t.dataset.addf)};S.page=0;render();ZM.soft('.clist');return}
 if(t.dataset.si!==undefined){chooseResult(+t.dataset.si);return}
 if(t.dataset.filter){applyFilter(JSON.parse(t.dataset.filter));return}
 if(t.dataset.conv){openDrawer(t.dataset.conv);return}
 if(t.dataset.go){e.preventDefault();if(t.dataset.tab)S.tab=t.dataset.tab;closeDrawer();if(location.hash===t.dataset.go)render();else location.hash=t.dataset.go;return}
 const a=t.dataset.act;
 if(a==='period'){setPeriod(t.dataset.v)}
 else if(a==='tmore'){tMore()}
 else if(a==='tjump'){tJump(t.dataset.q)}
 else if(a==='block'){setBlock(t.dataset.v===''?null:+t.dataset.v)}
 else if(a==='tab'){S.tab=t.dataset.v;render();ZM.enter(document.getElementById('itabs'))}
 else if(a==='showall'){S.showAll[t.dataset.k]=!S.showAll[t.dataset.k];render()}
 else if(a==='unfilter'){delete S.cf[t.dataset.k];render()}
 else if(a==='clearf'){S.cf={};render()}
 else if(a==='page'){S.page+=+t.dataset.v;render();const el=document.querySelector('.clistc');if(el)el.scrollIntoView({block:'start'})}
 else if(a==='ctype'){S.ctype=t.dataset.v;render();ZM.soft('.a4 .bl')}
 else if(a==='rcf-x'){delete S.rcf[t.dataset.k];S.page=0;render();ZM.soft('.clist')}
 else if(a==='xall'){ZC.setAll(t.dataset.v==='1')}
 else if(a==='copy'){copy(t.dataset.text);if(t.classList.contains('btn')&&!t.dataset.busy){t.dataset.busy='1';const o=t.innerHTML;t.innerHTML=ic('check',14)+'Copied';t.classList.add('ok');setTimeout(()=>{t.innerHTML=o;t.classList.remove('ok');delete t.dataset.busy},1400)}}
 else if(a==='done'){DONE.add(+t.dataset.id);const row=t.closest('.fu');const go=()=>{render();toast('Marked as called')};if(row&&row.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const h=row.offsetHeight;row.style.overflow='hidden';row.animate([{height:h+'px',opacity:1,transform:'none'},{height:'0px',opacity:0,transform:'translateX(24px)',paddingTop:'0px',paddingBottom:'0px'}],{duration:280,easing:'ease-in',fill:'forwards'}).onfinish=go}else go()}
 else if(a==='close'){closeDrawer()}

 else if(a==='palopen'){openPal()}
 else if(a==='palclose'){closePal()}
 else if(a==='suggest'){const q=document.getElementById('q');q.value=t.dataset.v;sIdx=0;drawResults();q.focus()}
 else if(a==='tour'){startTour()}
 else if(a&&a.indexOf('coach')===0){C.act(a,t)}
 else if(a==='tnext'){if(tourI>=TOUR.length-1)endTour();else{tourI++;showStep()}}
 else if(a==='tback'){tourI=Math.max(0,tourI-1);showStep()}
 else if(a==='tskip'){endTour()}
});
document.addEventListener('change',e=>{if(e.target.dataset.rangesel!==undefined){setPeriod(e.target.value);return}
 if(e.target.dataset.repsel!==undefined){const r=parseRep();location.hash='#rep-'+e.target.value+(r&&r.tab!=='overview'?'/'+r.tab:'');return}
 if(e.target.dataset.rcf){if(e.target.value)S.rcf[e.target.dataset.rcf]=e.target.value;else delete S.rcf[e.target.dataset.rcf];S.page=0;render();ZM.soft('.clist');return}
 if(e.target.dataset.sort!==undefined){S.sort=e.target.value;S.page=0;render();return}const k=e.target.dataset.cf;if(k&&k!=='q'){S.cf[k]=e.target.value;if(!e.target.value)delete S.cf[k];S.page=0;render()}});
document.addEventListener('input',e=>{if(e.target.dataset.tsearch!==undefined){tSearch(e.target.value);return}if(e.target.id==='q'){sIdx=0;drawResults()}else if(e.target.dataset.cf==='q'){S.cf.q=e.target.value;S.page=0;const pos=e.target.selectionStart;render();const i=document.getElementById('f-q');if(i){i.focus();i.setSelectionRange(pos,pos)}}});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('rlink')){e.preventDefault();e.target.click();return}
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
(window.ZSplash?ZSplash.start:Promise.resolve()).then(()=>ZM.enter(document.getElementById('page')));
(window.ZSplash?ZSplash.done:Promise.resolve()).then(()=>{if(!seen)setTimeout(startTour,300)});
})();
