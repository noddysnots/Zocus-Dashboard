// Regenerates data/sample.csv and data/template.csv.
// The block between the markers is the prototype's seeded generator, copied unchanged,
// so the sample matches the original Store Briefing numbers. Run: node tools/make-sample.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// ---- prototype generator (unchanged) ----
/* ---------- Sample data (fictional store, generated with a fixed seed) ---------- */
const TODAY=new Date(2026,10,4,19,0); const DAY=864e5;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=mulberry(20261104);
const pick=a=>a[Math.floor(R()*a.length)];
function wpick(arr,wf){let tot=0;const ws=arr.map(x=>{const w=Math.max(0,wf(x));tot+=w;return w});let r=R()*tot;for(let i=0;i<arr.length;i++){r-=ws[i];if(r<=0)return arr[i]}return arr[arr.length-1]}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+R()*(b-a);

const SKILLS=[{id:'need',label:'Understanding the need'},{id:'budget',label:'Asking the budget'},{id:'pitch',label:'Showing the product'},{id:'objection',label:'Handling price doubts'},{id:'close',label:'Closing and next step'}];
const SK=Object.fromEntries(SKILLS.map(s=>[s.id,s]));
const REPS=[
 {id:'priya',name:'Priya Sharma',tenure:'6 years',skills:{need:84,budget:78,pitch:85,objection:81,close:80},conv:.46,vol:1.25},
 {id:'arjun',name:'Arjun Nair',tenure:'4 years',skills:{need:76,budget:70,pitch:80,objection:74,close:72},conv:.40,vol:1.1},
 {id:'neha',name:'Neha Kapoor',tenure:'3 years',skills:{need:78,budget:64,pitch:72,objection:66,close:75},conv:.37,vol:1.0},
 {id:'vikram',name:'Vikram Singh',tenure:'5 years',skills:{need:63,budget:60,pitch:83,objection:62,close:66},conv:.34,vol:1.2},
 {id:'pooja',name:'Pooja Iyer',tenure:'2 years',skills:{need:70,budget:57,pitch:65,objection:52,close:61},conv:.30,vol:.9},
 {id:'sandeep',name:'Sandeep Yadav',tenure:'1 year',skills:{need:58,budget:52,pitch:61,objection:44,close:54},conv:.26,vol:1.0},
 {id:'anjali',name:'Anjali Mehta',tenure:'8 months',skills:{need:61,budget:48,pitch:56,objection:51,close:47},conv:.23,vol:.8},
 {id:'rahul',name:'Rahul Verma',tenure:'1 year',skills:{need:54,budget:33,pitch:67,objection:49,close:46},conv:.15,vol:1.1}];
REPS.forEach(r=>{r.first=r.name.split(' ')[0];r.ini=r.name.split(' ').map(x=>x[0]).join('')});
const REP=Object.fromEntries(REPS.map(r=>[r.id,r]));
const PRODUCTS={bridal:{label:'22K bridal set',oos:.06,range:[250000,750000]},mangal:{label:'Mangalsutra',oos:.05,range:[60000,180000]},kundan:{label:'Kundan necklace',oos:.18,range:[150000,400000]},studs:{label:'Diamond studs',oos:.05,range:[30000,110000]},solitaire:{label:'Solitaire ring',oos:.08,range:[80000,250000]},bangles:{label:'Lightweight 22K bangles',oos:.42,range:[40000,120000]},coin:{label:'Gold coin',oos:.02,range:[15000,80000]},chain:{label:'Daily-wear chain',oos:.06,range:[25000,70000]}};
const PERSONAS=[{id:'wedding',label:'Wedding shopping',w:24,conv:.95,products:['bridal','mangal','kundan','bangles']},{id:'gift',label:'Gift or anniversary',w:22,conv:1.15,products:['studs','solitaire','bangles','chain']},{id:'festive',label:'Festive buying',w:20,conv:1.3,products:['coin','bangles','chain','studs']},{id:'invest',label:'Investment gold',w:14,conv:1.05,products:['coin','chain']},{id:'self',label:'Buying for self',w:20,conv:.85,products:['bangles','studs','chain','solitaire']}];
const PER=Object.fromEntries(PERSONAS.map(p=>[p.id,p]));
const COMPS=[{id:'sgp',label:'Shree Gold Palace',offer:'Making charges at 8%',hi:'Shree Gold Palace mein making sirf 8% hai.'},{id:'nak',label:'Nakshatra Online',offer:'Free gold coin on ₹1L+',hi:'Nakshatra Online pe 1 lakh pe gold coin free mil raha hai.'},{id:'ratna',label:'Ratna Jewellers',offer:'Higher old-gold exchange rate',hi:'Ratna Jewellers mein exchange rate zyada de rahe hain.'}];
const COMP=Object.fromEntries(COMPS.map(c=>[c.id,c]));
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
const FIRST=['Kavita','Ritu','Sunil','Amit','Pallavi','Deepak','Shalini','Rohit','Meenakshi','Gaurav','Nisha','Manoj','Sneha','Harish','Payal','Rakesh','Swati','Tarun','Jyoti','Kunal','Bhavna','Naveen','Preeti','Ajay','Divya','Sanjay','Komal','Vivek','Rekha','Alok'];
const LAST='SMKGBRTJAPCDNV';

