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
REASONS.exchange={label:'Exchange value too low',stage:3,skill:'objection',hi:'',en:''};
/* ---------- Wording per business type. A car showroom books cars, test-drives them and quotes an on-road price. Labels only; numbers are untouched. ---------- */
const CAR=ZD.vertical==='car';
const Wd=CAR?{sold:'Booked',lost:'Did not book',soldLc:'booked',lostLc:'did not book',bought:'booked',store:'showroom',Store:'Showroom',conv:'Booking conversion',closed:'Bookings won',tagged:'Tagged as booked',sale:'booking',sales:'bookings',avgSale:'Avg booking',noBuy:'Why they did not book',product:'Model',pitchShort:'Model shown',afterShown:'after the options were shown',leftShown:'After options shown',sell:'book'}:
 {sold:'Sold',lost:'Did not buy',soldLc:'sold',lostLc:'did not buy',bought:'bought',store:'store',Store:'Store',conv:'Sale conversion',closed:'Sales closed',tagged:'Tagged as sold',sale:'sale',sales:'sales',avgSale:'Avg sale',noBuy:'Why they did not buy',product:'Product',pitchShort:'Product',afterShown:'after the product was shown',leftShown:'After product shown',sell:'sell'};
/* Suggested lines for a car showroom, used only when the day has no good real answer to show. Always labelled as a playbook line, never as a rep's words. */
const PLAYBOOK=CAR?{
 making:{hi:'Main exchange bonus aur corporate offer jod ke ek final on-road likh ke deta hoon.',en:'Let me write one final on-road price, with the exchange bonus and corporate offer netted off.'},
 exchange:{hi:'Aapki gaadi ka evaluation abhi 15 minute mein karwa deta hoon, saath mein exchange bonus bhi milega.',en:'I will get your car evaluated in 15 minutes, and you also get the exchange bonus.'},
 budget:{hi:'Down payment kitna rakhna chahenge? Uske hisaab se EMI abhi nikal deta hoon.',en:'How much would you like to put down? I will work out the EMI right now.'},
 competitor:{hi:'Zaroor compare kijiye. Saath mein safety rating, resale aur service network bhi dekhiye.',en:'Do compare. Also compare the safety rating, resale value and service network.'},
 family:{hi:'Sunday ko test drive gaadi ghar bhej deta hoon, family wahin chala ke dekh legi.',en:'I will send a test-drive car home on Sunday, so the family can drive it there.'},
 design:{hi:'Is baar aap khud chalaiye, main raaste mein ADAS aur baaki features dikhata hoon.',en:'This time you drive, and I will show you ADAS and the other features on the way.'},
 stock:{hi:'Doosra variant stock mein hai, chahein toh aaj hi test drive le lijiye.',en:'Another variant is in stock. You could take a test drive today.'},
 browse:{hi:'Gaadi kaun chalayega, aur roz kitna chalana hota hai?',en:'Who will drive the car, and how much do you drive each day?'}}:{};
if(CAR){
 SKILLS[2].label='Showing the right model';
 STAGES.splice(0,5,'Talked to a rep','Need understood','Options shown','Quotation given','Booked');
 const car={browse:['Just enquiring, need not found',0,'need'],stock:['Long waiting period for the variant',1,null],design:['Not convinced by the car shown',2,'pitch'],making:['On-road price too high',3,'objection'],budget:['Over budget, EMI not worked out',3,'budget'],competitor:['Comparing with another brand',3,'objection'],family:['Needs family approval',3,'close'],exchange:['Exchange value too low',3,'objection']};
 Object.entries(car).forEach(([k,v])=>{REASONS[k]=Object.assign(REASONS[k]||{hi:'',en:''},{label:v[0],stage:v[1],skill:v[2]})});
 Object.assign(COACH,{need:'Ask who will drive it, the daily running and the family size in the first 2 minutes, before walking to any car.',budget:'Ask the budget and down payment before quoting. Top reps ask it within the first 3 minutes.',pitch:'Show the model they came for, then one more that fits what they said, beyond the XUV 7XO and Scorpio. Lead with performance and safety; Mahindra buyers care less about mileage.',objection:'When the customer pushes on price, write one on-road quotation with the exchange and every offer netted off, and hand it over before they leave.',close:'Nobody leaves without a written on-road quotation and a date for the next call.'})}

REASONS.other={label:'No clear reason',stage:3,skill:null,hi:'',en:''};
ZD.customReasons.forEach(r=>{REASONS[r.code]={label:r.label,stage:r.stage,skill:null,hi:r.hi,en:r.en}});
const CONVS=ZD.CONVS;
const CONV=Object.fromEntries(CONVS.map(c=>[c.id,c]));
/* Best answer per objection: mined from the data (highest-scoring resolved reply); built-in lines are the fallback. */
function topRepFor(area){let best=null;REPS.forEach(r=>{const L=CONVS.filter(c=>c.rep===r.id);if(!L.length)return;const v=L.reduce((a,c)=>a+c.skills[area],0)/L.length;if(!best||v>best.v)best={id:r.id,v}});return best?best.id:REPS[0].id}
(function(){const builtin=Object.assign({},BEST);
 new Set(Object.keys(REASONS).concat(['competitor'])).forEach(k=>{
  const area=(REASONS[k]&&REASONS[k].skill)||'objection';
  const cand=CONVS.filter(c=>c.objection===k&&c.objResolved&&c.reply&&(ZD.isSample||c.skills[area]>=70)).sort((a,b)=>b.skills[area]-a.skills[area]||b.value-a.value)[0];
  if(cand){BEST[k]={rep:cand.rep,hi:cand.reply,en:cand.replyEn||cand.reply,real:true};return}
  const b=builtin[k];
  BEST[k]=b?{rep:topRepFor(area),hi:b.hi,en:b.en}:{rep:topRepFor(area),hi:'',en:'Ask the top rep how they handle this.'}})})();
const VERT={
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
function when(c){if(TL)return '#'+refNo(c)+' · '+fdate(c.at);if(SNAP)return RICH?tRange(c):ftime(c.at);if(c.d===0)return 'Today, '+ftime(c.at);if(c.d===1)return 'Yesterday, '+ftime(c.at);return fdate(c.at)+', '+ftime(c.at)}
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
function outcomePill(c,full){if(c.kind==='delivery')return `<span class="pill after">${esc(c.resultLabel||'Delivery issue')}</span>`;return c.outcome==='sold'?`<span class="pill good">${Wd.sold}${full&&RICH&&c.promises.some((p,i)=>!p.s&&!PDONE.has(c.id+':'+i))?' · follow-up open':''}</span>`:c.outcome==='followup'?'<span class="pill warn">Will return</span>':`<span class="pill bad">${Wd.lost}</span>`}
function delta(cur,prev,opt){opt=opt||{};let diff,txt;if(!hasBase())return '';
 if(opt.pts){diff=Math.round((cur-prev)*100);txt=Math.abs(diff)+(Math.abs(diff)===1?' pt':' pts')}else{if(!prev)return '<span class="delta flat">new</span>';diff=Math.round((cur-prev)/prev*100);txt=Math.abs(diff)+'%'}
 if(diff===0)return '<span class="delta flat">no change</span>';
 const good=opt.lowerBetter?diff<0:diff>0;
 return `<span class="delta ${good?'up':'down'}">${ic(diff>0?'up':'down',14)}${txt}</span>`}

/* ---------- State ---------- */
const RANGES={all:{days:Math.max(ZD.spanDays||1,1),lo:0,hi:Math.max(ZD.spanDays||1,1)-1,plo:-1,phi:-1},today:{days:1,lo:0,hi:0,plo:7,phi:7},yesterday:{days:1,lo:1,hi:1,plo:8,phi:8},'7':{days:7,lo:0,hi:6,plo:7,phi:13},'30':{days:30,lo:0,hi:29,plo:30,phi:59}};
const S={from:'team',rcf:{},rcfFor:null,period:'30',tab:'drop',showAll:{},cf:{},page:0,sort:'date',ctype:'persona',drawer:null,drawerAt:null};
const CF_KEYS=['rep','outcome','persona','product','reason','stage','comp','kw','jstage','quote','intent','mgroup','prio','fuel','avail','decision'];
/* ---------- Floor view (car pilot): what the dealer said matters. Quotation given is the real step, the test drive is a side fact;
   best sellers (XUV 7XO, Scorpio) vs the other models the dealer wants to move; how decided the customer is; availability. ---------- */
const FLOOR=CAR&&!!ZD.has.floor;
const MORE=(b,a)=>FLOOR?(b.n>a.n||(b.n===a.n&&b.v>a.v)):(b.v>a.v||(b.v===a.v&&b.n>a.n));
const MG={best:'Best sellers (XUV 7XO, Scorpio)',other:'Other Mahindra models',ev:'Electric',none:'Model not decided'};
const DEC={decided:'Decided on one model',choosing:'Choosing between 2 or 3',exploring:'Still exploring'};
const QT={yes:'Quotation given',promised:'Promised, not given',no:'No quotation'};
const mg=c=>c.mgroup||'none';
const share=(n,d)=>d?Math.round(n/d*100)+'%':'-';
function floorKpis(L){const n=L.length,hi=L.filter(c=>c.intent==='high').length,q=L.filter(c=>c.quote==='yes').length,pr=L.filter(c=>c.quote==='promised').length,b=L.filter(c=>c.outcome==='sold').length;
 return `${kpi({label:'Customers',tag:'Input',val:n,sub:`${mins(L.reduce((a,c)=>a+c.dur,0))} with customers`,delta:'',go:'#conversations'})}
  ${kpi({label:'High-intent customers',tag:'AI reading',val:hi,sub:`${share(hi,n)} of customers`,delta:'',filter:{intent:'high'}})}
  ${kpi({label:'Quotations given',tag:'Key step',val:q,sub:`${share(q,n)} of customers${pr?` · ${pr} promised, not given`:''} · ${b} booked`,delta:'',filter:{quote:'yes'}})}`}
function floorLede(L){const n=L.length;if(!n)return '';const q=L.filter(c=>c.quote==='yes').length,b=L.filter(c=>c.outcome==='sold').length,
 hiNo=L.filter(c=>c.intent==='high'&&c.quote!=='yes'&&c.outcome!=='sold').length,best=L.filter(c=>c.mgroup==='best').length,alt=L.filter(c=>c.mgroup==='best'&&c.models.length>1).length;
 return `<b>${q} of ${plural(n,'customer')} left with a quotation</b>, ${b} booked.${hiNo?` <b>${plural(hiNo,'high-intent customer')}</b> left without one: the actions below start there.`:''}${best?` ${best} came for the XUV 7XO or Scorpio; another model was shown to ${alt} of them.`:''}`}
function floorCards(L){if(!FLOOR||!L.length)return '';const n=L.length,cnt=f=>L.filter(f).length,af=o=>`data-filter='${JSON.stringify(o)}'`;
 const mix=ZC.barList(['best','other','ev','none'].map(k=>({k,v:cnt(c=>mg(c)===k)})).filter(x=>x.v).map(x=>({label:MG[x.k],value:x.v,text:`${x.v} · ${share(x.v,n)}`,attr:af({mgroup:x.k}),tip:`${MG[x.k]}|${plural(x.v,'customer')}`})),{max:n});
 const best=L.filter(c=>c.mgroup==='best'),alt=best.filter(c=>c.models.length>1).length;
 const pairs={};L.forEach(c=>{const m=[...new Set(c.models)].slice(0,3);for(let i=0;i<m.length;i++)for(let j=i+1;j<m.length;j++){const k=[m[i],m[j]].sort().join(' vs ');pairs[k]=(pairs[k]||0)+1}});
 const topPairs=Object.entries(pairs).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const prio={};L.forEach(c=>c.prio.forEach(p=>prio[p]=(prio[p]||0)+1));
 const care=ZC.barList(Object.entries(prio).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([k,v])=>({label:k,value:v,text:`${v} · ${share(v,n)}`,attr:af({prio:k}),tip:`${k}|Raised by ${plural(v,'customer')}`})),{max:n,empty:'Nothing captured yet.'});
 const fuel={};L.forEach(c=>(c.fuel.length?c.fuel:['Not said']).forEach(f=>fuel[f]=(fuel[f]||0)+1));
 const col={};L.forEach(c=>c.colour.forEach(x=>col[x]=(col[x]||0)+1));
 const av=L.filter(c=>c.avail),avB=av.filter(c=>c.outcome==='sold').length,td=L.filter(c=>c.td==='yes'),tdQ=td.filter(c=>c.quote==='yes').length;
 const facts=`<div class="ffacts">
   <div><span class="mono">Fuel asked for</span><div class="chips">${Object.entries(fuel).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<button class="chip" ${k==='Not said'?'':af({fuel:k})}>${esc(k)} <small class="num">${v}</small></button>`).join('')}</div></div>
   <div><span class="mono">Colours asked for</span><div class="chips">${Object.keys(col).length?Object.entries(col).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`<button class="chip">${esc(k.replace(/^./,x=>x.toUpperCase()))} <small class="num">${v}</small></button>`).join(''):'<span class="hint">None said aloud yet.</span>'}</div></div>
   <div><span class="mono">Availability came up</span><p><b class="num">${av.length}</b> of ${plural(n,'customer')}${av.length?` · ${avB} of them booked`:''}${av.length?` <button class="link" ${af({avail:'yes'})}>See them${ic('right',13)}</button>`:''}</p></div>
   <div><span class="mono">Test drive</span><p>Taken in <b class="num">${td.length}</b> of ${n}${td.length?`; a quotation followed in ${tdQ}`:''}. The quotation is the step that moves the sale.</p></div></div>`;
 return `<div class="cgrid3">
  ${ZC.ccard(best.length?`${share(best.length,n)} came for the best sellers`:'Model mix',best.length?`another model shown to ${alt} of ${best.length}`:'Tap to filter',mix+(topPairs.length?`<div class="cc-h" style="margin-top:10px"><h3>Compared most</h3></div>${topPairs.map(([k,v])=>`<p class="hint" style="margin:2px 0"><b style="color:var(--ink)">${esc(k)}</b> · ${v}</p>`).join('')}`:''))}
  ${ZC.ccard('What customers care about','Raised by the customer · tap to filter',care)}
  ${ZC.ccard('On the floor','Fuel, colour, availability, test drive',facts)}
 </div>`}
function floorActions(L){const acts=[],af=o=>o;
 const noQ=L.filter(c=>c.outcome!=='sold'&&c.quote!=='yes'&&c.intent!=='low').sort((a,b)=>(a.intent==='high'?0:1)-(b.intent==='high'?0:1));
 if(noQ.length){const hi=noQ.filter(c=>c.intent==='high').length,pr=noQ.filter(c=>c.quote==='promised').length;acts.push({impact:sumv(noQ),n:noQ.length,title:`Send the quotation to ${plural(noQ.length,'customer')} who left without one`,body:`${hi} ${hi===1?'was':'were'} high intent${pr?`, ${pr} ${pr===1?'was':'were'} promised one`:''}. A written on-road quotation is the step that moves a Mahindra sale.`,btn:'See them',filter:{quote:'no'}})}
 const one=L.filter(c=>c.mgroup==='best'&&c.models.length<2&&c.outcome!=='sold');
 if(one.length)acts.push({impact:sumv(one),n:one.length,title:`Show a second model to ${plural(one.length,'customer')} who saw only the XUV 7XO or Scorpio`,body:'The showroom wants to move its other models. These customers saw only a best seller and have not booked.',btn:'See them',filter:{mgroup:'best'}});
 const av=L.filter(c=>c.avail&&c.outcome!=='sold');
 if(av.length)acts.push({impact:sumv(av),n:av.length,title:`Give a delivery date to ${plural(av.length,'customer')} who asked about availability`,body:'Availability decides the sale. Call back with a firm date or an in-stock alternative.',btn:'See them',filter:{avail:'yes'}});
 return acts}
/* TL = real test calls recorded on random days. SNAP = one day shown as a single snapshot (the pilot).
   Both are FLAT: no time controls, no trends, no comparisons. */
const TL=!!ZD.timeless,SNAP=!!ZD.snapshot,RICH=SNAP&&!!(ZD.has&&ZD.has.times),FLAT=TL||SNAP,SP=(v,o)=>FLAT?'':ZC.spark(v,o);
try{const p=localStorage.getItem('zocus-period');if(RANGES[p]&&p!=='all')S.period=p}catch(e){}
if(FLAT||(ZD.storeId&&ZD.storeId!=='sample'&&ZD.spanDays>30))S.period='all';else if(ZD.spanDays<3)S.period='today';
const refNo=c=>String(c.ref).replace(/\D/g,'')||String(c.ref);
const R=()=>RANGES[S.period];
const ALL=()=>S.period==='all';
const allCur=()=>{const r=R();return CONVS.filter(c=>c.d>=r.lo&&c.d<=r.hi)};
const cur=()=>allCur().filter(c=>c.kind!=='delivery');
const DELV=()=>allCur().filter(c=>c.kind==='delivery');
const prev=()=>{if(ALL())return [];const r=R();return CONVS.filter(c=>c.d>=r.plo&&c.d<=r.phi)};
const hasBase=()=>prev().length>0;
const VS=()=>hasBase()?' vs '+cmpTxt():'';
const rangeDays=()=>R().days;
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dayDate=()=>new Date(TODAY.getTime()-R().lo*DAY);
const cmpTxt=()=>rangeDays()===1?'last '+WD[dayDate().getDay()]:'previous';
function setPeriod(v){if(!RANGES[v]||v===S.period)return;S.period=v;S.page=0;delete S.cf.day;delete S.cf.hour;if(v!=='all')try{localStorage.setItem('zocus-period',v)}catch(e){}render();Waves.pulse()}
function stats(list){const n=list.length,sold=list.filter(c=>c.outcome==='sold'),lost=list.filter(c=>c.outcome!=='sold');
 const sc=list.filter(c=>c.scored!==false),m=sc.length,skill={};SKILLS.forEach(s=>skill[s.id]=m?Math.round(sc.reduce((a,c)=>a+c.skills[s.id],0)/m):0);
 return {n,sold:sold.length,notSold:lost.length,conv:n?sold.length/n:0,soldValue:sumv(sold),lostValue:sumv(lost.filter(c=>c.outcome==='lost')),openValue:sumv(lost.filter(c=>c.outcome==='followup')),score:m?Math.round(sc.reduce((a,c)=>a+c.score,0)/m):0,skill,na:Object.fromEntries(['need','budget'].map(k=>[k,m>0&&sc.every(c=>(c.aiChecks||[]).some(x=>x.id===k&&x.mark==='na'))]))}}
function repRows(list){const store=stats(list);
 return REPS.map(r=>{const L=list.filter(c=>c.rep===r.id),s=stats(L);
   let weak=null,gap=0;SKILLS.forEach(k=>{const g=s.skill[k.id]-store.skill[k.id];if(weak===null||g<gap){weak=k.id;gap=g}});
   const thin=SNAP&&s.n<3;
   const status=thin?['neutral',s.n?`Only ${plural(s.n,'conversation')}, too few to rate`:'No conversations yet']:s.score>=store.score+6?['good','Top performer']:s.score<=store.score-6?['bad','Needs coaching']:['neutral','On track'];
   return {rep:r,s,L,weak,gap,status,thin}}).sort((a,b)=>(a.thin-b.thin)||b.s.score-a.s.score||b.s.n-a.s.n)}

/* ---------- Shell ---------- */
const NAV=[['home','Overview','home'],['insights','Insights','insights'],['team','Team','team'],['coaching','Coaching','coach'],['conversations','Conversations','conv'],['followups','Follow-ups','calls']];
function parseRep(){let h=(location.hash||'').slice(1);try{h=decodeURIComponent(h)}catch(e){}const m=h.match(/^(rep|coach)-(.+?)(?:\/(overview|coaching|conversations))?$/);return m&&REP[m[2]]?{id:m[2],tab:m[3]||(m[1]==='coach'?'coaching':'overview')}:null}
function routeName(){const r=parseRep();if(r)return 'rep-'+r.id;const h=(location.hash||'#home').slice(1);return NAV.some(n=>n[0]===h)||(h==='report'&&RICH)?h:'home'}
function renderNav(){const rt=routeName(),base=rt.startsWith('rep-')?(S.from==='coaching'?'coaching':'team'):rt,due=RICH?openPromises(CONVS).filter(x=>!x.done&&!x.p.s).length:followups().length;
 const item=(n,m)=>`<a href="#${n[0]}" ${n[0]===base?'aria-current="page"':''} ${n[0]==='insights'?'data-tour="nav-insights"':n[0]==='coaching'?'data-tour="nav-coaching"':''}>${m?ic(n[2],20):''}<span>${m&&n[0]==='conversations'?'Chats':n[1]}</span>${n[0]==='followups'&&due?`<span class="dot num">${due}</span>`:''}</a>`;
 document.getElementById('nav').innerHTML=NAV.filter(n=>!(TL&&n[0]==='followups')).map(n=>item(n,false)).join('');
 document.getElementById('bnav').innerHTML=NAV.filter(n=>!(TL&&n[0]==='followups')).map(n=>item(n,true)).join('');
 document.querySelectorAll('[data-act="period"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===S.period)));const rs=document.getElementById('rangeSel');if(rs)rs.value=S.period;
 document.querySelectorAll('[data-act="period"],#rangeSel option').forEach(b=>{const v=b.dataset.v||b.value,hide=FLAT||(v==='all'&&ZD.spanDays<=30)||(ZD.spanDays<3&&(v==='7'||v==='30'))||(ZD.spanDays<2&&v==='yesterday');b.hidden=hide;if(b.tagName==='OPTION')b.disabled=hide});
 const seg=document.querySelector('.seg[data-tour="period"]'),one=[...document.querySelectorAll('[data-act="period"]')].filter(b=>!b.hidden).length<2;if(seg)seg.classList.toggle('solo',one);if(rs)rs.classList.toggle('solo',one)}
function phead(title,sub){return `<div class="phead"><h1>${title}</h1><p>${sub}</p></div>`}
const periodTxt=()=>SNAP?'on '+fdate(TODAY):ALL()?'all conversations':({today:'today',yesterday:'yesterday','7':'last 7 days','30':'last 30 days'})[S.period];
const inTxt=()=>SNAP?periodTxt():ALL()?'across all conversations':rangeDays()===1?periodTxt():'in the '+periodTxt();
const baseTxt=()=>SNAP?fdate(TODAY):ALL()?'all conversations':rangeDays()===1?periodTxt():'the '+periodTxt();
const AFTER=['before the need was understood','after the need was understood',Wd.afterShown,'after the price was quoted'];
function leaks(L){return [0,1,2,3].map(k=>{const a=L.filter(c=>c.stage===k);return {k,n:a.length,v:sumv(a)}})}

/* ---------- Home: briefing, 3 numbers, 3 actions, team pulse ---------- */
function computeActions(L){
 const rows=repRows(L),store=stats(L),acts=[],solo=SNAP&&rows.filter(r=>r.s.n).length<2; // one-day pilot stores only: the standard stores keep their original rule
 const who=r=>r.rep.name==='Rep not tagged'?'the team':r.rep.first;
 let best=null;rows.forEach(r=>{if(!r.s.n)return;let weak=r.weak;if(solo)weak=SKILLS.reduce((a,k)=>r.s.skill[k.id]<r.s.skill[a]?k.id:a,SKILLS[0].id);
  const tied=r.L.filter(c=>c.outcome!=='sold'&&c.reason&&REASONS[c.reason].skill===weak);const v=sumv(tied);const sc=solo?tied.length+v:-r.gap*v;if(!best||sc>best.sc)best={...r,weak,tied,v,sc}});
 if(best)acts.push({impact:best.v,n:best.tied.length,title:`Coach ${who(best)} on ${SK[best.weak].label.toLowerCase()}`,body:solo?`Averages ${best.s.skill[best.weak]} out of 100, the lowest of the five steps.${best.tied.length?' '+plural(best.tied.length,'customer')+' left at this step.':''}`:`Scores ${best.s.skill[best.weak]} vs the ${Wd.store}'s ${store.skill[best.weak]}. ${best.tied.length?plural(best.tied.length,'customer')+' left at this step.':''}`,btn:'Coach',go:'#rep-'+best.rep.id+'/coaching'});
 const fu=followups();
 if(fu.length)acts.push({impact:sumv(fu.map(f=>f.c)),n:fu.length,title:`Call back ${plural(fu.length,'customer')}`,body:`${fu.filter(f=>f.status==='overdue').length} overdue. Messages are drafted and ready to copy.`,btn:'Call list',go:'#followups'});
 const oos=L.filter(c=>!c.inStock&&!/not decided|not recorded|not captured/i.test(PRODUCTS[c.product].label)),byP=groupBy(oos,c=>c.product);let top=null;Object.entries(byP).forEach(([k,v])=>{if(!top||v.length>top.v.length)top={k,v}});
 if(top)acts.push(CAR?{impact:sumv(top.v),n:top.v.length,title:`Cut the wait on the ${PRODUCTS[top.k].label}`,body:`${plural(top.v.length,'customer')} wanted it and we could not give a quick delivery date.`,btn:'Demand',go:'#insights',tab:'want'}:
  {impact:sumv(top.v),n:top.v.length,title:`Restock ${lc(PRODUCTS[top.k].label)}`,body:`${plural(top.v.length,'customer')} asked and we had none.${/lightweight/i.test(PRODUCTS[top.k].label)?' Most wanted under 10 grams.':''}`,btn:'Demand',go:'#insights',tab:'want'});
 if(FLOOR)return floorActions(L).concat(acts.filter(a=>a.go!=='#insights')).slice(0,3);
 return acts.sort((a,b)=>b.impact-a.impact||(SNAP?b.n-a.n:0)).slice(0,3)}