const CONVS=[];let cid=1001;
function makeConv(rep,date,d){
  const persona=wpick(PERSONAS,p=>p.w*(p.id==='festive'&&d<16?2.2:1));
  const pid=pick(persona.products),prod=PRODUCTS[pid];
  const inStock=R()>prod.oos;
  const sk={};let sum=0;SKILLS.forEach(s=>{const v=Math.round(clamp(rep.skills[s.id]+(R()-.5)*26,5,99));sk[s.id]=v;sum+=v});
  const score=Math.round(sum/SKILLS.length);
  const comp=R()<((persona.id==='wedding'||persona.id==='invest')?.34:.16)?pick(COMPS):null;
  const pSold=clamp(rep.conv*persona.conv*(inStock?1:.3)*(comp?.7:1)*(.7+score/170),.04,.8);
  const r=R();let outcome,reason=null;
  if(r<pSold)outcome='sold';else if(r<pSold+.2)outcome='followup';else outcome='lost';
  if(outcome!=='sold'){
    if(!inStock)reason=pid==='bangles'?'stock':'design';
    else if(outcome==='followup')reason=wpick(['family','competitor','budget'],k=>k==='family'?(persona.id==='wedding'?3:1.6):k==='competitor'?(comp?2.5:.3):1);
    else reason=wpick(['browse','design','making','budget','competitor','family'],k=>({browse:(100-sk.need)*.45,design:22,making:(100-sk.objection)*.9,budget:(100-sk.budget),competitor:comp?110:4,family:persona.id==='wedding'?40:14})[k]);
  }
  const stage=outcome==='sold'?4:REASONS[reason].stage;
  const value=Math.round(rnd(prod.range[0],prod.range[1])/500)*500;
  const at=new Date(date.getFullYear(),date.getMonth(),date.getDate(),11+Math.floor(R()*9),Math.floor(R()*60));
  const kw=[];
  if(reason==='making'||R()<.22)kw.push('making charges');
  if(pid==='bangles'||reason==='stock')kw.push('lightweight');
  if(R()<.28)kw.push('old gold exchange');
  if(persona.id==='invest'||R()<.12)kw.push('hallmark');
  if(persona.id==='festive'&&d<16)kw.push('Dhanteras offer');
  if(persona.id==='wedding'&&R()<.4)kw.push('EMI');
  if(comp)kw.push('rate compare');
  return {id:cid++,rep:rep.id,at,d,persona:persona.id,product:pid,inStock,skills:sk,score,competitor:comp?comp.id:null,outcome,reason,stage,value,
    dur:Math.round(rnd(7,34)),customer:pick(FIRST)+' '+LAST[Math.floor(R()*LAST.length)]+'.',
    phone:R()<.8?'98'+Math.floor(R()*90+10)+'xx '+Math.floor(R()*9000+1000):null,kw,done:false};
}
for(let d=61;d>=0;d--){
  const date=new Date(TODAY.getTime()-d*DAY),dow=date.getDay();
  const boost=(d<16?1.35:1)*((dow===0||dow===6)?1.4:1);
  REPS.forEach(rep=>{const n=Math.round(rep.vol*(.5+R()*1.1)*boost);for(let i=0;i<n;i++)CONVS.push(makeConv(rep,date,d))});
}
CONVS.sort((a,b)=>b.at-a.at);
const CONV=Object.fromEntries(CONVS.map(c=>[c.id,c]));
// ---- end prototype generator ----