function lede(s,p,big){
 if(!s.n)return `<b>No conversations recorded ${inTxt()}.</b> ${ZD.spanDays<3?'New recordings appear after the next data refresh.':'Switch to 7 or 30 days to see the picture.'}`;
 const cmp=p.n?`, ${s.conv===p.conv?'the same as':s.conv>p.conv?'up from':'down from'} ${pct(p.conv)}${rangeDays()===1?' '+cmpTxt():''}`:'';
 const few=SNAP&&s.n<12;
 const head=few?`<b>${s.sold} of ${plural(s.n,'customer')} ${Wd.bought}</b>`:`<b>${pct(s.conv)} of customers ${Wd.bought}</b>${cmp}`;
 const slip=big.n?` Most ${Wd.sales} slipped <b>${AFTER[big.k]}</b>: ${plural(big.n,'customer')}${big.v?', '+inr(big.v):''}. The actions below go after the biggest part of it.`:` Nobody left without a ${Wd.sale}.`;
 return head+'.'+slip+(s.n<8&&!few?` Only ${plural(s.n,'conversation')} so far, so read the percentages with care.`:'')}
function homePanel(s){const W=weekly(CONVS),by=o=>cur().filter(c=>c.outcome===o),fo=o=>`data-filter='${JSON.stringify({outcome:o})}'`;
 return `<aside class="card hpanel" aria-label="Trend and results"><div class="cc-h"><h3>Conversion, last 8 weeks</h3><span class="hint">${Wd.Store}</span></div>
  ${ZC.lineChart({labels:W.map(x=>x.label),series:[{name:'Conversion',values:wk(W,x=>x.conv*100)}],fmt:v=>Math.round(v)+'%',w:760,h:128,aria:'Store sale conversion by week'})}
  <div class="cc-h" style="margin-top:6px"><h3>Results ${esc(inTxt())}</h3><span class="hint">Tap to filter</span></div>
  ${ZC.splitBar([{name:Wd.sold,n:by('sold').length,color:ZC.OUTCOME.sold,sub:inr(sumv(by('sold'))),attr:fo('sold')},{name:'Will return',n:by('followup').length,color:ZC.OUTCOME.followup,sub:inr(sumv(by('followup'))),attr:fo('followup')},{name:Wd.lost,n:by('lost').length,color:ZC.OUTCOME.lost,sub:inr(sumv(by('lost'))),attr:fo('lost')}])}</aside>`}
const mins=m=>m>=60?Math.floor(m/60)+' h '+String(Math.round(m%60)).padStart(2,'0')+' min':Math.round(m)+' min';
const WDL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const clock=s=>{const m=String(s||'').match(/(\d{1,2}):(\d{2})\s*$/);if(!m)return '';const h=+m[1];return (h%12||12)+':'+m[2]+(h<12?' am':' pm')};
/* One-day snapshot bar: which day, when it was last updated, what is still on its way, and the count at each earlier update. No hourly view. */
function snapBar(){if(!SNAP)return '';const m=ZD.meta||{},bits=[`<b>${WDL[TODAY.getDay()]} ${fdate(TODAY)}</b>`];
 if(m.exportedLocal){const d=String(m.exportedLocal).slice(0,10),same=!m.date||d===String(m.date).slice(0,10);bits.push('updated '+(same?'':fdate(new Date(d+'T12:00'))+', ')+clock(m.exportedLocal))}
 bits.push(plural(CONVS.length,'conversation'));
 if(m.analysing&&m.analysing.length)bits.push(`<b>${m.analysing.length} being analysed</b>`);
 const lo=ZD.locked?[]:(m.leftOut||[]);if(lo.length){const by={};lo.forEach(x=>by[x.why]=(by[x.why]||0)+1);bits.push(`${lo.length} left out (${Object.entries(by).map(([k,n])=>(n>1?n+' × ':'')+esc(lc(k))).join(', ')})`)}
 const H=(m.history||[]).filter(h=>h.shown>0);
 return `<div class="livebar"><div class="livehead"><span class="livedot" aria-hidden="true"></span><span>${bits.join(' · ')}</span></div>${H.length>1?`<div class="snaplog"><span class="mono">Updates</span>${H.map(h=>`<span class="num"><b>${clock(h.at)}</b> ${plural(h.shown,'conversation')}</span>`).join('')}</div>`:''}</div>`}
/* Where a rupee value came from. Indicative values (the model's typical price) are marked with ~ wherever they are shown. */
const VSRC={call:'said in the call',budget:'customer budget',indicative:'indicative by model',team:'entered by team',recorded:'recorded in the app'};
const valTxt=c=>!c.value&&ZD.has.valueSrc?'<span class="vna" title="No price was said in the call">–</span>':(c.valueSrc==='indicative'?'~':'')+inr(c.value);
const valSrc=c=>!ZD.has.valueSrc?'':c.value?(VSRC[c.valueSrc]||''):'value not known';
function valueNote(L){if(!ZD.has.valueSrc||!L.length)return '';const n=k=>L.filter(c=>c.value&&c.valueSrc===k).length,un=L.filter(c=>!c.value).length,parts=[];
 [['call','said in the call'],['recorded','recorded in the app'],['team','entered by team'],['budget','from the customer\'s budget'],['indicative','indicative by model']].forEach(([k,t])=>{if(n(k))parts.push(n(k)+' '+t)});
 if(un)parts.push(un+' value not known');
 return `<p class="hint valnote">Rupee figures: <b class="num">${inr(sumv(L))}</b> across ${L.length-un} of ${plural(L.length,'conversation')} · ${parts.join(' · ')}. Values marked ~ are the model's typical ex-showroom price, not a quote.</p>`}
function timelessPanel(s){const by=o=>cur().filter(c=>c.outcome===o),fo=o=>`data-filter='${JSON.stringify({outcome:o})}'`;
 return `<aside class="card hpanel" aria-label="Skills and results"><div class="cc-h"><h3>Average skill score</h3><span class="hint">${plural(s.n,'conversation')}</span></div>
  ${ZC.barList(SKILLS.map(k=>s.na&&s.na[k.id]?{label:k.label,value:0,text:'–',tip:`${k.label}|Not marked: these customers had already chosen a model`}:{label:k.label,value:s.skill[k.id],text:String(s.skill[k.id]),tip:`${k.label}|Average ${s.skill[k.id]} out of 100`}),{max:100})}
  <div class="cc-h" style="margin-top:8px"><h3>Results</h3><span class="hint">Tap to filter</span></div>
  ${ZC.splitBar([{name:Wd.sold,n:by('sold').length,color:ZC.OUTCOME.sold,sub:inr(sumv(by('sold'))),attr:fo('sold')},{name:'Will return',n:by('followup').length,color:ZC.OUTCOME.followup,sub:inr(sumv(by('followup'))),attr:fo('followup')},{name:Wd.lost,n:by('lost').length,color:ZC.OUTCOME.lost,sub:inr(sumv(by('lost'))),attr:fo('lost')}])}</aside>`}
function timeCard(L,title){if(!L.length)return '';const tot=L.reduce((a,c)=>a+c.dur,0),longest=L.reduce((a,c)=>c.dur>a.dur?c:a),tk=L.filter(c=>c.talkRep!=null);
 const avgBy=o=>{const a=L.filter(c=>c.outcome===o);return a.length?Math.round(a.reduce((x,c)=>x+c.dur,0)/a.length):0};
 const items=[['sold',Wd.sold],['followup','Will return'],['lost',Wd.lost]].filter(([o])=>L.some(c=>c.outcome===o)).map(([o,n])=>({label:n,value:avgBy(o),text:avgBy(o)+' min',tip:`${n}|Average ${avgBy(o)} min per conversation`}));
 return `<section class="card"><div class="card-h"><h2>${title||'Time with customers'}</h2><span class="hint">${esc(periodTxt())}</span></div>
  <div class="statline"><div><b class="num">${mins(tot)}</b><span>in conversations</span></div><div><b class="num">${Math.round(tot/L.length)} min</b><span>average length</span></div><div><b class="num">${longest.dur} min</b><span>longest</span></div>${tk.length?`<div><b class="num">${Math.round(tk.reduce((a,c)=>a+c.talkRep,0)/tk.length)}%</b><span>of words by the rep</span></div>`:''}</div>
  <div class="cc-h" style="margin-top:12px"><h3>Average length by result</h3></div>${ZC.barList(items)}
  <button class="link" data-conv="${longest.id}" style="margin-top:8px">Open the longest conversation${ic('right',14)}</button></section>`}
function dayCards(L){if(!SNAP||!L.length)return '';const rows=repRows(L);
 const reps=`<section class="card"><div class="card-h"><h2>Reps ${esc(periodTxt())}</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Rep</th><th class="r">Chats</th><th class="r">Talk time</th><th class="r">Score</th><th>Results</th></tr></thead><tbody>${rows.map(r=>{const a=L.filter(c=>c.rep===r.rep.id);return `<tr class="click" data-go="#rep-${r.rep.id}"><td><b>${esc(r.rep.name)}</b></td><td class="r num">${a.length}</td><td class="r num">${mins(a.reduce((x,c)=>x+c.dur,0))}</td><td class="r num">${r.s.score}</td><td style="min-width:120px">${ZC.miniSplit([{name:Wd.sold,n:a.filter(c=>c.outcome==='sold').length,color:ZC.OUTCOME.sold},{name:'Will return',n:a.filter(c=>c.outcome==='followup').length,color:ZC.OUTCOME.followup},{name:Wd.lost,n:a.filter(c=>c.outcome==='lost').length,color:ZC.OUTCOME.lost}])}</td></tr>`}).join('')}</tbody></table></div></section>`;
 const LL=RICH?allCur():L,latest=[...LL].sort((a,b)=>b.at-a.at).slice(0,5);
 return `<div class="homegrid2">${reps}${timeCard(L)}</div><section class="card"><div class="card-h"><h2>Latest conversations</h2><button class="link" data-go="#conversations">All ${LL.length}${ic('right',14)}</button></div><div class="clist">${latest.map(c=>`<button class="crow dense latest" data-conv="${c.id}">${rg(c,30)}<strong>${esc(PRODUCTS[c.product].label)}</strong><small>${esc(clipTxt((RICH&&c.sumNeed)||(c.sum&&c.sum.happened)||'',150))}</small><span class="c-rep">${esc(RICH?rname(REP[c.rep]):REP[c.rep].first)} · ${c.dur} min</span><span>${outcomePill(c)}</span><span class="d num">${ftime(c.at)}</span></button>`).join('')}</div>${pendingHtml()}</section>`}
function pendingHtml(){const m=ZD.meta;if(!m||!SNAP)return '';const row=(x,t)=>`<div class="crow dense pending"><span class="pdot" aria-hidden="true"></span><strong>${t}</strong><small>${esc(x.rep==='Rep not tagged'?'Rep not noted':x.rep)}${x.min?' · '+x.min+' min':''}</small><span class="d num">${esc((x.at||'').slice(11))}</span></div>`;
 const h=(m.analysing||[]).map(x=>row(x,'Being analysed')).join('')+(m.unscored||[]).map(x=>row(x,'Too short or unclear to score')).join('')+(m.failed||[]).map(x=>row(x,'Upload failed, needs re-upload')).join('');
 return h?`<div class="clist pendlist">${h}</div>`:''}
function kpi(o){return `<button class="card kpi" ${o.filter?`data-filter='${JSON.stringify(o.filter)}'`:`data-go="${o.go}"`}><div class="row"><span class="label">${o.label}</span><span class="tag">${o.tag}</span></div><div class="val num">${o.val}</div><div class="row"><span class="sub">${o.sub}</span>${o.delta}</div></button>`}
function renderHome(){
 if(RICH)return renderHomeRich();
 const L=cur(),P=prev(),s=stats(L),p=stats(P),acts=computeActions(L),rows=repRows(L);
 const big=leaks(L).reduce((a,b)=>MORE(b,a)?b:a);
 const short={good:'Top',neutral:'On track',bad:'Coach'};
 return `<div class="homegrid"><section class="hero" data-tour="brief">
  <span class="mono">${ic('spark',14)} AI briefing · ${esc(ZD.store)} · ${SNAP?WDL[TODAY.getDay()]+' '+fdate(TODAY):periodTxt()+(rangeDays()===1?' · '+fdate(dayDate()):'')} ${ZD.isSample?'<span class="sample">Sample data</span>':''}</span>
  <h1>${TL?'Conversation review':greet()}</h1>
  <p class="lede">${FLOOR&&s.n?floorLede(L):lede(s,p,big)}</p>
  </section>${FLAT?timelessPanel(s):homePanel(s)}</div>
  <div class="waveband" data-wave-anchor aria-hidden="true"><span class="wavehint">Live voice waves · hover or click</span></div>
 <section class="kpis" data-tour="kpis">
  ${FLOOR?floorKpis(L):`${kpi({label:Wd.conv,tag:'Output',val:pct(s.conv),sub:`${s.sold} of ${s.n} customers`,delta:delta(s.conv,p.conv,{pts:true}),go:'#insights'})}
  ${kpi({label:Wd.closed,tag:'Output',val:inr(s.soldValue),sub:Wd.tagged,delta:delta(s.soldValue,p.soldValue),filter:{outcome:'sold'}})}
  ${kpi({label:'Conversations recorded',tag:'Input',val:s.n,sub:SNAP?`${mins(L.reduce((a,c)=>a+c.dur,0))} with customers`:`${(s.n/rangeDays()/REPS.length).toFixed(1)} per rep per day`,delta:delta(s.n,p.n),go:'#team'})}`}
 </section>${valueNote(L)}${floorCards(L)}
  <div class="homegrid2"><section class="card" data-tour="actions"><div class="card-h"><h2>${TL?'Start with these three':SNAP?'Do these next':'Today, do these three'}</h2><span class="hint">${FLOOR?'Ranked by customers':'Ranked by money at stake'}</span></div>
  <div class="acts">${acts.length?'':'<p class="hint" style="margin:0">No actions yet. They appear once a few conversations are in.</p>'}${acts.map((a,i)=>`<div class="act"><span class="n">${i+1}</span><div><h3>${a.title}</h3><p>${a.body}</p></div><div class="r">${a.impact?`<span class="pill gold num">${inr(a.impact)}</span>`:''}<button class="btn ${i===0?'primary':''} sm" ${a.filter?`data-filter='${JSON.stringify(a.filter)}'`:`data-go="${a.go}"`} ${a.tab?`data-tab="${a.tab}"`:''}>${a.btn}${ic('right',14)}</button></div></div>`).join('')}</div></section>
 <section class="card" data-tour="pulse"><div class="card-h"><h2>Team at a glance</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div>
  <div class="pulse">${rows.map(r=>`<button class="pchip" data-go="#rep-${r.rep.id}">${ring(r.s.score,54)}<b>${r.rep.first}</b><span class="pill ${r.status[0]}">${r.thin?plural(r.s.n,'chat'):short[r.status[0]]}</span></button>`).join('')}</div>
  <p class="hint" style="margin:10px 0 0">Ring shows conversation score out of 100. ${Wd.Store} average ${s.score}.${rows.some(r=>r.thin)?' Reps with fewer than 3 conversations are not rated yet.':' Tap a rep to coach.'}</p>${featuredHtml()}</section></div>${dayCards(L)}`}
function featuredHtml(){const f=(ZD.featured||[]).map(r=>CONVS.find(c=>c.ref===r)).filter(Boolean);if(!f.length)return '';
 return `<div class="card-h" style="margin:14px 0 8px"><h2>Start here</h2><span class="hint">Real test conversations</span></div><div class="featured">${f.map(c=>`<button class="feat" data-conv="${c.id}">${rg(c,40)}<span style="min-width:0"><b>${esc(PRODUCTS[c.product].label)}</b><span class="m">${esc(REP[c.rep].first)} · ${c.dur} min · ${esc(clipTxt((c.sum&&c.sum.happened)||'',90))}</span></span></button>`).join('')}</div>`}
const clipTxt=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;

/* ---------- Insights: one tab at a time, one AI line on top ---------- */
function insightData(L,P){
 const notSold=L.filter(c=>c.outcome!=='sold');
 const reasons=Object.entries(groupBy(notSold,c=>c.reason)).map(([k,v])=>{const byRep=groupBy(v,c=>c.rep);const worst=Object.entries(byRep).sort((a,b)=>b[1].length-a[1].length)[0];
   return {k,n:v.length,v:sumv(v),share:v.length/notSold.length,prevN:P.filter(c=>c.outcome!=='sold'&&c.reason===k).length,worst:worst?[worst[0],worst[1].length]:null}}).sort((a,b)=>FLOOR?b.n-a.n||b.v-a.v:b.v-a.v);
 const products=Object.entries(groupBy(L,c=>c.product)).map(([k,v])=>{const oos=v.filter(c=>!c.inStock);return {k,n:v.length,sold:v.filter(c=>c.outcome==='sold').length,oos:oos.length,oosV:sumv(oos)}}).sort((a,b)=>b.n-a.n);
 const overall=stats(L).conv;
 const comps=Object.entries(groupBy(L,c=>c.competitor)).map(([k,v])=>({k,n:v.length,conv:v.filter(c=>c.outcome==='sold').length/v.length,risk:sumv(v.filter(c=>c.outcome!=='sold')),prevN:P.filter(c=>c.competitor===k).length})).sort((a,b)=>b.n-a.n);
 const pers=Object.entries(groupBy(L,c=>c.persona)).map(([k,v])=>{const sold=v.filter(c=>c.outcome==='sold');const br=REPS.map(r=>{const x=v.filter(c=>c.rep===r.id);return {r,n:x.length,conv:x.length?x.filter(c=>c.outcome==='sold').length/x.length:0}}).filter(o=>o.n>=3).sort((a,b)=>b.conv-a.conv)[0];
   return {k,n:v.length,share:v.length/L.length,conv:sold.length/v.length,ticket:sold.length?sumv(sold)/sold.length:0,best:br}}).sort((a,b)=>b.n-a.n);
 const kwc={},kwp={};L.forEach(c=>c.kw.forEach(k=>kwc[k]=(kwc[k]||0)+1));P.forEach(c=>c.kw.forEach(k=>kwp[k]=(kwp[k]||0)+1));
 const kws=Object.keys(kwc).map(k=>({k,n:kwc[k],p:kwp[k]||0})).sort((a,b)=>b.n-a.n);
 return {reasons,products,overall,comps,pers,kws}}
function funnel(L){const n=L.length,lk=leaks(L),big=lk.reduce((a,b)=>MORE(b,a)?b:a);let h='<div class="fun">';
 for(let k=0;k<5;k++){const cnt=L.filter(c=>c.stage>=k).length;
  h+=`<div class="fstep ${k===4?'sold':''}"><span>${STAGES[k]}</span><span class="fbar"><i style="width:${n?cnt/n*100:0}%"></i></span><b class="num" style="text-align:right">${cnt}</b></div>`;
  if(k<4){const l=lk[k];h+=`<div class="leak ${l.k===big.k?'big':''}"><button data-filter='{"stage":"${k}"}'>${ic('down',13)}${l.n} left · ${inr(l.v)}${l.k===big.k?' · biggest leak':''}</button></div>`}}
 return h+'</div>'}