const COLS=['conversation_id','captured_at','rep_name','outcome','value_inr','product','score','score_need','score_budget','score_pitch','score_objection','score_close','reason','stage_reached',
 'customer_name','customer_phone','duration_min','customer_type','in_stock','competitor','competitor_offer','keywords','customer_quote','customer_quote_en',
 'summary_wanted','summary_happened','summary_why','summary_next',
 'objection','objection_resolved','objection_quote','objection_quote_en','objection_reply','objection_reply_en','objection_at_sec',
 'followup_due','followup_done','rep_tenure','store_name','owner_name','zocus_url'];

// Peer replies for objections that were raised and resolved (Hinglish + English).
const REPLIES={
 making:[['Making pe aapko old gold exchange mein 100% value mil rahi hai, toh total kam padega.','You get 100% value on your old gold exchange, so your total works out lower.'],
  ['Making charges mein hallmark, finishing aur lifetime polish shamil hai, chaliye bill ka breakup dikhata hoon.','Making includes hallmark, finishing and lifetime polish. Let me show you the bill breakup.'],
  ['Agar aap aaj le rahe hain toh main making par thoda adjust kar deta hoon, par pehle design pakka kar lein.','If you take it today I can adjust the making a little, but let us finalise the design first.']],
 budget:[['Aap kitne tak dekh rahe ho, taaki main sahi range dikhaun?','What range are you looking at, so I can show you the right pieces?'],
  ['Is budget mein yeh teen options aate hain, aap jo pasand karein usme EMI bhi ban jayegi.','Three options fit this budget, and EMI is possible on whichever you like.'],
  ['Halka design lein toh isi budget mein ho jayega, dikhaun?','A lighter design fits this budget. Shall I show you?']],
 competitor:[['Rate zaroor compare kijiye, saath mein hallmark aur buyback guarantee bhi dekhiye.','Do compare the rate, and also compare our hallmark and buyback guarantee.'],
  ['Wahan ka bill mangwa lijiye, hum same weight par exact rate aur exchange value likh ke denge.','Bring their bill, and we will write the exact rate and exchange value for the same weight.'],
  ['Hum aapko 15 saal purane customers ke reviews dikha sakte hain, rate ke saath bharosa bhi dekhiye.','We can show you reviews from 15-year customers. Look at trust along with the rate.']],
 family:[['Main yeh piece 2 din aapke liye hold kar deti hoon aur photo WhatsApp kar deti hoon.','I will hold this piece for you for 2 days and WhatsApp you the photos.'],
  ['Aap family ko saath le aaiye, hum ek video call par bhi dikha sakte hain.','Bring your family along, or we can show them on a video call.'],
  ['Number de dijiye, main aaj shaam tak photos aur rate bhej deta hoon, kal tak hold rahega.','Share your number and I will send photos and the rate by this evening. It stays on hold till tomorrow.']],
 design:[['Yeh catalogue dekhiye, yeh design 5 din mein aa jayega.','Have a look at this catalogue, this design can arrive in 5 days.'],
  ['Aap kaisa design soch rahe the? Main wahi style ke teen aur dikhata hoon.','What design did you have in mind? I will show you three more in that style.']]
};
const R2=mulberry(777);
const q=s=>/[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
const pad=n=>String(n).padStart(2,'0');
const ts=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
const dt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const STG=['talked','need_understood','product_shown','price_quoted'];
const rows=[...CONVS].sort((a,b)=>a.at-b.at||a.id-b.id).map(c=>{
  const rep=REPS.find(r=>r.id===c.rep),P=PERSONAS.find(p=>p.id===c.persona),cp=c.competitor?COMPS.find(x=>x.id===c.competitor):null,rs=c.reason?REASONS[c.reason]:null;
  let ob='',res='',oq='',oqe='',orp='',orpe='',oat='';
  if(c.outcome!=='sold'){
    if(c.reason!=='browse'){ob=c.reason;res='no';oq=rs.hi;oqe=rs.en;oat=Math.round(c.dur*60*.6)}
  }else if(R2()<.62){
    const cand=[['making',3],['budget',2],['competitor',c.competitor?5:.5],['family',c.persona==='wedding'?4:1.5],['design',1]];
    let tot=cand.reduce((a,b)=>a+b[1],0),r=R2()*tot;ob=cand[cand.length-1][0];
    for(const [k,w] of cand){r-=w;if(r<=0){ob=k;break}}
    const v=REPLIES[ob][c.id%REPLIES[ob].length];res='yes';oq=REASONS[ob].hi;oqe=REASONS[ob].en;orp=v[0];orpe=v[1];oat=Math.round(c.dur*60*(.35+R2()*.3));
  }
  const rec={conversation_id:'ZC-'+c.id,captured_at:ts(c.at),rep_name:rep.name,outcome:c.outcome,value_inr:c.value,product:PRODUCTS[c.product].label,score:c.score,
   score_need:c.skills.need,score_budget:c.skills.budget,score_pitch:c.skills.pitch,score_objection:c.skills.objection,score_close:c.skills.close,
   reason:c.outcome==='sold'?'':c.reason,stage_reached:c.outcome==='sold'?'':STG[c.stage],customer_name:c.customer,customer_phone:c.phone||'',duration_min:c.dur,
   customer_type:P.label,in_stock:c.inStock?'yes':'no',competitor:cp?cp.label:'',competitor_offer:cp?cp.offer:'',keywords:c.kw.join('|'),
   customer_quote:rs?rs.hi:'',customer_quote_en:rs?rs.en:'',summary_wanted:'',summary_happened:'',summary_why:'',summary_next:'',
   objection:ob,objection_resolved:res,objection_quote:oq,objection_quote_en:oqe,objection_reply:orp,objection_reply_en:orpe,objection_at_sec:oat,
   followup_due:c.outcome==='followup'?dt(new Date(c.at.getTime()+2*DAY)):'',followup_done:c.outcome==='followup'?'no':'',rep_tenure:rep.tenure,store_name:'Kesar Jewels',owner_name:'Meera'};
  return COLS.map(k=>q(String(rec[k]??''))).join(',');
});
fs.mkdirSync(path.join(root,'data'),{recursive:true});
fs.writeFileSync(path.join(root,'data/sample.csv'),COLS.join(',')+'\n'+rows.join('\n')+'\n');
const ex=[
 ['ZC-1','2026-11-04 17:32','Priya Sharma','sold','185000','22K bridal set','82','85','78','86','80','81','','','Kavita S.','9812xx 3345','24','Wedding shopping','yes','','','making charges|old gold exchange','','','','','','','making','yes','Making charges bahut zyada hai.','Making charges are too high.','Making pe aapko old gold exchange mein 100% value mil rahi hai.','You get 100% value on your old gold exchange.','410','','','Priya has been here 6 years','Your Store','Owner'],
 ['ZC-2','2026-11-04 18:05','Rahul Verma','followup','85000','Lightweight 22K bangles','48','54','33','67','49','46','family','price_quoted','Ritu M.','9876xx 1200','15','Gift or anniversary','yes','Nakshatra Online','Free gold coin on Rs 1L+','lightweight','Mummy ko dikhana padega, kal leke aate hain.','My mother needs to see it, we will bring her tomorrow.','','','','','family','no','Mummy ko dikhana padega.','My mother needs to see it.','','','560','2026-11-06','no','1 year','Your Store','Owner'],
 ['ZC-3','2026-11-04 19:10','Arjun Nair','lost','42000','Diamond studs','61','63','60','70','58','55','budget','price_quoted','Sunil T.','','12','Buying for self','yes','','','','Humara budget itna nahi tha.','Our budget was lower.','','','','','budget','no','Humara budget itna nahi tha.','Our budget was lower.','','','400','','','4 years','Your Store','Owner']];
fs.writeFileSync(path.join(root,'data/template.csv'),COLS.join(',')+'\n'+ex.map(r=>r.concat(['']).map(q).join(',')).join('\n')+'\n');
console.log('sample rows:',rows.length);