function renderInsights(){
 const L=cur(),P=prev(),D=insightData(L,P);
 const tabs=[['drop',Wd.noBuy],['want','What they want'],['comp','Competition'],['types','Customer types']].concat(CAR?[['after','After the booking']]:[]).concat(RICH&&allCur().some(c=>c.stock)?[['stock','Demand vs stock']]:[]);
 let lead='',body='';
 if(S.tab==='drop'&&RICH&&L.length<8){const nb=L.filter(c=>c.outcome!=='sold');
  lead=nb.length?`<b>${nb.length} of ${plural(L.length,'customer')}</b> have not booked yet. With so few conversations the reasons are shown one by one, as the AI read them.`:'Everyone booked so far.';
  body=nb.map(c=>`<div class="whyrow"><div><b>${esc(cname(c))}</b> <span class="hint">${tRange(c)} · ${esc(rname(REP[c.rep]))}</span><p style="margin:4px 0 0">${esc(c.sumWhy||(c.sum&&c.sum.why)||'No reason recorded.')}</p></div><button class="btn sm" data-conv="${c.id}">Open${ic('right',14)}</button></div>`).join('')||'<p class="hint">Nothing to explain.</p>';
 }else if(S.tab==='drop'){const r0=D.reasons[0],big=leaks(L).reduce((a,b)=>MORE(b,a)?b:a);
  lead=`Most customers leave <b>${AFTER[big.k]}</b>. The ${FLOOR?'most common':'costliest'} reason is <b>${lc(REASONS[r0.k].label)}</b>, ${r0.v?inr(r0.v)+' across ':''}${plural(r0.n,'customer')}. ${BEST[r0.k].real||ZD.isSample?`${REP[BEST[r0.k].rep].first} has an answer that works.`:''}`;
  body=`<div class="ins2"><div><div class="card-h"><h2>Where ${Wd.sales} leak</h2><span class="hint">Tap a red line to see those customers</span></div>${funnel(L)}</div>
  <div><div class="card-h" style="margin:0 0 4px"><h2>${FLOOR?'Reasons, by customers':'Reasons, by money lost'}</h2></div>`+
  showAll('drop',D.reasons,3,(r,i)=>{const R0=REASONS[r.k],b=BEST[r.k],pb=PLAYBOOK[r.k],own=b.real||ZD.isSample,tryTxt=own?`${REP[b.rep].first}'s answer: "${b.en}"`:pb?`"${pb.en}"`:'';return `<details class="why" ${i===0?'open':''}><summary>
   <span><span class="t">${R0.label}</span><br><span class="m num">${plural(r.n,'customer')}${r.worst?` · most with ${repLink(r.worst[0],REP[r.worst[0]].first)}`:''}</span></span>
   <span style="display:flex;align-items:center;gap:12px"><span style="text-align:right"><b class="num">${inr(r.v)}</b><br>${delta(r.n,r.prevN,{lowerBetter:true})}</span><span class="chev">${ic('chev')}</span></span></summary>
   <div class="body">${R0.hi||R0.en?`<div class="quote bad">${Q(R0.hi||R0.en,R0.en||R0.hi)}<div class="by">Customers say</div></div>`:''}
   ${own?`<div class="quote">${Q(b.hi,b.en)}<div class="by">What works · ${repLink(b.rep,REP[b.rep].name)}</div></div>`:pb?`<div class="quote">${Q(pb.hi,pb.en)}<div class="by">Suggested line · Zocus playbook</div></div><p class="hint" style="margin:6px 0">No answer recorded so far scored well enough to show as an example, so this is a playbook line, not your team's words.</p>`:`<p class="hint" style="margin:6px 0">No resolved answer recorded yet for this objection.</p>`}
   <div class="btnrow">${tryTxt?`<button class="btn primary sm" data-act="copy" data-text="${esc(`Team briefing: when a customer ${R0.en?`says "${R0.en}"`:`raises "${lc(R0.label)}"`}, try ${tryTxt}`)}">${ic('copy',14)}Copy for team briefing</button>`:''}<button class="btn sm" data-filter='{"reason":"${r.k}"}'>See ${plural(r.n,'conversation')}</button></div></div></details>`})+'</div></div>';
 }else if(S.tab==='want'&&FLOOR){const n=L.length,by={};L.forEach(c=>{const ms=c.models.length?c.models:['Model not decided'];ms.forEach((m,i)=>{const r=by[m]||(by[m]={m,n:0,main:0,q:0,b:0,av:0,v:0});r.n++;if(i===0){r.main++;r.v+=c.value}if(c.quote==='yes')r.q++;if(c.outcome==='sold'&&i===0)r.b++;if(c.avail)r.av++})});
  const rows=Object.values(by).sort((a,b)=>b.n-a.n),top=rows.find(r=>r.m!=='Model not decided');
  lead=top?`<b>${esc(top.m)}</b> came up most, in ${plural(top.n,'conversation')}. ${L.filter(c=>c.models.length>=2).length} customers compared two or more models.`:'No model named yet.';
  const prio={};L.forEach(c=>c.prio.forEach(p=>prio[p]=(prio[p]||0)+1));
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>Model</th><th class="r">Considered</th><th class="r">First choice</th><th class="r">Quotation</th><th class="r">Booked</th><th class="r">Availability asked</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.m)}</b></td><td class="r num">${r.n}</td><td class="r num">${r.main}</td><td class="r num">${r.q}</td><td class="r num">${r.b}</td><td class="r num">${r.av||'-'}</td></tr>`).join('')}</tbody></table></div>
  <p class="hint" style="margin:8px 0 0">A customer comparing two models is counted under both. First choice is the model talked about most.</p>
  <div class="card-h" style="margin:26px 0 10px"><h2>What customers care about</h2><span class="hint">Tap to see them</span></div>
  <div class="chips">${Object.entries(prio).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<button class="chip" data-filter='${JSON.stringify({prio:k})}'>${esc(k)} <small class="num">${v} · ${share(v,n)}</small></button>`).join('')||'<span class="hint">Nothing captured yet.</span>'}</div>`;
 }else if(S.tab==='want'){const sp=[...D.products].sort((a,b)=>b.oosV-a.oosV)[0];
  const topAsk=[...D.products].filter(x=>!/not decided|not recorded|not captured/i.test(PRODUCTS[x.k].label)).sort((x,y)=>y.n-x.n)[0];
  lead=!ZD.has.stock?(topAsk?`Customers asked for <b>${esc(PRODUCTS[topAsk.k].label)}</b> most: ${plural(topAsk.n,'conversation')}.`:'No requests this period.'):sp&&sp.oos?`<b>${PRODUCTS[sp.k].label}</b> is the stock gap: ${plural(sp.oos,'customer')} ${CAR?'wanted a variant we could not deliver soon':'asked when we had none'}, ${inr(sp.oosV)} of interest.${ZD.isSample?' "Lightweight" is a word customers keep using.':''}`:'No stock gaps this period.';
  const rows=S.showAll.want?D.products:D.products.slice(0,5);
  body=(ZD.has.stock?'':needs(CAR?'Waiting periods are not in this data yet, so the "Long wait" and "Interest lost" columns stay empty.':'Stock levels are not in this data yet, so the "Not in stock" and "Interest lost" columns stay empty.')+'<div style="height:12px"></div>')+`<div class="tblwrap"><table class="tbl"><thead><tr><th>Asked for</th><th class="r">Asked</th><th class="r">${CAR?'Booked':'Bought'}</th><th class="r">${CAR?'Long wait':'Not in stock'}</th><th class="r">Interest lost</th></tr></thead><tbody>${rows.map(p=>`<tr class="click" data-filter='{"product":"${p.k}"}'><td><b>${PRODUCTS[p.k].label}</b> ${p.oos/p.n>.2?'<span class="pill warn">Stock gap</span>':''}</td><td class="r num">${p.n}</td><td class="r num">${pct(p.sold/p.n)}</td><td class="r num">${p.oos||'-'}</td><td class="r num">${p.oos?inr(p.oosV):'-'}</td></tr>`).join('')}</tbody></table></div>
  ${D.products.length>5?`<div style="margin-top:10px"><button class="link" data-act="showall" data-k="want">${S.showAll.want?'Show top 5':'Show all '+D.products.length}</button></div>`:''}
  <div class="card-h" style="margin:26px 0 10px"><h2>Words customers keep using</h2><span class="hint">Tap to see them</span></div>
  <div class="chips">${D.kws.slice(0,8).map(k=>`<button class="chip" data-filter='{"kw":"${esc(k.k)}"}'>${esc(k.k)} <small class="num">${k.n}</small>${k.n>k.p*1.15?`<span class="delta up">${ic('up',13)}</span>`:k.n<k.p*.85?`<span class="delta down">${ic('down',13)}</span>`:''}</button>`).join('')}</div>`;
 }else if(S.tab==='comp'){const c0=D.comps[0],b=BEST.competitor;
  lead=c0?`When customers mention <b>${COMP[c0.k].label}</b>, we close ${pct(c0.conv)} vs ${pct(D.overall)} usually. ${COMP[c0.k].offer?` They are pushing <b>${lc(COMP[c0.k].offer)}</b>.`:''}`:'No competitor mentions this period.';
  body=`<div class="comp">${D.comps.map(c=>`<div class="ccard"><div><h3 style="font-size:16px">${COMP[c.k].label}</h3><span class="hint">${plural(c.n,'mention')}</span></div>
   <div class="stat2"><div><b class="num" style="color:${c.conv<D.overall?'var(--bad)':'var(--good)'}">${pct(c.conv)}</b><span>we close when named</span></div><div><b class="num">${inr(c.risk)}</b><span>at risk</span></div></div>
   ${COMP[c.k].offer?`<div><span class="mono">They offer</span><div style="font-weight:500">${COMP[c.k].offer}</div></div>`:`<div class="hint">What they offer: not captured yet.</div>`}
   <button class="btn sm" data-filter='{"comp":"${c.k}"}' style="align-self:flex-start">See ${plural(c.n,'conversation')}</button></div>`).join('')}</div>
   ${b.real||ZD.isSample?`<div class="quote" style="margin-top:16px">${Q(b.hi,b.en)}<div class="by">Best counter so far · ${REP[b.rep].name}</div></div>`:PLAYBOOK.competitor&&D.comps.length?`<div class="quote" style="margin-top:16px">${Q(PLAYBOOK.competitor.hi,PLAYBOOK.competitor.en)}<div class="by">Suggested line · Zocus playbook</div></div>`:''}`;
 }else if(S.tab==='stock'&&RICH){const A=allCur().filter(c=>c.stock),nw=A.filter(c=>c.stock.inhand==='no').length,un=A.filter(c=>!c.stock.inhand||c.stock.inhand==='unknown').length;
  lead=`<b>${nw} of ${plural(A.length,'customer')}</b> wanted a car that is not in hand today${un?`; for ${un} stock did not come up`:''}. What each one wanted, what the showroom has, and what else was offered.`;
  body=`<div class="tblwrap"><table class="tbl stocktbl"><thead><tr><th>Customer</th><th>Wanted</th><th>In hand</th><th>What else was offered</th></tr></thead><tbody>${A.map(c=>`<tr class="click" data-conv="${c.id}"><td><b>${esc(cname(c))}</b><br><span class="hint">${esc(rname(REP[c.rep]))}</span><br>${outcomePill(c)}</td><td>${esc(c.stock.want||'')}</td><td>${esc(c.stock.have||'')}</td><td>${esc(c.stock.alt||'')}</td></tr>`).join('')}</tbody></table></div><p class="hint" style="margin:10px 0 0">Read from each conversation. The showroom's stock list is not connected yet.</p>`;
 }else if(S.tab==='after'&&RICH&&DELV().length){const A=DELV(),items=[];A.forEach(c=>c.prices.forEach(p=>items.push({c,p})));
  lead=`<b>${plural(A.length,'customer')}</b> came back after booking today, for accessories, payment or delivery. The prices below are what the rep quoted.`;
  body=`${items.length?`<div class="tblwrap"><table class="tbl pricetbl"><thead><tr><th>Item</th><th class="r">Price</th><th>As said</th><th>Customer</th></tr></thead><tbody>${items.map(({c,p})=>`<tr class="click" data-conv="${c.id}"><td>${esc(p.m)}</td><td class="r num"><b>${typeof p.p==='number'?(p.p<100000?'₹'+p.p.toLocaleString('en-IN'):inr(p.p)):esc(p.p)}</b></td><td>${esc(p.b||'')}</td><td>${esc(cname(c))}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">No prices were mentioned.</p>'}
  <div class="card-h" style="margin:22px 0 6px"><h2>Open issues and payment</h2></div>${A.map(c=>`<div class="whyrow"><div><b>${esc(cname(c))}</b> <span class="hint">${tRange(c)} · ${esc(rname(REP[c.rep]))}</span><p style="margin:4px 0 0"><b>Issue:</b> ${esc(c.sumWhy||(c.sum&&c.sum.why)||'-')}</p>${c.payment?`<p style="margin:4px 0 0"><b>Payment:</b> ${esc(c.payment)}</p>`:''}<p style="margin:4px 0 0"><b>Next:</b> ${esc(c.sumNext||'-')}</p></div><button class="btn sm" data-conv="${c.id}">Open${ic('right',14)}</button></div>`).join('')}`;
 }else if(S.tab==='after'){
  lead='What happens after a booking (loan, insurance, extended warranty, accessories, service package, exchange) is <b>to be updated</b>.';
  body=`<div class="tbu"><b>To be updated</b><p class="hint">This section will show the add-ons on booked cars: loan, insurance, extended warranty, accessories, service package and exchange. It is not part of the pilot yet.</p></div>`;
 }else if(FLOOR&&S.tab==='types'){const n=L.length,g=Object.entries(groupBy(L,c=>c.decision||'exploring')).map(([k,v])=>({k,n:v.length,q:v.filter(c=>c.quote==='yes').length,b:v.filter(c=>c.outcome==='sold').length,hi:v.filter(c=>c.intent==='high').length})).sort((a,b)=>b.n-a.n);
  const d=g.find(x=>x.k==='decided');
  lead=`Customers arrive with a model in mind: <b>${d?d.n:0} of ${n}</b> had decided on one, ${(g.find(x=>x.k==='choosing')||{n:0}).n} were choosing between two or three.`;
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>How decided</th><th>Share</th><th class="r">High intent</th><th class="r">Quotation</th><th class="r">Booked</th></tr></thead><tbody>${g.map(x=>`<tr class="click" data-filter='${JSON.stringify({decision:x.k})}'><td><b>${DEC[x.k]||x.k}</b></td><td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1"><i style="width:${x.n/n*100}%;background:var(--ink)"></i></span><span class="num">${share(x.n,n)}</span></div></td><td class="r num">${x.hi}</td><td class="r num">${x.q}</td><td class="r num">${x.b}</td></tr>`).join('')}</tbody></table></div>
  <div class="card-h" style="margin:26px 0 10px"><h2>Why they came</h2></div>
  <div class="chips">${Object.entries(groupBy(L,c=>c.persona)).sort((a,b)=>b[1].length-a[1].length).map(([k,v])=>`<button class="chip" data-filter='${JSON.stringify({persona:k})}'>${esc(PER[k].label)} <small class="num">${v.length}</small></button>`).join('')}</div>`;
 }else{const pl=[...D.pers].sort((a,b)=>a.conv-b.conv)[0];
  lead=`<b>${PER[pl.k].label}</b> customers convert least, at ${pct(pl.conv)}.${pl.best?` ${pl.best.r.first} closes ${pct(pl.best.conv)} of them: send these walk-ins to ${pl.best.r.first}.`:''}`;
  body=`<div class="tblwrap"><table class="tbl"><thead><tr><th>Came in for</th><th>Share</th><th class="r">Conversion</th><th class="r">${Wd.avgSale}</th><th>Best rep</th></tr></thead><tbody>${D.pers.map(p=>`<tr class="click" data-filter='{"persona":"${p.k}"}'><td><b>${PER[p.k].label}</b></td><td style="min-width:130px"><div style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1"><i style="width:${p.share*100}%;background:var(--ink)"></i></span><span class="num">${pct(p.share)}</span></div></td><td class="r num">${pct(p.conv)}</td><td class="r num">${p.ticket?inr(p.ticket):'-'}</td><td>${p.best?`${repLink(p.best.r.id,p.best.r.first)} <span class="hint num">${pct(p.best.conv)}</span>`:'-'}</td></tr>`).join('')}</tbody></table></div>`;
 }
 return phead('Insights',`What ${L.length} customers told your team ${inTxt()}.`)+
 `<div class="tabs" role="tablist">${tabs.map(t=>`<button role="tab" aria-selected="${S.tab===t[0]}" data-act="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>
 <div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
 <section class="card" id="itabs">${body}</section>`}
function showAll(key,items,limit,fn){const all=S.showAll[key];const shown=all?items:items.slice(0,limit);
 return shown.map(fn).join('')+(items.length>limit?`<div style="margin-top:12px"><button class="link" data-act="showall" data-k="${key}">${all?'Show top '+limit:'Show all '+items.length}</button></div>`:'')}

/* ---------- Team: summary, three charts, compact expandable rows ---------- */
const ZC=window.ZCharts;
const SHORT={need:'Need',budget:'Budget',pitch:Wd.pitchShort,objection:'Price doubts',close:'Closing'};
function weekly(list){const out=[];for(let w=7;w>=0;w--){const a=list.filter(c=>Math.floor(c.d/7)===w);out.push({label:w===0?'This week':w+' wk ago',s:stats(a)})}return out}
const wk=(W,f)=>W.map(x=>x.s.n>=2?f(x.s):null);
const dotOf=k=>`<i class="sdot ${k}"></i>`;
function renderTeam(){const L=cur(),P=prev(),rows=repRows(L),store=stats(L),p=stats(P),W=weekly(CONVS);
 const cls=(v,st)=>v>=st+5?'g':v<=st-5?'b':'w';
 const rated=rows.filter(r=>!r.thin),top=rated[0]||rows[0],low=rated[rated.length-1]||rows[rows.length-1],need=rated.filter(r=>r.status[0]==='bad');
 const lead=(rows.length?`${Wd.Store} score is <b>${store.score}</b>${p.n?`, ${store.score>=p.score?'up':'down'} from ${p.score}`:''}. ${rated.length?`<b>${esc(top.rep.first)}</b> leads at ${top.s.score}.`:`No rep has 3 conversations yet, so reps are not ranked.`}${need.length?` ${plural(need.length,'rep')} need${need.length===1?'s':''} coaching, furthest behind is <b>${esc(low.rep.first)}</b> on ${SK[low.weak].label.toLowerCase()} (${low.s.skill[low.weak]} vs ${store.skill[low.weak]}).`:''}`:'No recordings in this period.')+untagNote(L);
 const tiles=[
  ZC.tile({label:'Conversation score',value:store.score,spark:SP(wk(W,x=>x.score)),sub:delta(store.score,p.score)+VS()}),
  RICH?'':ZC.tile({label:Wd.conv,value:pct(store.conv),spark:SP(wk(W,x=>x.conv*100)),sub:delta(store.conv,p.conv,{pts:true})+VS()}),
  ZC.tile({label:'Conversations recorded',value:store.n,spark:SP(wk(W,x=>x.n)),sub:delta(store.n,p.n)+VS()}),
  ZC.tile({label:Wd.closed,value:inr(store.soldValue),spark:SP(wk(W,x=>x.soldValue)),sub:delta(store.soldValue,p.soldValue)+VS()})].join('');
 const trend=ZC.lineChart({labels:W.map(x=>x.label),series:[{name:Wd.Store+' score',values:wk(W,x=>x.score)}],aria:'Store conversation score by week for the last 8 weeks'});
 const sc=ZC.scatter({points:rated.filter(r=>r.s.n).map(r=>({x:r.s.score,y:Math.round(r.s.conv*100),size:r.s.n,label:r.rep.first,href:'#rep-'+r.rep.id,tip:`${r.rep.name}|Score ${r.s.score}|Conversion ${pct(r.s.conv)}|${plural(r.s.n,'conversation')}`})),xLabel:'Conversation score',yLabel:'Conversion %',ySuffix:'%',refX:store.score,refY:Math.round(store.conv*100),refLabel:Wd.store+' avg',aria:'Each rep plotted by conversation score and conversion'});
 const grid=ZC.heatGrid({cols:SKILLS.map(k=>SHORT[k.id]),rows:rated.map(r=>({label:r.rep.first,attr:`data-go="#rep-${r.rep.id}"`,cells:SKILLS.map(k=>({text:r.s.skill[k.id],cls:cls(r.s.skill[k.id],store.skill[k.id]),tip:`${r.rep.name}|${k.label}: ${r.s.skill[k.id]}|${Wd.Store} ${store.skill[k.id]}`}))})).concat([{label:Wd.Store,foot:true,cells:SKILLS.map(k=>({text:store.skill[k.id],cls:'n'}))}])});
 const hi=rated.filter(r=>r.s.score>=store.score&&r.s.conv<store.conv).sort((a,b)=>a.s.conv-b.s.conv)[0];
 return phead('Team',`${plural(REPS.length,'rep')} ${inTxt()}. Tap a row to open it.`)+
 `<div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${lead}</p></div>
 <div class="ktiles">${tiles}</div>
 <div class="cgrid3">
  ${FLAT?'':ZC.ccard('Score trend',Wd.Store+', 8 weeks',trend)}
  ${rated.length>=2||(!SNAP&&rated.length)?ZC.ccard(hi?`${esc(hi.rep.first)} scores well but closes less`:'Score vs conversion','Dot size = conversations',sc):''}
  ${rated.length?ZC.ccard('Skills by rep','Green above '+Wd.store+', red below',grid):''}
 </div>
 <section class="card"><div class="card-h"><h2>Reps</h2><span class="hint">${rated.length?'Ranked by conversation score':'Ranked once a rep has 3 conversations'}</span></div>
 <div class="xr-h trow"><span>#</span><span>Rep</span><span class="r">Score</span><span class="r">Conv.</span><span class="r">Recorded</span><span>${FLAT?'':'8-week score'}</span><span></span></div>
 ${rows.map((r,i)=>{const RW=weekly(CONVS.filter(c=>c.rep===r.rep.id));return `<details class="xrow"><summary class="trow"><span class="num rk">${r.thin?'–':i+1}</span><span class="nm"><b>${esc(r.rep.name)}</b><span class="st">${dotOf(r.status[0])}${r.status[1]}</span></span><span class="r num"><b>${r.s.score}</b></span><span class="r num">${pct(r.s.conv)}</span><span class="r num">${r.s.n}</span><span>${SP(wk(RW,x=>x.score),{w:96,h:24})}</span>${ic('chev',16)}</summary>
  <div class="xr-b"><div class="skills5">${SKILLS.map(k=>`<div class="skill"><div class="s2"><b style="font-weight:500">${SHORT[k.id]}</b><span class="num"><b style="color:var(--ink)">${r.s.skill[k.id]}</b> / ${store.skill[k.id]}</span></div><div class="bar"><i style="width:${r.s.skill[k.id]}%;background:${scoreCol(r.s.skill[k.id])}"></i><span class="tick" style="left:${store.skill[k.id]}%"></span></div></div>`).join('')}</div>
  <div class="xr-f"><span class="hint">Weakest vs ${Wd.store}: <b style="color:var(--ink)">${SK[r.weak].label}</b> (${r.gap>0?'+':''}${r.gap}). ${inr(r.s.soldValue)} closed from ${plural(r.s.sold,Wd.sale)}.</span><div class="btnrow"><button class="btn primary sm" data-go="#rep-${r.rep.id}/coaching">Coaching plan${ic('right',14)}</button><button class="btn sm" data-go="#rep-${r.rep.id}">Profile</button><button class="btn sm" data-go="#rep-${r.rep.id}/conversations">Conversations</button></div></div></div></details>`}).join('')}
 </section>`}

/* ---------- Rep profile: everything about one rep in one place (Overview, Coaching, Conversations) ---------- */
const untagNote=L=>{const n=L.filter(c=>REP[c.rep].name==='Rep not tagged').length;return n?` <b>${plural(n,'conversation')}</b> ${n===1?'has':'have'} no rep tagged yet, so ${n===1?'it is':'they are'} grouped as "Rep not tagged".`:''};
const repLink=(id,txt)=>`<span class="rlink" role="link" tabindex="0" data-go="#rep-${id}">${esc(txt)}</span>`;
const LEFT=['Before need understood','After need understood',Wd.leftShown,'After price quoted'];
const rf=o=>`data-rf='${JSON.stringify(o)}'`;
function timeBuckets(list,af){const mk=()=>({sold:0,followup:0,lost:0}),n=rangeDays(),out=[];
 if(n===1){let lo=10,hi=20;list.forEach(c=>{const h=c.at.getHours();lo=Math.min(lo,h);hi=Math.max(hi,h)});
  for(let h=lo;h<=hi;h++){const a=list.filter(c=>c.at.getHours()===h),v=mk();a.forEach(c=>v[c.outcome]++);const h12=h%12||12,ap=h<12?'am':'pm';
   out.push({label:h12+ap[0],vals:v,tip:`${h12} ${ap}|${plural(a.length,'conversation')}|${v.sold} ${Wd.soldLc} · ${v.followup} will return · ${v.lost} ${Wd.lostLc}${a.length&&af?'|Click to filter to this hour':''}`,attr:a.length&&af?af({hour:h}):''})}
  return {data:out,every:1}}
 for(let d=R().lo+n-1;d>=R().lo;d--){const a=list.filter(c=>c.d===d),dt=new Date(TODAY.getTime()-d*DAY),v=mk();a.forEach(c=>v[c.outcome]++);
  out.push({label:fdate(dt),vals:v,tip:`${fdate(dt)}|${plural(a.length,'conversation')}|${v.sold} ${Wd.soldLc} · ${v.followup} will return · ${v.lost} ${Wd.lostLc}${a.length&&af?'|Click to filter to this day':''}`,attr:a.length&&af?af({day:d}):''})}
 return {data:out,every:n<=7?1:5}}
function renderRep(id){
 const tab=(parseRep()||{}).tab||'overview',L=cur(),rows=repRows(L),row=rows.find(r=>r.rep.id===id),store=stats(L),rep=row.rep,s=row.s,pl=C.plan(id);
 const i=rows.indexOf(row),pv=rows[(i-1+rows.length)%rows.length].rep.id,nx=rows[(i+1)%rows.length].rep.id,sfx=tab==='overview'?'':'/'+tab;
 const from=NAV.find(n=>n[0]===S.from)||NAV[2],stt=C.status(id);
 const lost=row.L.filter(c=>c.outcome!=='sold'),byReason=Object.entries(groupBy(lost,c=>c.reason)).map(([k,v])=>({k,n:v.length,v:sumv(v)})).sort((a,b)=>b.v-a.v);
 const d=s.score-store.score,f0=pl&&pl.focus[0],peer=f0&&f0.groups[0]&&f0.groups[0].peers[0];
 const story=!s.n?`${esc(rep.first)} has no conversations ${inTxt()}.`:
  `${esc(rep.first)} scores <b>${s.score}</b>, ${d===0?'level with':Math.abs(d)+(d>0?' above':' below')} the ${Wd.store}, and closes <b>${pct(s.conv)}</b> of customers vs ${pct(store.conv)}.`+
  (byReason[0]?` Most money is lost to <a class="slink" href="#rep-${id}/conversations" ${rf({reason:byReason[0].k})}>${esc(lc(REASONS[byReason[0].k].label))}</a>, ${inr(byReason[0].v)}.`:'')+
  (f0?` Focus: <a class="slink" href="#rep-${id}/coaching">${esc(lc(f0.label))}</a>${peer&&!peer.fallback?`, where ${esc(peer.rep.first)}'s answer worked on the same objection`:''}.`:` Above the ${Wd.store} on every skill.`);
 const tabs=[['overview','Overview'],['coaching','Coaching'+(pl&&pl.focus.length?` · ${pl.focus.length}`:'')],['conversations',`Conversations · ${s.n}`]];
 const body=tab==='coaching'?C.renderPlan(id):tab==='conversations'?repConvs(id,row):repOverview(id,row,store,rows);
 return `<div class="rnav"><button class="link back" data-go="#${from[0]}">${ic('left',15)}${from[1]}</button><span style="flex:1"></span>
  <div class="rsw"><button class="iconbtn sm" data-go="#rep-${pv}${sfx}" aria-label="Previous rep" title="Previous rep">${ic('left',15)}</button><select data-repsel aria-label="Switch rep">${rows.map((r,x)=>`<option value="${r.rep.id}" ${r.rep.id===id?'selected':''}>${x+1}. ${esc(r.rep.name)}</option>`).join('')}</select><button class="iconbtn sm" data-go="#rep-${nx}${sfx}" aria-label="Next rep" title="Next rep">${ic('right',15)}</button></div></div>
 <div class="rephead"><span class="av">${esc(rep.ini)}</span><div class="grow"><h1>${esc(rep.name)}</h1><p>${rep.tenure?esc(rep.tenure)+' · ':''}${row.thin?'':`rank ${i+1} of ${rows.length} · `}<span class="pill ${row.status[0]}">${row.status[1]}</span>${pl&&!row.thin?` · Readiness <b class="num">${pl.readiness}</b>`:''}${stt[1]&&stt[1]!=='On track'?` · <span class="pill ${stt[0]}">${stt[1]}</span>`:''}</p></div>
  <button class="btn primary" data-act="copy" data-text="${esc(C.noteFor(id))}">${ic('copy',15)}Copy 1:1 note</button></div>
 <div class="lead"><span class="orb" aria-hidden="true"></span><p style="margin:0">${story}</p></div>
 <div class="tabs rtabs" role="tablist">${tabs.map(t=>`<button role="tab" aria-selected="${tab===t[0]}" data-go="#rep-${id}${t[0]==='overview'?'':'/'+t[0]}">${t[1]}</button>`).join('')}</div>
 <div class="rbody">${body}</div>`}

function repOverview(id,row,store,rows){
 const rep=row.rep,s=row.s,L=cur(),mine=row.L,p=stats(prev().filter(c=>c.rep===id));
 if(!s.n)return `<section class="card" style="text-align:center;padding:40px"><b>No conversations ${inTxt()}</b><p class="hint">Switch to 30 days, or check that ${esc(rep.first)} is recording conversations.</p></section>`;
 const RW=weekly(CONVS.filter(c=>c.rep===id)),SW=weekly(CONVS),rs=wk(RW,x=>x.score),first=rs.find(v=>v!=null),last=[...rs].reverse().find(v=>v!=null),ch=first!=null?last-first:0;
 const tiles=ZC.tile({label:'Conversation score',value:s.score,spark:SP(rs),sub:`${Wd.Store} ${store.score} · ${delta(s.score,p.score)}`})+
  ZC.tile({label:Wd.conv,value:pct(s.conv),spark:SP(wk(RW,x=>x.conv*100)),sub:`${Wd.Store} ${pct(store.conv)} · ${delta(s.conv,p.conv,{pts:true})}`})+
  ZC.tile({label:'Conversations recorded',value:s.n,spark:SP(wk(RW,x=>x.n)),sub:FLAT?`${mins(mine.reduce((x,c)=>x+c.dur,0))} with customers`:`${(s.n/rangeDays()).toFixed(1)} a day · ${delta(s.n,p.n)}`})+
  ZC.tile({label:Wd.closed,value:inr(s.soldValue),spark:SP(wk(RW,x=>x.soldValue)),sub:`${plural(s.sold,Wd.sale)} · ${delta(s.soldValue,p.soldValue)}`});
 const trend=ZC.lineChart({labels:SW.map(x=>x.label),series:[{name:rep.first,values:rs},{name:Wd.Store,values:wk(SW,x=>x.score),color:'#A39A8A'}],aria:`${rep.first}'s weekly conversation score against the store`});
 const gaps=SKILLS.map(k=>({k,mine:s.skill[k.id],st:store.skill[k.id],best:Math.max(...rows.map(r=>r.s.skill[k.id]))})),hiS=[...gaps].sort((a,b)=>(b.mine-b.st)-(a.mine-a.st));
 const skills=`<div class="skl-w">${gaps.map(g=>`<a class="skl" href="#rep-${id}/coaching" data-tip="${esc(`${g.k.label}|${rep.first} ${g.mine}|${Wd.Store} ${g.st} · Best rep ${g.best}`)}"><span class="s2"><b>${g.k.label}</b><span class="num"><b>${g.mine}</b> / ${g.st}</span></span><span class="bar"><i style="width:${g.mine}%;background:${scoreCol(g.mine)}"></i><span class="tick" style="left:${g.st}%"></span><span class="bestm" style="left:${g.best}%"></span></span></a>`).join('')}</div><div class="hint">Line = ${Wd.store} average, dot = best rep. Tap a skill for coaching.</div>`;
 const seg=(list,click)=>{const by=o=>list.filter(c=>c.outcome===o);return [['sold',Wd.sold],['followup','Will return'],['lost',Wd.lost]].map(([o,n])=>({name:n,n:by(o).length,color:ZC.OUTCOME[o],sub:inr(sumv(by(o))),attr:click?rf({outcome:o}):''}))};
 const outcomes=`<span class="mono">${esc(rep.first)}</span>`+ZC.splitBar(seg(mine,true))+`<span class="mono" style="margin-top:10px">${Wd.Store}</span>`+ZC.miniSplit(seg(L,false));
 const lk=[0,1,2,3].map(k=>({k,a:mine.filter(c=>c.outcome!=='sold'&&c.stage===k).length/s.n*100,b:L.filter(c=>c.outcome!=='sold'&&c.stage===k).length/L.length*100,n:mine.filter(c=>c.outcome!=='sold'&&c.stage===k).length}));
 const bigL=lk.reduce((a,b)=>b.a>a.a?b:a);
 const leak=ZC.pairList(lk.map(x=>({label:LEFT[x.k],a:x.a,b:x.b,text:Math.round(x.a)+'%',attr:rf({stage:String(x.k)}),tip:`${LEFT[x.k]}|${rep.first}: ${plural(x.n,'customer')} (${Math.round(x.a)}%)|${Wd.Store}: ${Math.round(x.b)}%`})),{aName:rep.first,bName:Wd.Store});
 const lost=mine.filter(c=>c.outcome!=='sold'),byR=Object.entries(groupBy(lost,c=>c.reason)).map(([k,v])=>({k,n:v.length,v:sumv(v)})).sort((a,b)=>b.v-a.v).slice(0,5);
 const reasons=ZC.barList(byR.map(x=>({label:REASONS[x.k].label,value:x.v,text:inr(x.v),attr:rf({reason:x.k}),tip:`${REASONS[x.k].label}|${plural(x.n,'customer')}|${inr(x.v)} not closed`})),{empty:'Every customer '+Wd.bought+' in this period.'});
 const ob=ZD.hasObjection?Object.entries(groupBy(mine.filter(c=>c.objection),c=>c.objection)).map(([k,v])=>({k,t:v.length,r:v.filter(c=>c.objResolved).length})).sort((a,b)=>b.t-a.t):[];
 const obT=ob.reduce((a,x)=>a+x.t,0),obR=ob.reduce((a,x)=>a+x.r,0);
 const objections=ZD.hasObjection?ZC.legend([{name:'Resolved',color:ZC.OUTCOME.sold},{name:'Not resolved',color:ZC.OUTCOME.lost}])+ZC.barList(ob.slice(0,5).map(x=>({label:REASONS[x.k].label,value:x.t,parts:[{v:x.r,color:ZC.OUTCOME.sold},{v:x.t-x.r,color:ZC.OUTCOME.lost}],text:`${x.r} of ${x.t}`,attr:`data-go="#rep-${id}/coaching"`,tip:`${REASONS[x.k].label}|Resolved ${x.r} of ${x.t}`})),{empty:'No objections recorded.'}):'<p class="hint empty">This file has no objection columns.</p>';
 const pers=Object.entries(groupBy(mine,c=>c.persona)).map(([k,v])=>{const all=L.filter(c=>c.persona===k);return {k,n:v.length,a:v.filter(c=>c.outcome==='sold').length/v.length*100,b:all.filter(c=>c.outcome==='sold').length/all.length*100}}).sort((a,b)=>b.n-a.n).slice(0,5);
 const bestP=[...pers].filter(x=>x.n>=3).sort((a,b)=>(b.a-b.b)-(a.a-a.b))[0];
 const persona=ZC.pairList(pers.map(x=>({label:PER[x.k].label,a:x.a,b:x.b,text:`${Math.round(x.a)}% · ${x.n}`,attr:rf({persona:x.k}),tip:`${PER[x.k].label}|${rep.first}: ${Math.round(x.a)}% of ${x.n} ${Wd.bought}|${Wd.Store}: ${Math.round(x.b)}%`})),{aName:rep.first,bName:Wd.Store,max:100});
 const TB=timeBuckets(mine);
 const act=ZC.columns({data:TB.data,h:120,w:560,every:TB.every,groups:[{key:'sold',name:Wd.sold,color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:Wd.lost,color:ZC.OUTCOME.lost}],aria:`${rep.first}'s conversations per day by result`});
 return `<div class="ktiles">${tiles}</div>
 <div class="cgrid3">
  ${FLAT?'':ZC.ccard(first==null?'Score trend':ch===0?'Score is flat over 8 weeks':`Score is ${ch>0?'up':'down'} ${Math.abs(ch)} pts in 8 weeks`,'vs '+Wd.store,trend)}
  ${ZC.ccard(`Strongest: ${SHORT[hiS[0].k.id]}. Weakest: ${SHORT[hiS[hiS.length-1].k.id]}`,'Score / '+Wd.store,skills)}
  ${ZC.ccard(`Closes ${pct(s.conv)}, ${Wd.store} closes ${pct(store.conv)}`,'Tap a result',outcomes)}
 </div>
 <div class="cgrid3">
  ${ZC.ccard(bigL.a?`Most leave ${AFTER[bigL.k]}`:'Where '+Wd.sales+' leak','% of conversations',leak)}
  ${ZC.ccard(byR[0]?`${esc(REASONS[byR[0].k].label)} costs the most`:'Why customers '+Wd.lostLc,'Value not closed',reasons)}
  ${ZC.ccard(obT?`Resolves ${obR} of ${obT} objections`:'Objections','Tap for coaching',objections)}
 </div>
 <div class="agrid">
  ${ZC.ccard(bestP&&bestP.a>bestP.b?`Best with ${esc(lc(PER[bestP.k].label))} customers`:'Conversion by customer type','% '+Wd.bought+' · conversations',persona,'a5')}
  ${FLAT?'':ZC.ccard(rangeDays()===1?`${plural(s.n,'conversation')} ${periodTxt()}, by hour`:`${(s.n/rangeDays()).toFixed(1)} conversations a day`,periodTxt(),act,'a7')}
 </div>`}

function repConvs(id,row){const f=S.rcf||{};
 const list=sortConvs(row.L.filter(c=>(!f.outcome||c.outcome===f.outcome)&&(!f.reason||c.reason===f.reason)&&(f.stage===undefined||(c.outcome!=='sold'&&c.stage===+f.stage))&&(!f.persona||c.persona===f.persona)));
 const lab={outcome:v=>'Result: '+({sold:Wd.sold,followup:'Will return',lost:Wd.lost}[v]),reason:v=>REASONS[v].label,stage:v=>'Left: '+lc(LEFT[v]),persona:v=>PER[v].label};
 const keys=Object.keys(f).filter(k=>lab[k]);
 const pages=Math.max(1,Math.ceil(list.length/PAGE));S.page=clamp(S.page,0,pages-1);const from=S.page*PAGE;
 return `<section class="card clistc"><div class="filters"><div class="activechips" style="flex:1">${keys.length?keys.map(k=>`<button class="achip" data-act="rcf-x" data-k="${k}">${esc(lab[k](f[k]))}${ic('x',14)}</button>`).join(''):`<span class="hint">${plural(list.length,'conversation')} ${inTxt()}. Tap one for the summary.</span>`}</div>
  <select data-rcf="outcome" aria-label="Result"><option value="">All results</option>${[['sold',Wd.sold],['followup','Will return'],['lost',Wd.lost]].map(o=>`<option value="${o[0]}" ${f.outcome===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>
  <select data-sort aria-label="Sort by">${[['date','Newest first'],['value','Highest value'],['score','Lowest score'],['scorehi','Highest score']].map(o=>`<option value="${o[0]}" ${S.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
 <div class="clist" style="margin-top:8px">${list.length?list.slice(from,from+PAGE).map(c=>convRow(c,true)).join(''):`<div style="padding:28px 8px;text-align:center"><b>No conversations match</b><p class="hint">Remove a filter to see more.</p></div>`}</div>
 ${list.length>PAGE?`<div class="pager"><span class="hint num">${from+1} to ${Math.min(from+PAGE,list.length)} of ${list.length}</span><div class="btnrow"><button class="btn sm" data-act="page" data-v="-1" ${S.page===0?'disabled':''}>${ic('left',14)}Previous</button><button class="btn sm" data-act="page" data-v="1" ${S.page>=pages-1?'disabled':''}>Next${ic('right',14)}</button></div></div>`:''}</section>`}

/* ---------- Conversations ---------- */
function convRow(c,own){const p=PRODUCTS[c.product];
 return `<button class="crow dense" data-conv="${c.id}">${rg(c,30)}<strong>${esc(c.customer)}</strong><small>${FLOOR?esc((c.models.length?c.models.join(' vs '):p.label)+' · '+(c.kind==='delivery'?'After the sale':QT[c.quote]||'')):esc(p.label)+' · '+esc(PER[c.persona].label)}${own?'':' · '+c.dur+' min'}</small><span class="c-rep">${own?c.dur+' min':repLink(c.rep,REP[c.rep].name)}</span><span class="c-val num">${valTxt(c)}</span><span>${outcomePill(c)}</span><span class="d num">${when(c)}</span></button>`}
function cfLabel(k,v){return {rep:()=>'Rep: '+REP[v].first,outcome:()=>'Result: '+({sold:Wd.sold,followup:'Will return',lost:Wd.lost}[v]),persona:()=>PER[v].label,product:()=>PRODUCTS[v].label,reason:()=>REASONS[v].label,stage:()=>'Left after: '+STAGES[v],comp:()=>'Mentioned '+COMP[v].label,kw:()=>'Said "'+v+'"',jstage:()=>(STAGES_J[v]||[v])[0],quote:()=>({yes:'Quotation given',no:'Left without a quotation',promised:'Quotation promised'})[v],intent:()=>'Intent: '+v,mgroup:()=>MG[v],prio:()=>'Cares about '+lc(v),fuel:()=>'Fuel: '+v,avail:()=>'Asked about availability',decision:()=>DEC[v]||v,day:()=>'On '+fdate(new Date(TODAY.getTime()-v*DAY)),hour:()=>'At '+((+v%12)||12)+(+v<12?' am':' pm')}[k]()}
function filtered(skipDay){const f=S.cf,q=(f.q||'').toLowerCase().trim();
 return allCur().filter(c=>(skipDay||((f.day===undefined||c.d===+f.day)&&(f.hour===undefined||c.at.getHours()===+f.hour)))&&(!f.rep||c.rep===f.rep)&&(!f.outcome||c.outcome===f.outcome)&&(!f.persona||c.persona===f.persona)&&(!f.product||c.product===f.product)&&(!f.reason||c.reason===f.reason)&&(f.stage===undefined||f.stage===''||(c.stage===+f.stage&&c.outcome!=='sold'))&&(!f.comp||c.competitor===f.comp)&&(!f.kw||c.kw.includes(f.kw))&&(!f.quote||(f.quote==='no'?c.quote!=='yes':c.quote===f.quote))&&(!f.jstage||c.jstage===f.jstage)&&(!f.intent||c.intent===f.intent)&&(!f.mgroup||mg(c)===f.mgroup)&&(!f.prio||c.prio.includes(f.prio))&&(!f.fuel||c.fuel.includes(f.fuel))&&(!f.avail||c.avail)&&(!f.decision||c.decision===f.decision)&&
  (!q||String(c.ref).toLowerCase().includes(q)||refNo(c)===q.replace(/^#/,'')||c.customer.toLowerCase().includes(q)||REP[c.rep].name.toLowerCase().includes(q)||PRODUCTS[c.product].label.toLowerCase().includes(q)||(c.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))))}
const PAGE=50;
function sortConvs(list){const k=S.sort;return k==='value'?[...list].sort((a,b)=>b.value-a.value):k==='score'?[...list].sort((a,b)=>a.score-b.score):k==='scorehi'?[...list].sort((a,b)=>b.score-a.score):list}
function convAnalytics(list){
 const n=list.length,by=o=>list.filter(c=>c.outcome===o),so=by('sold'),fu=by('followup'),lo=by('lost'),af=o=>`data-addf='${JSON.stringify(o)}'`;
 const split=ZC.splitBar([{name:Wd.sold,n:so.length,color:ZC.OUTCOME.sold,sub:inr(sumv(so)),attr:af({outcome:'sold'})},{name:'Will return',n:fu.length,color:ZC.OUTCOME.followup,sub:inr(sumv(fu)),attr:af({outcome:'followup'})},{name:Wd.lost,n:lo.length,color:ZC.OUTCOME.lost,sub:inr(sumv(lo)),attr:af({outcome:'lost'})}]);
 const dl=(S.cf.day!==undefined||S.cf.hour!==undefined)?filtered(true):list,TB=timeBuckets(dl,af);
 const time=ZC.columns({data:TB.data,h:128,every:TB.every,groups:[{key:'sold',name:Wd.sold,color:ZC.OUTCOME.sold},{key:'followup',name:'Will return',color:ZC.OUTCOME.followup},{key:'lost',name:Wd.lost,color:ZC.OUTCOME.lost}],aria:'Conversations per day, split by result'});
 const T=S.ctype,src=T==='reason'?list.filter(c=>c.outcome!=='sold'):list;
 const key={persona:c=>c.persona,product:c=>c.product,reason:c=>c.reason,rep:c=>c.rep}[T],lab={persona:k=>PER[k].label,product:k=>PRODUCTS[k].label,reason:k=>REASONS[k].label,rep:k=>REP[k].name}[T];
 const items=Object.entries(groupBy(src,key)).map(([k,v])=>{const sold=v.filter(c=>c.outcome==='sold').length;
  return {label:lab(k),value:v.length,text:T==='reason'?`${v.length} · ${inr(sumv(v))}`:`${v.length} · ${pct(sold/v.length)}`,attr:af({[T]:k}),tip:T==='reason'?`${lab(k)}|${plural(v.length,'customer')} left|${inr(sumv(v))} not closed`:`${lab(k)}|${plural(v.length,'conversation')}|${pct(sold/v.length)} ${Wd.bought}`}}).sort((a,b)=>b.value-a.value).slice(0,6);
 const types=[['persona','Customer type'],['product',Wd.product],['reason','Reason'],['rep','Rep']];
 const bins=[[0,39],[40,49],[50,59],[60,69],[70,79],[80,89],[90,100]].map(([a,b])=>{const m=list.filter(c=>c.score>=a&&c.score<=b).length;return {label:a===0?'<40':a+'s',vals:{n:m},tip:`Score ${a} to ${b}|${plural(m,'conversation')}`}});
 const sc=list.map(c=>c.score).sort((a,b)=>a-b),med=sc.length?sc[Math.floor(sc.length/2)]:0,low=list.filter(c=>c.score<55).length;
 const hist=ZC.columns({data:bins,h:150,w:260,every:1,groups:[{key:'n',name:'Conversations'}],aria:'Number of conversations by score band'});
 return `<div class="agrid">
  ${ZC.ccard(n?`${pct(so.length/n)} ${Wd.bought}, ${inr(sumv(lo))} walked out`:'Results','Tap a result to filter',split+(FLAT?'':`<div style="margin-top:14px">${time}</div>`),'a5')}
  ${ZC.ccard(T==='reason'?Wd.noBuy:'Who came in and who '+Wd.bought,T==='reason'?'Customers · value not closed':'Conversations · % '+Wd.bought,`<div class="seg mini" role="group" aria-label="Break down by">${types.map(t=>`<button data-act="ctype" data-v="${t[0]}" aria-pressed="${T===t[0]}">${t[1]}</button>`).join('')}</div>${ZC.barList(items)}`,'a4')}
  ${ZC.ccard(n?`Median score ${med}`:'Scores',n?`${plural(low,'conversation')} under 55`:'',hist,'a3')}
 </div>`}
function renderConversations(){const list=sortConvs(filtered()),tot=allCur().length;
 const active=['day','hour','persona','product','reason','stage','comp','kw','jstage','intent','mgroup','prio','fuel','avail','decision'].filter(k=>S.cf[k]!==undefined&&S.cf[k]!=='');
 const sel=(k,opts,ph)=>`<select id="f-${k}" data-cf="${k}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(o=>`<option value="${o[0]}" ${S.cf[k]===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>`;
 const pages=Math.max(1,Math.ceil(list.length/PAGE));S.page=clamp(S.page,0,pages-1);const from=S.page*PAGE,shown=list.slice(from,from+PAGE);
 return phead('Conversations',`${list.length} of ${tot} conversations ${inTxt()}. Charts and list follow the same filters.`)+
 `<details class="xband" ${RICH&&tot<8?'hidden':''} data-xk="conv-analytics" ${ZC.isOpen('conv-analytics',true)?'open':''}><summary><span class="mono">Analytics</span><span class="x-s">${list.length?`${pct(list.filter(c=>c.outcome==='sold').length/list.length)} ${Wd.bought} · ${inr(sumv(list))} discussed`:''}</span>${ic('chev',16)}</summary>${convAnalytics(list)}</details>
 ${S.cf.rep&&REP[S.cf.rep]?(()=>{const r=REP[S.cf.rep],rs=stats(cur().filter(c=>c.rep===r.id)),st=stats(cur());return `<div class="card cstrip">${ring(rs.score,40)}<div class="grow"><b>${esc(r.name)}</b><span class="hint num">Score ${rs.score} (${Wd.store} ${st.score}) · closes ${pct(rs.conv)} (${Wd.store} ${pct(st.conv)}) · ${plural(rs.n,'conversation')}</span></div><button class="btn sm" data-go="#rep-${r.id}">Open profile${ic('right',14)}</button><button class="btn sm" data-go="#rep-${r.id}/coaching">Coaching plan</button></div>`})():''}
 <section class="card clistc"><div class="filters stick"><input id="f-q" data-cf="q" type="search" placeholder="Customer, phone, rep, product or number" value="${esc(S.cf.q||'')}">${sel('rep',REPS.map(r=>[r.id,r.name]),'All reps')}${sel('outcome',[['sold',Wd.sold],['followup','Will return'],['lost',Wd.lost]],'All results')}${FLOOR?sel('quote',[['yes','Quotation given'],['no','No quotation'],['promised','Promised only']],'Any quotation'):''}<select data-sort aria-label="Sort by">${[['date','Newest first'],['value','Highest value'],['score','Lowest score'],['scorehi','Highest score']].map(o=>`<option value="${o[0]}" ${S.sort===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></div>
 ${active.length?`<div class="activechips" style="margin-top:12px">${active.map(k=>`<button class="achip" data-act="unfilter" data-k="${k}">${esc(cfLabel(k,S.cf[k]))}${ic('x',14)}</button>`).join('')}<button class="link" data-act="clearf">Clear all</button></div>`:''}
 <div class="clist" style="margin-top:8px">${list.length?shown.map(c=>convRow(c)).join(''):`<div style="padding:32px 8px;text-align:center"><b>No conversations match these filters</b><p class="hint">${FLAT?'Remove a filter to see more.':'Try the 30-day range or remove a filter.'}</p><button class="btn sm" data-act="clearf">Clear filters</button></div>`}</div>
 ${list.length>PAGE?`<div class="pager"><span class="hint num">${from+1} to ${Math.min(from+PAGE,list.length)} of ${list.length}</span><div class="btnrow"><button class="btn sm" data-act="page" data-v="-1" ${S.page===0?'disabled':''}>${ic('left',14)}Previous</button><button class="btn sm" data-act="page" data-v="1" ${S.page>=pages-1?'disabled':''}>Next${ic('right',14)}</button></div></div>`:''}</section>`}

/* ---------- Drawer ---------- */
function summaryFor(c){const b=summaryBase(c),s=c.sum||{};return {wanted:s.wanted||b.wanted,happened:s.happened||b.happened,why:s.why||b.why,next:s.next||b.next}}
function summaryBase(c){const rep=REP[c.rep],prod=PRODUCTS[c.product],R0=c.reason&&REASONS[c.reason],due=c.due,val=c.value?`, around ${inr(c.value)}`:'';
 return {wanted:`${PER[c.persona].label}. Looking at ${CAR?'the '+prod.label:lc(prod.label)}${val}.`,
  happened:c.outcome==='sold'?(CAR?`${rep.first} showed the ${prod.label} and took the booking.`:`${rep.first} showed ${lc(prod.label)} options and closed the sale.`):c.reason==='stock'?(CAR?'The customer wanted a variant we could not deliver soon.':'The customer wanted something we did not have in stock.'):`Got as far as "${STAGES[c.stage].toLowerCase()}". The customer left: ${R0.label.toLowerCase()}.`,
  why:c.outcome==='sold'?soldWhy(c):R0.skill?(c.skills[R0.skill]<60?`Weak step: ${SK[R0.skill].label.toLowerCase()} (scored ${c.skills[R0.skill]}).`:`${SK[R0.skill].label} scored ${c.skills[R0.skill]}, so this was not a skill gap. See the AI notes.`):(c.reason==='stock'?(CAR?'Supply gap, not a rep issue.':'Stock gap, not a rep issue.'):'Not tied to a specific rep skill.'),
  next:c.outcome==='sold'?(CAR?'Confirm the delivery date.':'No action needed. Invite them for the next occasion.'):c.outcome==='followup'?`Call back by ${fdate(due)}.${c.phone?'':' No phone saved.'}`:(c.phone?(CAR?'Share the on-road quote and current offers on WhatsApp.':'Share new designs on WhatsApp in 2 weeks.'):'No phone saved. Remind the team to save numbers.')}}
function soldWhy(c){const use=CAR?'use':'occasion',good=[],miss=[];[['need',CAR?'asked who will drive it':'asked the occasion'],['budget','asked the budget'],['close','agreed a next step']].forEach(([k,t])=>(c.skills[k]>=60?good:miss).push(t));
 return good.length===3?`Asked the ${use} and budget early, and agreed a next step.`:good.length?`${REP[c.rep].first} ${good.join(' and ')}. Missed: ${miss.join(', ')}.`:`The customer came in decided. The ${use} and budget were never asked, so this is a lucky ${Wd.sale}, not a repeatable one.`}
function momentsFor(c){const rep=REP[c.rep],m=[],seen=new Set();
 /* only things the data really says: no invented timeline, no canned lines */
 const add=x=>{const k=(x.hi||x.note||'').toLowerCase();if(k&&seen.has(k))return;if(k)seen.add(k);m.push(x)};
 if(c.objection&&c.objQuote&&REASONS[c.objection])add({k:'key',label:REASONS[c.objection].label,hi:c.objQuote,en:c.objQuoteEn||'',by:'Customer'});
 if(c.cq&&c.outcome!=='sold'&&REASONS[c.reason])add({k:'key',label:REASONS[c.reason].label,hi:c.cq,en:c.cqEn||'',by:'Customer'});
 if(c.reply)add({k:c.objResolved===true?'good':c.objResolved===false?'miss':'key',label:'How '+rep.first+' answered',hi:c.reply,en:c.replyEn||'',by:rep.first});
 if(c.competitor&&COMP[c.competitor])add({k:'key',label:'Mentioned '+COMP[c.competitor].label,note:COMP[c.competitor].offer||(CAR?'Compared with another brand.':'Compared with another store.'),by:'Customer'});
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
   <div class="turns" data-turns>${c.turns.map((t,i)=>`<div class="turn ${repNames.has(t.who)||/^(Staff|Rep|Other staff)$/.test(t.who)?'rep':''}" ${i>=TCHUNK?'hidden':''}><time>${mmss(t.t)}</time><div><b>${esc(t.who)}</b>${esc(t.text)}</div></div>`).join('')}</div>
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
/* ---------- Rich pilot view: the conversation is the unit. Used by one-day (snapshot) stores whose CSV carries times, rubric and promises. ---------- */
const h12=h=>(h%24)%12||12,ap=h=>(h%24)<12?'am':'pm';
const MK={na:['neutral','Not counted'],done:['good','Done'],partly:['warn','Partly'],missed:['bad','Missed']};
const cname=c=>/^Customer( \d+)?$/.test(c.customer)?'Customer at '+ftime(c.at):c.customer;
const rname=r=>r.name==='Rep not tagged'?'Rep not noted':r.name;
const tRange=c=>{if(!c.endAt)return ftime(c.at);const a=ftime(c.at),b=ftime(c.endAt);return (a.slice(-2)===b.slice(-2)?a.slice(0,-3):a)+' to '+b};
const mmssSec=t=>{const m=String(t||'').match(/^(\d+):(\d{2})$/);return m?+m[1]*60+ +m[2]:0};
const clk=(c,s)=>ftime(new Date(c.at.getTime()+((c.startSec||0)+s)*1000));
const SIDE=/^(Background|Other voice)$/;
const rg=(c,sz)=>c.scored===false?`<span class="noscore" style="width:${sz}px;height:${sz}px" title="Score not available yet">–</span>`:ring(c.score,sz);
const PDONE=new Set((()=>{try{return JSON.parse(localStorage.getItem('zocus-pdone-'+(ZD.storeId||''))||'[]')}catch(e){return []}})());
const savePdone=()=>{try{localStorage.setItem('zocus-pdone-'+ZD.storeId,JSON.stringify([...PDONE]))}catch(e){}};
function openPromises(L){const out=[];L.forEach(c=>c.promises.forEach((p,i)=>{const key=c.id+':'+i;out.push({c,p,i,key,done:PDONE.has(key)})}));return out.sort((a,b)=>a.c.at-b.c.at)}
function dueBy(c,p){const s=p.due||'';let m,mn=null;if((m=s.match(/(\d+|an|one) hours?/i)))mn=(/^\d+$/.test(m[1])?+m[1]:1)*60;else if((m=s.match(/(\d+) min/i)))mn=+m[1];return mn==null||!c.endAt?null:new Date(c.endAt.getTime()+mn*6e4)}
const promiseRow=(x,full)=>{const c=x.c,p=x.p,by=dueBy(c,p);
 return `<div class="prom ${x.done?'done':''}"><div class="pm"><b>${esc(p.t)}${p.s?' <span class="pill neutral">Suggested</span>':''}</b><span class="hint">${esc(cname(c))} · ${esc(rname(REP[c.rep]))} · call ended ${ftime(c.endAt||c.at)}${p.due?` · <b>${esc(p.due)}</b>${by?' (around '+ftime(by)+')':''}`:''}</span>
  ${full&&p.q?`<div class="quote key"><div class="hi">"${esc(p.q)}"</div><div class="by">What was said</div>${jumpBtn(c,p.q)}</div>`:''}${full&&p.d?`<div class="draft">${esc(p.d)}</div>`:''}</div>
  <div class="btnrow">${p.d?`<button class="btn sm" data-act="copy" data-text="${esc(p.d)}">${ic('copy',14)}Copy message</button>`:''}<button class="btn sm" data-conv="${c.id}">Open</button><button class="btn sm ${x.done?'':'primary'}" data-act="pdone" data-key="${x.key}">${x.done?'Undo':'Mark done'}</button></div></div>`};
function dayTimeline(L){if(!L.length)return '';
 const end=c=>(c.endAt||new Date(c.at.getTime()+c.dur*6e4)).getTime(),t0=Math.min(...L.map(c=>c.at.getTime())),t1=Math.max(...L.map(end));
 const a=new Date(t0-10*6e4);a.setMinutes(a.getMinutes()<30?0:30,0,0);const b=new Date(t1+10*6e4);b.setMinutes(b.getMinutes()<=30?30:60,0,0);
 const lo=a.getTime(),sp=Math.max(b.getTime()-lo,36e5),ticks=[];const t=new Date(lo);if(t.getMinutes())t.setHours(t.getHours()+1,0,0,0);for(;t.getTime()<=lo+sp;t.setHours(t.getHours()+1))ticks.push(new Date(t));
 const blocks=L.map(c=>{const s=c.at.getTime(),w=Math.max((end(c)-s)/sp*100,1.6);return `<button class="tlb" data-conv="${c.id}" style="left:${((s-lo)/sp*100).toFixed(2)}%;width:${w.toFixed(2)}%;background:${c.kind==='delivery'?'#7B61FF':ZC.OUTCOME[c.outcome]}" title="${esc(tRange(c)+' · '+rname(REP[c.rep])+' · '+(c.kind==='delivery'?(c.resultLabel||'Delivery issue'):({sold:Wd.sold,followup:'Will return',lost:Wd.lost})[c.outcome]))}" aria-label="${esc(cname(c)+', '+tRange(c))}"><span>${w>6?c.dur+' min':''}</span></button>`}).join('');
 return `<section class="card tlcard"><div class="card-h"><h2>The day so far</h2><span class="hint">One block per conversation, start to end</span></div>
  <div class="tl">${blocks}${ticks.map(d=>`<i class="tlt" style="left:${((d.getTime()-lo)/sp*100).toFixed(2)}%"></i>`).join('')}</div>
  <div class="tlax">${ticks.map(d=>`<span style="left:${((d.getTime()-lo)/sp*100).toFixed(2)}%">${h12(d.getHours())} ${ap(d.getHours())}</span>`).join('')}</div>
  ${ZC.legend([{name:Wd.sold,color:ZC.OUTCOME.sold},{name:'Will return',color:ZC.OUTCOME.followup},{name:Wd.lost,color:ZC.OUTCOME.lost}].concat(L.some(c=>c.kind==='delivery')?[{name:'After the sale',color:'#7B61FF'}]:[]))}</section>`}

const STAGES_J={exploring:['Exploring','early enquiries'],finalising:['Finalising model and price','model, variant, price, finance'],after_booking:['After booking','accessories, payment, delivery']};
const stageChip=c=>c.jstage&&STAGES_J[c.jstage]?`<span class="chip2 stg stg-${c.jstage}">${STAGES_J[c.jstage][0]}</span>`:'';
const floorNote=()=>ZD.meta&&ZD.meta.dayNote?`<p class="floornote">${esc(ZD.meta.dayNote)}</p>`:'';
/* three small additions to the original Overview, only when there is something to say */
function alertLine(D){if(!D.length)return '';const c=D[0];
 return `<button class="alertline" data-conv="${c.id}"><span class="adot" aria-hidden="true"></span><b>${plural(D.length,'delivery-day conversation')} ${D.length===1?'needs':'need'} attention</b><span class="atxt">${esc(c.resultLabel||'After the sale')} at ${ftime(c.at)}${(c.sumOutcome||c.sumNext)?' · '+esc(clipTxt(c.sumOutcome||c.sumNext,150)):''}</span>${ic('right',14)}</button>`}
const STAGE_SHORT={exploring:'Exploring',finalising:'Finalising',after_booking:'After booking'};
function stageBar(LD){const ks=Object.keys(STAGE_SHORT).filter(k=>LD.some(c=>c.jstage===k));if(!ks.length)return '';
 return `<div class="stagebar"><span class="hint">Where customers are</span>${ks.map(k=>`<button class="chip2 stg stg-${k}" data-filter='${JSON.stringify({jstage:k})}'><b class="num">${LD.filter(c=>c.jstage===k).length}</b> ${STAGE_SHORT[k]}</button>`).join('')}</div>`}
function richLede(L,open,nd){const n=L.length;if(!n)return nd?`<b>No sales conversations yet.</b> ${open?`<b>${plural(open,'follow-up')} open.</b>`:''}`:'No conversations yet.';const q=L.filter(c=>c.quote==='yes').length,b=L.filter(c=>c.outcome==='sold').length;
 return `<b>${plural(n,'conversation')} so far</b> (${mins(L.reduce((a,c)=>a+c.dur,0))}). ${q===n?(n===1?'The customer':'Every customer')+' left with a quotation':q+' of '+n+' customers left with a quotation'}${b?`, ${b} booked`:', none booked yet'}. ${open?`<b>${plural(open,'follow-up')} open.</b>`:'No follow-ups waiting.'}`}
function modelsLine(L){const m={};L.forEach(c=>c.models.forEach(x=>m[x]=(m[x]||0)+1));const e=Object.entries(m).sort((a,b)=>b[1]-a[1]);return e.length?`<p class="hint" style="margin:0 2px 14px">Models talked about: ${e.map(([k,v])=>`<b style="color:var(--ink)">${esc(k)}</b> ${v}`).join(' · ')}</p>`:''}
function richKpis(L,D,s){const quotedOpen=sumv(L.filter(c=>c.outcome!=='sold')),tot=L.reduce((a,c)=>a+c.dur,0),quoted=L.filter(c=>c.quote==='yes').length;
 return ` <section class="kpis" data-tour="kpis">
  ${kpi({label:Wd.conv,tag:'Output',val:s.n?pct(s.conv):'–',sub:`${s.sold} of ${s.n} customers · ${quoted} left with a quotation`,delta:'',go:'#insights'})}
  ${kpi({label:Wd.closed,tag:'Output',val:s.soldValue?inr(s.soldValue):'–',sub:s.soldValue?Wd.tagged:(quotedOpen?`None booked yet · ${inr(quotedOpen)} quoted so far`:'None booked yet'),delta:'',filter:{outcome:'sold'}})}
  ${kpi({label:'Conversations recorded',tag:'Input',val:s.n,sub:`${mins(tot)} with customers${D.length?` · plus ${D.length} after booking`:''}`,delta:'',go:'#team'})}
 </section>`}
function renderReport(){const LD=[...allCur()].sort((a,b)=>a.at-b.at),L=cur(),D=DELV(),s=stats(L),m=ZD.meta||{};
 return `<div class="rpt"><div class="rpthead"><div><span class="mono">Day report</span><h1>${esc(ZD.store)}</h1><p class="hint">${WDL[TODAY.getDay()]} ${fdate(TODAY)} · ${plural(LD.length,'conversation')}${m.exportedLocal?' · data as of '+esc(String(m.exportedLocal).slice(11)):''}</p></div><div class="btnrow noprint"><button class="btn primary" data-act="print">${ic('down',14)}Save as PDF</button><button class="btn" data-go="#home">Back to the dashboard</button></div></div>
 ${richKpis(L,D,s)}${stageBar(LD)}${dayTimeline(LD)}
 <section class="card"><div class="card-h"><h2>The day in one table</h2><span class="hint">Each conversation is set out in full below</span></div><div class="tblwrap"><table class="tbl"><thead><tr><th>Time</th><th>Rep</th><th>Model</th><th>Visit</th><th>Result</th><th class="r">Value</th><th>Next step</th></tr></thead><tbody>${LD.map(c=>`<tr><td class="num">${tRange(c)}</td><td>${esc(rname(REP[c.rep]))}</td><td>${esc(PRODUCTS[c.product].label)}</td><td>${c.visit==='repeat'?'Repeat':c.visit==='first'?'First':'–'}</td><td>${outcomePill(c,true)}</td><td class="r num">${c.kind==='delivery'?'–':valTxt(c)}</td><td>${esc(clipTxt((c.promises.find(p=>!p.s)||c.promises[0]||{}).t||c.sumNext||'',90))}</td></tr>`).join('')}</tbody></table></div></section>
 ${LD.map((c,i)=>{const p=richParts(c,true);return `<section class="rptconv"><span class="mono">Conversation ${i+1} of ${LD.length}</span>${p.head}<div class="dbody">${p.body}</div></section>`}).join('')}
 <p class="hint">Full transcripts, with English under the key lines, are in the dashboard. Rupee values marked ~ are the model's typical price, not a quote.</p></div>`}
function renderHomeRich(){const L=cur(),D=DELV(),LD=allCur(),s=stats(L),rows=repRows(L),P=openPromises(LD),open=P.filter(x=>!x.done),short={good:'Top',neutral:'On track',bad:'Coach'};
 /* "Do these next" is the original card; the promises made in today's conversations are its entries (the usual coaching actions take over when none are open) */
 let acts=[];if(!open.length&&L.length){try{acts=computeActions(L)}catch(e){acts=[]}}
 const entries=open.length?open.slice(0,4).map((x,i)=>{const by=dueBy(x.c,x.p);return `<div class="act"><span class="n">${i+1}</span><div><h3>${esc(x.p.t)}</h3><p>${x.p.s?'Suggested · ':''}${esc(cname(x.c))} · ${esc(rname(REP[x.c.rep]))}${x.p.due?' · '+esc(x.p.due)+(by?' (around '+ftime(by)+')':''):''}</p></div><div class="r">${x.p.d?`<button class="btn sm" data-act="copy" data-text="${esc(x.p.d)}">${ic('copy',14)}Copy message</button>`:''}<button class="btn ${i===0?'primary':''} sm" data-conv="${x.c.id}">Open${ic('right',14)}</button></div></div>`}).join('')
  :acts.length?acts.map((a,i)=>`<div class="act"><span class="n">${i+1}</span><div><h3>${a.title}</h3><p>${a.body}</p></div><div class="r">${a.impact?`<span class="pill gold num">${inr(a.impact)}</span>`:''}<button class="btn ${i===0?'primary':''} sm" ${a.filter?`data-filter='${JSON.stringify(a.filter)}'`:`data-go="${a.go}"`} ${a.tab?`data-tab="${a.tab}"`:''}>${a.btn}${ic('right',14)}</button></div></div>`).join(''):'<p class="hint" style="margin:0">No follow-ups so far.</p>';
 const next=`<section class="card" data-tour="actions"><div class="card-h"><h2>Do these next</h2>${open.length?`<button class="link" data-go="#followups">All ${P.length} follow-ups${ic('right',14)}</button>`:'<span class="hint">Ranked by customers</span>'}</div><div class="acts">${entries}</div></section>`;
 const team=`<section class="card" data-tour="pulse"><div class="card-h"><h2>Team at a glance</h2><button class="link" data-go="#team">Full team${ic('right',14)}</button></div>
  <div class="pulse">${rows.map(r=>`<button class="pchip" data-go="#rep-${r.rep.id}">${rg({scored:r.s.n>0,score:r.s.score},54)}<b>${esc(r.rep.first)}</b><span class="pill ${r.status[0]}">${r.thin?plural(r.s.n,'chat'):short[r.status[0]]}</span></button>`).join('')}</div>
  <p class="hint" style="margin:10px 0 0">Ring shows conversation score out of 100. ${Wd.Store} average ${s.score}.${rows.some(r=>r.thin)?' Reps with fewer than 3 conversations are not rated yet.':' Tap a rep to coach.'}</p></section>`;
 return `${alertLine(D)}<div class="homegrid"><section class="hero" data-tour="brief">
  <span class="mono">${ic('spark',14)} AI briefing · ${esc(ZD.store)} · ${WDL[TODAY.getDay()]} ${fdate(TODAY)}</span>
  <h1>${greet()}</h1>
  <p class="lede">${richLede(L,open.filter(x=>!x.p.s).length,D.length)}</p>${floorNote()}
  </section>${timelessPanel(s)}</div>
  <div class="waveband" data-wave-anchor aria-hidden="true"><span class="wavehint">Live voice waves · hover or click</span></div>
 ${richKpis(L,D,s)}
 ${stageBar(LD)}${valueNote(L)}${L.length>=8?floorCards(L):modelsLine(L)}
 <div class="homegrid2">${next}${team}</div>${dayTimeline(LD)}${dayCards(L)}`}

const CHK_GROUP=[['need','Understanding the need',['need']],['budget','Asking the budget',['budget']],['pitch','Showing the right model',['options','experience','value_proof']],['objection','Handling price doubts',['price_offers','concerns']],['close','Closing and next step',['decision_timing','ask','next_step']]];
function richChecks(c){if(!c.scored||!c.aiChecks.length)return `<p class="hint" style="margin:8px 0 0">Score not available yet.</p>`;
 return CHK_GROUP.map(([k,t,ids])=>{const xs=ids.map(id=>c.aiChecks.find(x=>x.id===id)).filter(Boolean);if(!xs.length)return '';
  return `<div class="chkgrp"><div class="chkh"><b>${t}</b>${xs.every(x=>x.mark==='na')?'<span class="hint">not counted at this stage</span>':`<span class="hint num">${c.skills[k]} out of 100</span>`}</div>${xs.map(x=>`<div class="chk"><span class="pill ${MK[x.mark][0]}">${MK[x.mark][1]}</span><div>${esc(x.label)}${x.id==='experience'?' <span class="hint">(the dealer says this matters less; it is not in the score)</span>':''}${x.why?`<small>${esc(x.why)}</small>`:''}${x.quote?`<div class="chkq">"${esc(x.quote)}"${jumpBtn(c,x.quote)}</div>`:''}</div></div>`).join('')}</div>`}).join('')}
function richTranscript(c){if(!c.turns)return c.transcript?ZC.xcard('tx-'+c.id,'Transcript',`${c.transcript.split(/\s+/).length} words`,`<pre class="tscript">${esc(c.transcript)}</pre>`,{open:false,cls:'txcard'}):'';
 const n=c.turns.length,w=c.transcript.split(/\s+/).length;let rows='',side=[],shown=0;
 const flush=()=>{if(side.length){rows+=`<details class="sidetalk"><summary>Side talk, ${plural(side.length,'line')} (phone calls or people not in the conversation)</summary>${side.map(t=>`<div class="sidel"><time>${clk(c,t.t)}</time><span>${esc(t.text)}</span></div>`).join('')}</details>`;side=[]}};
 c.turns.forEach(t=>{if(SIDE.test(t.who)){side.push(t);return}flush();const isRep=t.who==='Rep',en=c.trEn&&c.trEn[mmss(t.t)];
  rows+=`<div class="turn ${isRep?'rep':''}" ${shown>=TCHUNK?'hidden':''}><time title="${mmss(t.t)} into the recording">${clk(c,t.t)}</time><div><b>${esc(isRep?rname(REP[c.rep]):t.who)}</b>${esc(t.text)}${en?`<span class="en">${esc(en)}</span>`:''}</div></div>`;shown++});flush();
 return ZC.xcard('tx-'+c.id,'Transcript',`${n} turns · ${w} words · English shown for key lines`,
  `<input class="tsearch" type="search" placeholder="Search this conversation" data-tsearch aria-label="Search this conversation"><div class="turns" data-turns>${rows}</div>${shown>TCHUNK?`<button class="link" data-act="tmore" style="margin-top:8px">Show more of the conversation</button>`:''}<p class="tsnote" data-tcount>${shown>TCHUNK?`Showing the first ${TCHUNK} of ${shown} turns. `:''}Times are the clock time of the line.</p>`,{open:false,cls:'txcard'})}
function richParts(c,rpt){const rep=REP[c.rep],sm=summaryFor(c),ms=momentsFor(c),card=(t,b,cls)=>b?`<section class="card ${cls||''}"><span class="eyebrow">${t}</span>${b}</section>`:'';
 const chip=t=>`<span class="chip2">${esc(t)}</span>`,row=(k,v)=>v?`<dt>${k}</dt><dd>${v}</dd>`:'';
 const brief=[['Customer need',c.sumNeed||sm.wanted],['What happened',c.sumHappened||sm.happened],['Outcome',c.sumOutcome],['Why',c.sumWhy||sm.why],['Next step',c.sumNext||sm.next]].filter(x=>x[1]);
 const wants=row('Models',c.models.map(chip).join(' '))+row('Fuel',c.fuel.map(chip).join(' '))+row('Colour',c.colour.map(chip).join(' '))+row('Looking for',esc(c.fPref))+row('Budget',esc(c.fBudget))+row('When',esc(c.fTiming))+row('Compared with',esc(c.fComp));
 const prices=c.prices.length?`<div class="tblwrap"><table class="tbl pricetbl"><thead><tr><th>Model or variant</th><th class="r">Price</th><th>As said</th><th class="r">At</th></tr></thead><tbody>${c.prices.map(p=>`<tr><td>${esc(p.m)}</td><td class="r num"><b>${typeof p.p==='number'?(p.p<100000?'₹'+p.p.toLocaleString('en-IN'):inr(p.p)):esc(p.p)}</b></td><td>${esc(p.b||'')}</td><td class="r num">${esc(p.at||'')}</td></tr>`).join('')}</tbody></table></div>${c.prices.length>2&&c.prices.some(p=>/final offer|since March|insurance still/i.test(p.b))?'<p class="hint" style="margin:8px 0 0">The quote moved during the conversation.</p>':''}`:'';
 const ST={done:'Answered',partly:'Partly answered',open:'Not answered',answered:'Answered',resolved:'Answered'};
 const conc=c.concerns.length?c.concerns.map(x=>`<div class="chk"><span class="pill ${/answered|resolved|done/.test(x.s)?'good':x.s==='partly'?'warn':'bad'}">${ST[x.s]||'Partly answered'}</span><div>${esc(x.t)}${x.a?`<small>${esc(x.a)}</small>`:''}</div></div>`).join(''):'';
 const prom=c.promises.length?c.promises.map((p,i)=>promiseRow({c,p,i,key:c.id+':'+i,done:PDONE.has(c.id+':'+i)},true)).join(''):'';
 const words=ms.length?`<div style="margin-top:2px">${ms.map(m=>`<div class="moment"><span class="lbl">${esc(m.label.replace('How '+rep.first+' answered','How the rep answered'))} <span class="pill ${m.by==='Customer'?'gold':m.k==='good'?'good':m.k==='miss'?'bad':'neutral'}">${m.by==='Customer'?'Customer':esc(m.by===rep.first?rname(rep):m.by)}</span></span>${m.hi?`<div class="quote ${m.k==='key'?'key':m.k==='miss'?'bad':''}"><div class="hi">"${esc(m.hi)}"</div>${m.en&&m.en!==m.hi?`<div class="en">${esc(m.en)}</div>`:''}${jumpBtn(c,m.hi)}</div>`:`<div class="note">${esc(m.note||'')}</div>`}</div>`).join('')}</div>`:'';
 const VIS={repeat:'Repeat visit',first:'First visit'},wait=(()=>{const m=String(c.arrived||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const a=new Date(c.at);a.setHours(+m[1],+m[2],0,0);const d=Math.round((c.at-a)/6e4);return d>=0&&d<240?d:null})();
 const visit=c.visit||c.visitHistory||wait!=null||c.needForm?`<p style="margin:8px 0 0">${c.visit?`<b>${VIS[c.visit]||''}.</b> `:''}${esc(c.visitHistory||'')}</p>${wait!=null?`<p style="margin:6px 0 0"><b>Waited ${wait} min</b> <span class="hint">from the counter punch-in at ${esc(c.arrived)} to the start of the conversation</span></p>`:''}${c.needForm?`<p style="margin:6px 0 0"><span class="hint">Need-analyzer form:</span> ${esc(c.needForm)}</p>`:''}`:'';
 const stock=c.stock?`<dl class="sumgrid" style="margin:10px 0 0">${row('Wanted',esc(c.stock.want||''))}${row('In hand',esc(c.stock.have||''))}${row('What else was offered',esc(c.stock.alt||''))}</dl>`:'';
 const OV={answered:['good','Answered'],partly:['warn','Partly answered'],open:['bad','Not settled']};
 const objs=c.objections.length?`<p class="hint" style="margin:6px 0 0">${plural(c.objections.length,'objection')}: ${['answered','partly','open'].map(k=>[c.objections.filter(o=>o.v===k).length,OV[k][1].toLowerCase()]).filter(x=>x[0]).map(x=>x[0]+' '+x[1]).join(', ')}.</p>${c.objections.map(o=>`<details class="objx"${rpt?' open':''}><summary><span class="pill ${OV[o.v][0]}">${OV[o.v][1]}</span><b>${esc(o.t)}</b><span class="hint num">${esc(clk(c,mmssSec(o.at)))}</span></summary><div class="objb"><p><span class="hint">Customer</span>${esc(o.q)}</p><p><span class="hint">${esc(rname(rep))}</span>${esc(o.a)}</p>${o.tip?`<p class="objtip"><span class="hint">Suggested · Zocus playbook</span>${esc(o.tip)}</p>`:''}</div></details>`).join('')}`:'';
 const met=c.scored?c.aiChecks.filter(x=>x.mark==='done').length:0,counted=c.aiChecks.filter(x=>x.mark!=='na').length,nac=c.aiChecks.some(x=>x.mark==='na');
 const head=`<div class="dhead">${rg(c,46)}<div style="flex:1;min-width:0"><h2>${esc(cname(c))} ${outcomePill(c,true)}</h2><p>${repLink(rep.id,rname(rep))} · <b>${tRange(c)}</b> · ${c.dur} min · #${refNo(c)}${c.phone?' · '+esc(c.phone):''}</p>${c.kind==='delivery'?'':c.value?`<p class="dprice"><b class="num">${valTxt(c)}</b> <span class="hint">${esc(valSrc(c))}</span></p>`:`<p class="dprice"><b class="num">–</b> <span class="hint">no price said in the call</span></p>`}${c.flags.length||c.jstage?`<div class="dflags">${stageChip(c)}${c.flags.map(f=>`<span class="pill neutral">${esc(f)}</span>`).join('')}</div>`:''}</div>${rpt?'':`<button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button>`}</div>`;
 const body=`  ${card('In brief',`<dl class="sumgrid" style="margin:10px 0 0">${brief.map(([k,v])=>`<dt>${k}</dt><dd>${k==='Next step'?`<b>${esc(v)}</b>`:esc(v)}</dd>`).join('')}</dl>`)}
  ${card('This visit',visit)}
  ${card('Payment',c.payment?`<p style="margin:8px 0 0">${esc(c.payment)}</p>`:'')}
  ${card('What the customer wants',`<dl class="sumgrid" style="margin:10px 0 0">${wants}</dl>`)}
  ${card('Stock match',stock)}
  ${card(c.kind==='delivery'?'Prices mentioned':'Prices quoted',prices)}
  ${objs?card('Objections and answers',objs):card('Customer concerns',conc)+card('In their words',words)}
  ${card('Follow-ups',prom)}
  ${c.kind==='delivery'?card('How the rep did','<p class="hint" style="margin:8px 0 0">Not scored. This was a delivery-day conversation, not a sales conversation, so the sales checks do not apply.</p>'):card('How the rep did',`<div class="hint" style="margin:6px 0 0">${c.scored?`${met} of ${counted} checks done · score ${c.score} out of 100`:''}${nac?'. This customer had already chosen a model, so understanding the need and asking the budget are not marked.':''}</div>${richChecks(c)}`)}
  ${rpt?'':richTranscript(c)}
  ${card('Notes from the floor',c.remarks?`<p style="margin:8px 0 0">${esc(c.remarks)}</p>`:'')}
  ${rpt?'':`<div class="card soon"><span class="eyebrow">Audio</span><p>Recorded ${tRange(c)}${c.analysedAt?` · analysed ${ftime(c.analysedAt)}`:''}. Audio playback will be added later.</p></div>`}`;
 return {head,body}}
function richDrawer(c){const p=richParts(c);document.getElementById('drawerRoot').innerHTML=`<div class="drawer-scrim" data-act="close"></div><aside class="drawer rich" role="dialog" aria-modal="true" aria-label="Conversation with ${esc(cname(c))}"><span class="grab" aria-hidden="true"></span>
 ${p.head}
 <div class="dbody">${p.body}</div></aside>`;
 const cl=document.querySelector('.drawer [data-act="close"].iconbtn');if(cl)cl.focus()}
function renderFollowupsRich(){const L=CONVS,P=openPromises(L),open=P.filter(x=>!x.done),done=P.filter(x=>x.done);
 return phead('Follow-ups','What was promised to each customer today, and what we suggest doing next. Each has a message the rep can send.')+(P.length?`<section class="card">${open.map(x=>promiseRow(x,true)).join('')||'<p class="hint" style="margin:0">All promises are marked done.</p>'}</section>${done.length?`<div class="section-t" style="margin-top:18px"><h2>Done</h2></div><section class="card">${done.map(x=>promiseRow(x,false)).join('')}</section>`:''}`:`<section class="card" style="text-align:center;padding:40px"><b>Nothing promised so far</b><p class="hint">Promises the rep makes in a conversation appear here with a ready message.</p></section>`)}
function openDrawer(id){S.drawer=+id;drawDrawer()}
function closeDrawer(){S.drawer=null;document.getElementById('drawerRoot').innerHTML=''}
function drawDrawer(){const c=CONV[S.drawer];if(!c)return;if(RICH)return richDrawer(c);const rep=REP[c.rep],sm=summaryFor(c),ms=momentsFor(c);
 document.getElementById('drawerRoot').innerHTML=`<div class="drawer-scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Conversation with ${esc(c.customer)}"><span class="grab" aria-hidden="true"></span>
 <div class="dhead">${rg(c,46)}<div style="flex:1;min-width:0"><h2>${esc(c.customer)} ${outcomePill(c)}</h2><p>${SNAP?'Rep: ':'Recorded by '}${repLink(rep.id,rep.name)} · ${TL?'':'#'+refNo(c)+' · '}${when(c)} · ${c.dur} min${c.talkRep!=null?` · rep voice ${c.talkRep}% of words`:''}${c.phone?' · '+c.phone:''}${ZD.has.valueSrc?' · '+(c.value?valTxt(c)+' ('+valSrc(c)+')':'value not known'):''}</p></div><button class="iconbtn" data-act="close" aria-label="Close">${ic('x')}</button></div>
 <div class="dbody">
  <section class="card"><span class="eyebrow">In 30 seconds</span><dl class="sumgrid" style="margin:10px 0 0"><dt>Wanted</dt><dd>${esc(sm.wanted)}</dd><dt>What happened</dt><dd>${esc(sm.happened)}</dd><dt>${c.outcome==='sold'?'Why it worked':'Why not closed'}</dt><dd>${esc(sm.why)}</dd>${FLOOR?`<dt>On the floor</dt><dd>${esc([c.models.length?c.models.join(' vs '):'No model named',c.fuel.join('/'),c.colour.length?c.colour.join(', '):'',QT[c.quote]||'',c.td==='yes'?'test drive taken':c.td==='offered'?'test drive talked about':'no test drive',c.avail?'asked about availability':'',c.intent?c.intent+' intent':''].filter(Boolean).join(' · '))}${c.prio.length?`<br><span class="hint">Cares about: ${esc(c.prio.join(', '))}</span>`:''}${c.availQ?`<br><span class="hint">"${esc(clipTxt(c.availQ,140))}"</span>`:''}</dd>`:''}<dt>Next step</dt><dd><b>${esc(sm.next)}</b></dd></dl></section>
  ${aiCard(c)}
  ${checksCard(c)}
  ${transcriptCard(c)}
  <div class="card soon"><span class="eyebrow">Recording and transcript timeline</span><p>Coming soon. For now this panel shows the numbers and what the AI wrote about the conversation.</p></div>
  <section class="card"><span class="eyebrow">What was said</span><div style="margin-top:6px">${ms.length?ms.map(m=>`<div class="moment"><span class="lbl">${esc(m.label)} <span class="pill ${m.by==='Customer'?'gold':m.k==='good'?'good':m.k==='miss'?'bad':'neutral'}">${m.by==='Customer'?'Customer':esc(m.by)}</span></span>${m.hi?`<div class="quote ${m.k==='key'?'key':m.k==='miss'?'bad':''}"><div class="hi">"${esc(m.hi)}"</div>${m.en&&m.en!==m.hi?`<div class="en">${esc(m.en)}</div>`:''}${jumpBtn(c,m.hi)}</div>`:`<div class="note">${esc(m.note||'')}</div>`}</div>`).join(''):'<p class="hint" style="margin:0">No quotes captured for this conversation.</p>'}</div></section>
  <section class="card"><span class="eyebrow">Where this sits</span>${(()=>{const ra=stats(cur().filter(x=>x.rep===c.rep)).score||c.score,sa=stats(cur()).score||c.score;return `<div class="bar cmp"><i style="width:${c.score}%;background:${scoreCol(c.score)}"></i><span class="tick" style="left:${ra}%"></span><span class="tick st" style="left:${sa}%"></span></div><p class="hint num" style="margin:0">This conversation <b style="color:var(--ink)">${c.score}</b> · ${esc(rep.first)}'s average ${ra} · ${Wd.store} ${sa}</p>`})()}
   <div class="btnrow" style="margin-top:10px"><button class="btn primary sm" data-go="#rep-${rep.id}">${esc(rep.first)}'s profile${ic('right',14)}</button><button class="btn sm" data-go="#rep-${rep.id}/coaching">Coaching plan</button>${c.reason?`<button class="btn sm" data-filter='${JSON.stringify({rep:c.rep,reason:c.reason})}'>More like this</button>`:''}</div></section>
 </div></aside>`;
 const cl=document.querySelector('.drawer [data-act="close"].iconbtn');if(cl)cl.focus();}

/* ---------- Follow-ups ---------- */
const DONE=new Set(CONVS.filter(c=>c.fuDone).map(c=>c.id));
function followups(){const start=new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()).getTime();
 return CONVS.filter(c=>c.outcome==='followup'&&c.d<=4&&!DONE.has(c.id)).map(c=>{const due=c.due;const dd=new Date(due.getFullYear(),due.getMonth(),due.getDate()).getTime();
  return {c,due,status:dd<start?'overdue':dd===start?'today':'later'}}).sort((a,b)=>({overdue:0,today:1,later:2}[a.status]-{overdue:0,today:1,later:2}[b.status])||b.c.value-a.c.value)}
function draftFor(c){const titled=/^(mr|mrs|ms|dr|shri|smt)\.?\s/i.test(c.customer),nm=/^Customer( \d+)?$/.test(c.customer)?'':' '+(titled?c.customer:c.customer.split(' ')[0]),r=REP[c.rep],me=r.name==='Rep not tagged'?'the team':r.first,p=PRODUCTS[c.product].label;
 return CAR?`Hi${nm}, this is ${me} from ${ZD.store}. Thank you for visiting us${/not decided|not recorded|not captured/i.test(p)?'':' to see the '+p}. Would you like to book a test drive or get the on-road price this week? I can send the details on WhatsApp.`:
  `Hi${nm}, this is ${me} from ${ZD.store}. The ${lc(p)} you liked is on hold for you. Would you like to visit this week? I can also send photos on WhatsApp.`}
function renderFollowups(){if(RICH)return renderFollowupsRich();
const all=followups();const grp={overdue:[],today:[],later:[]};all.forEach(f=>grp[f.status].push(f));
 const sect=(k,title,cls)=>grp[k].length?`<div class="fucol"><div class="section-t"><h2>${title}</h2><span class="pill ${cls} num">${grp[k].length} · ${inr(sumv(grp[k].map(f=>f.c)))}</span></div><section class="card">${grp[k].map(f=>{const c=f.c;return `<div class="fu"><div><h3>${esc(c.customer)} <span class="pill gold num">${valTxt(c)}</span></h3><div class="meta"><span>${PRODUCTS[c.product].label} · ${REASONS[c.reason].label.toLowerCase()}</span><span>Rep: ${repLink(c.rep,REP[c.rep].name)} · visited ${fdate(c.at)}</span><span>${c.phone?`Phone: <span class="phone">${c.phone}</span>`:'<span style="color:var(--bad)">No phone saved</span>'}</span></div><button class="link" style="margin-top:6px" data-conv="${c.id}">See the conversation${ic('right',14)}</button></div>
  <div><div class="draft">${esc(draftFor(c))}</div><div class="btnrow"><button class="btn primary sm" data-act="copy" data-text="${esc(draftFor(c))}">${ic('copy',14)}Copy message</button><button class="btn sm" data-act="done" data-id="${c.id}">${ic('check',14)}Mark called</button></div></div></div>`}).join('')}</section></div>`:'';
 return phead('Follow-ups',`Customers who said they would come back${SNAP?'':', from the last 5 days'}. Zocus drafts the message; your team sends it.`)+
 (all.length?'<div class="fugrid">'+sect('overdue','Overdue','bad')+sect('today','Due today','warn')+sect('later','Coming up','neutral')+'</div>':`<section class="card" style="text-align:center;padding:40px"><b>All caught up</b><p class="hint">New follow-ups appear when a customer says they will return.</p></section>`)}

/* ---------- Search palette ---------- */
function searchItems(q){q=q.toLowerCase().trim();if(!q)return [];const out=[];
 REPS.filter(r=>r.name.toLowerCase().includes(q)).slice(0,4).forEach(r=>out.push({g:'Reps',label:r.name,sub:'Coaching view',go:'#rep-'+r.id}));
 REPS.filter(r=>r.name.toLowerCase().includes(q)||'coaching'.includes(q)).slice(0,4).forEach(r=>out.push({g:'Coaching',label:r.name+' coaching plan',sub:'Plan',go:'#coach-'+r.id}));
 CONVS.filter(c=>String(c.ref).toLowerCase().includes(q)||'#'+refNo(c)===q||c.customer.toLowerCase().includes(q)||(c.phone||'').replace(/\s/g,'').includes(q.replace(/\s/g,''))).slice(0,5).forEach(c=>out.push({g:'Customers',label:c.customer,sub:PRODUCTS[c.product].label+' · '+fdate(c.at),conv:c.id}));
 Object.entries(PRODUCTS).filter(([k,p])=>p.label.toLowerCase().includes(q)).slice(0,3).forEach(([k,p])=>out.push({g:'Products',label:p.label,sub:'Conversations',filter:{product:k}}));
 Object.entries(REASONS).filter(([k,r])=>r.label.toLowerCase().includes(q)).slice(0,3).forEach(([k,r])=>out.push({g:'Reasons',label:r.label,sub:'Conversations',filter:{reason:k}}));
 COMPS.filter(c=>c.label.toLowerCase().includes(q)).forEach(c=>out.push({g:'Competitors',label:c.label,sub:'Conversations',filter:{comp:c.id}}));
 return out}
let sIdx=0,sItems=[];
function openPal(){document.getElementById('palRoot').innerHTML=`<div class="pal-scrim" data-act="palclose"></div><div class="pal" role="dialog" aria-label="Search"><input id="q" type="search" autocomplete="off" placeholder="Search a rep, customer, phone, product or reason" aria-label="Search"><div class="res" id="results"></div><div class="foot">Arrow keys to move · Enter to open · Esc to close</div></div>`;sIdx=0;drawResults();document.getElementById('q').focus()}
function closePal(){document.getElementById('palRoot').innerHTML=''}
function drawResults(){const qi=document.getElementById('q');if(!qi)return;const q=qi.value,box=document.getElementById('results');sItems=searchItems(q);
 if(!q.trim()){box.innerHTML=`<h4>Try</h4>${[REPS[REPS.length-1].first,(Object.values(PRODUCTS)[0]||{label:''}).label.split(' ').pop(),lc(REASONS.making.label),(COMPS[0]||{label:''}).label].filter(Boolean).map(t=>esc(t)).map(t=>`<button data-act="suggest" data-v="${t}"><span>${t}</span></button>`).join('')}`;return}
 if(!sItems.length){box.innerHTML=`<div class="empty">Nothing found for "${esc(q)}". Try a rep name, a customer or a product.</div>`;return}
 let g='',h='';sItems.forEach((it,i)=>{if(it.g!==g){g=it.g;h+=`<h4>${g}</h4>`}h+=`<button class="${i===sIdx?'on':''}" data-si="${i}"><span>${esc(it.label)}</span><small>${esc(it.sub)}</small></button>`});box.innerHTML=h}
function chooseResult(i){const it=sItems[i];if(!it)return;closePal();
 if(it.go)location.hash=it.go;else if(it.conv)openDrawer(it.conv);else if(it.filter)applyFilter(it.filter)}

/* ---------- Tour ---------- */
const TOUR=[
 {sel:null,title:'Welcome'+(ZD.owner?', '+ZD.owner:''),body:`This is your ${Wd.store} briefing. It takes a minute to learn. Follow the glowing spots, like a game tutorial. Tip: move your cursor over the waves, or click to change their colour.`},
 FLAT?null:{sel:'[data-tour="period"]',title:'Pick your time range',body:'Every number on every page follows this switch.'},
 {sel:'[data-tour="brief"]',title:'Read this first',body:`Your AI briefing: how the ${Wd.store} did, and where ${Wd.sales} slipped, in two sentences.`},
 {sel:'[data-tour="kpis"]',title:'Three numbers',body:`Output: did we ${Wd.sell}? Input: did the team record?${FLAT?'':' The arrow compares with the previous period.'} Tap one to dig in.`},
 {sel:'[data-tour="actions"]',title:RICH?'Promises to keep':SNAP?'What to do next':'Your to-do for today',body:RICH?'Everything the rep promised a customer, with a message ready to send.':'Actions ranked by the money at stake. One tap takes you to the fix.'},
 {sel:'[data-tour="pulse"]',title:'Your team at a glance',body:'Each ring is a rep\'s conversation score. Tap a rep to see what to coach and see examples.'},
 {sel:'[data-tour="search"]',title:'Find anything',body:'A rep, a customer, a phone number, a product or a reason. Press / anytime.'},
 {sel:'[data-tour="nav-insights"]',title:'Go deeper',body:`Insights shows why customers ${Wd.lostLc}, what they want, what competitors offer, and who your customers are.`},
 {sel:'[data-tour="nav-coaching"]',title:'A coaching plan per rep',body:'Built from where each rep scores low and how your best reps answer the same customers. Includes practice drills from real conversations.'},
 {sel:'[data-tour="help"]',title:'Replay anytime',body:'Tap here to run this tour again. You are all set.'}].filter(Boolean);
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

function objCard(){if(!RICH)return '';const A=allCur().filter(c=>c.objections.length);if(!A.length)return '';const by=groupBy(A,c=>c.rep),OV={answered:['good','Answered'],partly:['warn','Partly'],open:['bad','Not settled']};
 return `<section class="card"><div class="card-h"><h2>Objections today and how they were answered</h2><span class="hint">Tap one to see what was said and a line to try</span></div>${Object.entries(by).map(([rid,cs])=>{const os=cs.flatMap(c=>c.objections.map(o=>({c,o})));return `<div class="objrep"><div class="chkh"><b>${esc(rname(REP[rid]))}</b><span class="hint">${plural(os.length,'objection')} · ${os.filter(x=>x.o.v==='answered').length} answered</span></div>${os.map(({c,o})=>`<details class="objx"><summary><span class="pill ${OV[o.v][0]}">${OV[o.v][1]}</span><b>${esc(o.t)}</b><span class="hint">${esc(cname(c))}</span></summary><div class="objb"><p><span class="hint">Customer</span>${esc(o.q)}</p><p><span class="hint">${esc(rname(REP[rid]))}</span>${esc(o.a)}</p>${o.tip?`<p class="objtip"><span class="hint">Suggested · Zocus playbook</span>${esc(o.tip)}</p>`:''}<button class="link" data-conv="${c.id}">Open the conversation${ic('right',14)}</button></div></details>`).join('')}</div>`}).join('')}</section>`}
const C=ZocusCoach({objCard,W:Wd,CAR,PLAYBOOK,FLAT,SNAP,inTxt,baseTxt,S,REPS,REP,SKILLS,SK,REASONS,COACH,CONVS,BEST,ZD,esc,ic,ring,inr,pct,plural,fdate,sumv,cur,prev,stats,repRows,periodTxt,phead,render:()=>render(),toast,Q,scoreCol,groupBy});
/* ---------- Render & events ---------- */
function emptyFor(rt){const none=!cur().length;
 const card=(t,b)=>phead(NAV.find(n=>n[0]===rt)[1],`${FLAT?'Nothing to show yet.':rangeDays()===1?'Only one day is selected.':'Nothing to show.'}`)+`<section class="card" style="text-align:center;padding:44px 20px"><b style="font-size:17px">${t}</b><p class="hint" style="margin:8px 0 16px">${b}</p><div class="btnrow" style="justify-content:center">${FLAT||ZD.spanDays<3?'':'<button class="btn primary sm" data-act="period" data-v="30">Show last 30 days</button><button class="btn sm" data-act="period" data-v="7">Show last 7 days</button>'}</div></section>`;
 if(['insights','team','coaching'].includes(rt)&&none)return card('No conversations recorded '+inTxt(),FLAT||ZD.spanDays<3?'They appear after the next update.':'Pick a longer range to see charts and coaching.');
 if(rt==='insights'&&S.tab==='drop'&&!cur().some(c=>c.outcome!=='sold'))return card('Everyone who came in '+Wd.bought+' '+inTxt(),'There are no lost '+Wd.sales+' to explain.'+(FLAT?'':' Try a longer range.'));
 return ''}
function fitHome(){const pg=document.getElementById('page');if(!pg||pg.dataset.route!=='home')return;pg.classList.remove('tight','tighter');if(SNAP)return;
 if(matchMedia('(max-width:860px)').matches)return;const over=()=>document.documentElement.scrollHeight>innerHeight+1;
 if(!over())return;pg.classList.add('tight');if(!over())return;pg.classList.add('tighter')}
window.addEventListener('resize',()=>{clearTimeout(fitHome.t);fitHome.t=setTimeout(fitHome,120)});
function render(){ZM.flip(renderNow)}
function renderNow(){document.title=(ZD.store||'Zocus')+' · Zocus AI';const rt=routeName();renderNav();const pg=document.getElementById('page');pg.dataset.route=rt.startsWith('rep-')?'rep':rt;
 pg.innerHTML=(rt==='report'?'':snapBar())+(emptyFor(rt)||(rt==='report'?renderReport():rt==='home'?renderHome():rt==='insights'?renderInsights():rt==='team'?renderTeam():rt==='conversations'?renderConversations():rt==='followups'?renderFollowups():rt==='coaching'?C.renderHub():renderRep(rt.slice(4))));fitHome()}
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
 else if(a==='pdone'){const k=t.dataset.key;PDONE.has(k)?PDONE.delete(k):PDONE.add(k);savePdone();render()}
 else if(a==='tmore'){tMore()}
 else if(a==='tjump'){tJump(t.dataset.q)}
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
 else if(a==='print'){window.print()}
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
 if(e.key==='Enter'&&e.target.classList&&(e.target.classList.contains('rlink')||e.target.classList.contains('ccd'))){e.preventDefault();e.target.click();return}
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
(window.ZSplash?ZSplash.done:Promise.resolve()).then(()=>{if(!seen&&!ZD.locked)setTimeout(startTour,300)});
})();
