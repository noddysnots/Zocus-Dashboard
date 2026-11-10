/* Zocus chart kit: small hand-written SVG/HTML charts that match the dashboard's look.
   Every function returns an HTML string. Marks use data-tip for the shared hover tooltip, and may carry
   data-go / data-filter / data-addf so a click drills into the data (handled in js/app.js).
   Colours: one ink hue for single-series charts; OUTCOME colours are validated for colour-blind separation
   and always ship with a text legend. */
window.ZCharts=(function(){
'use strict';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const INK='#2B2620',MUTE='#A39A8A',GRID='rgba(29,26,21,.09)',SURF='#FFFCF6';
const OUTCOME={sold:'#1F8F5F',followup:'#D9A21B',lost:'#C0412B'};
const f1=n=>(+n).toFixed(1);

/* ---------- tooltip (one element, shared) ---------- */
let tip=null;
function showTip(el,x,y){if(!tip){tip=document.createElement('div');tip.id='ztip';tip.setAttribute('role','tooltip');document.body.appendChild(tip)}
  tip.innerHTML=el.getAttribute('data-tip').split('|').map((l,i)=>i?'<span>'+esc(l)+'</span>':'<b>'+esc(l)+'</b>').join('');
  tip.hidden=false;const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px';tip.style.top=(y-h-14<8?y+18:y-h-14)+'px'}
function hideTip(){if(tip)tip.hidden=true}
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t,e.clientX,e.clientY);else hideTip()},{passive:true});
document.addEventListener('focusin',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t){const r=t.getBoundingClientRect();showTip(t,r.left+r.width/2,r.top)}});
document.addEventListener('focusout',hideTip);
addEventListener('scroll',hideTip,{passive:true});
document.addEventListener('click',e=>{if(!matchMedia('(hover:none)').matches)return;const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t,e.clientX,e.clientY);else hideTip()});

/* ---------- collapsible card (state remembered per key) ---------- */
const XK='zocus-x-v1';let xs={};try{xs=JSON.parse(localStorage.getItem(XK)||'{}')||{}}catch(e){}
const xsave=()=>{try{localStorage.setItem(XK,JSON.stringify(xs))}catch(e){}};
const isOpen=(key,def)=>key in xs?!!xs[key]:!!def;
const CHEV='<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function xcard(key,title,summary,body,o){o=o||{};
  return `<details class="card xcard ${o.cls||''}" data-xk="${esc(key)}" ${isOpen(key,o.open)?'open':''}><summary><span class="x-t">${title}</span><span class="x-s">${summary||''}</span>${o.right?`<span class="x-r">${o.right}</span>`:''}${CHEV}</summary><div class="x-b">${body}</div></details>`}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.xk){xs[d.dataset.xk]=d.open;xsave()}},true);
function setAll(open){document.querySelectorAll('#page details[data-xk]').forEach(d=>{d.open=open;xs[d.dataset.xk]=open});xsave()}
const xtools=()=>`<div class="xtools"><button class="link" data-act="xall" data-v="1">Expand all</button><button class="link" data-act="xall" data-v="0">Collapse all</button></div>`;

/* ---------- sparkline ---------- */
function spark(vals,o){o=o||{};const w=o.w||84,h=o.h||26,v=vals.filter(x=>x!=null);if(v.length<2)return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const lo=Math.min.apply(null,v),hi=Math.max.apply(null,v),sp=hi-lo||1,n=vals.length;
  const X=i=>3+i*(w-6)/(n-1),Y=x=>h-4-(x-lo)/sp*(h-8);let d='',pen=false,last=null;
  vals.forEach((x,i)=>{if(x==null){pen=false;return}d+=(pen?'L':'M')+f1(X(i))+' '+f1(Y(x));pen=true;last=[X(i),Y(x)]});
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path pathLength="1" class="ln" d="${d}" fill="none" stroke="${o.color||INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(last[0])}" cy="${f1(last[1])}" r="2.6" fill="${o.color||INK}"/></svg>`}

function niceRange(lo,hi){if(lo===hi){lo-=1;hi+=1}const sp=hi-lo,step=Math.pow(10,Math.floor(Math.log10(sp)));const s=sp/step>5?step*2:sp/step>2?step:step/2;
  return [Math.floor(lo/s)*s,Math.ceil(hi/s)*s]}
const legend=items=>`<div class="lg">${items.map(i=>`<span><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`;

/* ---------- line chart: 1-2 series over ordered labels ---------- */
function lineChart(o){const W=o.w||360,H=o.h||150,l=30,r=34,t=10,b=22,S=o.series,n=o.labels.length,fmt=o.fmt||(v=>Math.round(v));
  const all=[].concat.apply([],S.map(s=>s.values)).filter(v=>v!=null);
  if(all.length<2)return '<p class="hint empty">Not enough data for a trend yet.</p>';
  let mn=Math.min.apply(null,all),mx=Math.max.apply(null,all);const ms=o.minSpan||(mx>20?12:0);if(mx-mn<ms){const mid=(mn+mx)/2;mn=mid-ms/2;mx=mid+ms/2}
  const rg=niceRange(mn,mx),lo=rg[0],hi=rg[1];
  const X=i=>l+i*(W-l-r)/(n-1),Y=v=>t+(1-(v-lo)/(hi-lo))*(H-t-b);
  let g='';[lo,(lo+hi)/2,hi].forEach(v=>{g+=`<line x1="${l}" x2="${W-r}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="${GRID}"/><text x="${l-6}" y="${f1(Y(v)+3.5)}" text-anchor="end" class="ax">${fmt(v)}</text>`});
  g+=`<text x="${l}" y="${H-5}" class="ax">${esc(o.labels[0])}</text><text x="${W-r}" y="${H-5}" text-anchor="end" class="ax">${esc(o.labels[n-1])}</text>`;
  S.forEach((s,si)=>{let d='',pen=false,last=null;s.values.forEach((v,i)=>{if(v==null){pen=false;return}d+=(pen?'L':'M')+f1(X(i))+' '+f1(Y(v));pen=true;last=[X(i),Y(v),v]});
    g+=`<path pathLength="1" class="ln" d="${d}" fill="none" stroke="${s.color||INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    if(last)g+=`<circle cx="${f1(last[0])}" cy="${f1(last[1])}" r="4" fill="${s.color||INK}" stroke="${SURF}" stroke-width="2"/><text x="${f1(last[0]+8)}" y="${f1(last[1]+4+(S.length>1&&si===1&&Math.abs(last[1]-(S[0]._ly||-99))<12?12:0))}" class="vl">${fmt(last[2])}</text>`;
    s._ly=last?last[1]:null});
  const cw=(W-l-r)/(n-1);
  for(let i=0;i<n;i++){const tipTxt=[o.labels[i]].concat(S.map(s=>s.name+': '+(s.values[i]==null?'no data':fmt(s.values[i])))).join('|');
    g+=`<rect x="${f1(X(i)-cw/2)}" y="${t}" width="${f1(cw)}" height="${H-t-b}" fill="transparent" data-tip="${esc(tipTxt)}" tabindex="0"/>`}
  return (S.length>1?legend(S.map(s=>({name:s.name,color:s.color||INK}))):'')+`<svg class="zc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||'Trend chart')}">${g}</svg>`}

/* ---------- columns: stacked by group (or a single group = histogram) ---------- */
function columns(o){const W=o.w||360,H=o.h||150,l=26,r=6,t=8,b=22,n=o.data.length,G=o.groups;
  const tot=o.data.map(d=>G.reduce((a,gp)=>a+(d.vals[gp.key]||0),0)),max=Math.max.apply(null,tot.concat([1]));
  const rg=niceRange(0,max),hi=rg[1],slot=(W-l-r)/n,bw=Math.min(24,Math.max(3,slot-4)),Y=v=>t+(1-v/hi)*(H-t-b),base=H-b;
  let g='';[0,hi/2,hi].forEach(v=>{g+=`<line x1="${l}" x2="${W-r}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="${GRID}"/><text x="${l-5}" y="${f1(Y(v)+3.5)}" text-anchor="end" class="ax">${Math.round(v)}</text>`});
  const every=o.every||Math.ceil(n/6);
  o.data.forEach((d,i)=>{const x=l+i*slot+(slot-bw)/2;let y=base;const segs=G.filter(gp=>d.vals[gp.key]>0);
    segs.forEach((gp,si)=>{const hh=(d.vals[gp.key]/hi)*(H-t-b),top=si===segs.length-1,y0=y-hh,gap=si?2:0,h2=Math.max(1,hh-gap),rr=top?Math.min(4,bw/2,h2):0;
      g+=`<path d="M${f1(x)} ${f1(y-gap)}V${f1(y0+rr)}Q${f1(x)} ${f1(y0)} ${f1(x+rr)} ${f1(y0)}H${f1(x+bw-rr)}Q${f1(x+bw)} ${f1(y0)} ${f1(x+bw)} ${f1(y0+rr)}V${f1(y-gap)}Z" class="col" fill="${gp.color||INK}"/>`;y=y0});
    if(i%every===0||i===n-1&&n<=8)g+=`<text x="${f1(x+bw/2)}" y="${H-6}" text-anchor="middle" class="ax">${esc(d.label)}</text>`;
    g+=`<rect x="${f1(l+i*slot)}" y="${t}" width="${f1(slot)}" height="${H-t-b}" fill="transparent" data-tip="${esc(d.tip||d.label)}" tabindex="0" ${d.attr||''}/>`});
  return (G.length>1?legend(G.map(x=>({name:x.name,color:x.color}))):'')+`<svg class="zc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||'Column chart')}">${g}</svg>`}

/* ---------- one horizontal bar split into parts, with a clickable legend ---------- */
function splitBar(segs){const tot=segs.reduce((a,s)=>a+s.n,0);if(!tot)return '<p class="hint empty">No conversations match.</p>';
  return `<div class="sb" role="img" aria-label="${esc(segs.map(s=>s.name+' '+s.n).join(', '))}">${segs.filter(s=>s.n).map(s=>`<i style="flex:${s.n} 1 0;background:${s.color}" data-tip="${esc(s.name+'|'+s.n+' of '+tot+' ('+Math.round(s.n/tot*100)+'%)'+(s.sub?'|'+s.sub:''))}"></i>`).join('')}</div>
  <div class="sb-l">${segs.map(s=>`<button ${s.attr||''}><i style="background:${s.color}"></i><span>${esc(s.name)}</span><b class="num">${s.n}</b><small class="num">${Math.round(s.n/tot*100)}%${s.sub?' · '+esc(s.sub):''}</small></button>`).join('')}</div>`}

/* ---------- ranked horizontal bars ---------- */
function barList(items,o){o=o||{};if(!items.length)return `<p class="hint empty">${esc(o.empty||'Nothing to show for this period.')}</p>`;
  const max=Math.max.apply(null,items.map(i=>i.value).concat([o.max||0]))||1;
  return `<div class="bl">${items.map(i=>`<${i.attr?'button':'div'} class="bl-r ${i.on?'on':''}" ${i.attr||''} ${i.tip?`data-tip="${esc(i.tip)}"`:''}><span class="bl-l">${esc(i.label)}</span><span class="bl-t">${i.parts?`<span class="bl-p" style="width:${Math.max(1.5,i.value/max*100).toFixed(1)}%">${i.parts.filter(q=>q.v).map(q=>`<i style="flex:${q.v} 1 0;background:${q.color}"></i>`).join('')}</span>`:`<i style="width:${Math.max(1.5,i.value/max*100).toFixed(1)}%;background:${i.color||o.color||INK}"></i>`}${o.ref!=null?`<em style="left:${(o.ref/max*100).toFixed(1)}%"></em>`:''}</span><span class="bl-v num">${i.text}</span></${i.attr?'button':'div'}>`).join('')}</div>`}

/* ---------- paired bars: this entity against a reference (rep vs store) ---------- */
function pairList(items,o){o=o||{};if(!items.length)return `<p class="hint empty">${esc(o.empty||'Nothing to show for this period.')}</p>`;
  const max=Math.max.apply(null,items.map(i=>Math.max(i.a,i.b)).concat([o.max||0]))||1,w=v=>Math.max(1.5,v/max*100).toFixed(1);
  return legend([{name:o.aName,color:INK},{name:o.bName,color:MUTE}])+`<div class="bl">${items.map(i=>`<${i.attr?'button':'div'} class="bl-r" ${i.attr||''} ${i.tip?`data-tip="${esc(i.tip)}"`:''}><span class="bl-l">${esc(i.label)}</span><span class="pl-t"><i style="width:${w(i.a)}%;background:${INK}"></i><i style="width:${w(i.b)}%;background:${MUTE}"></i></span><span class="bl-v num">${i.text}</span></${i.attr?'button':'div'}>`).join('')}</div>`}
function miniSplit(segs){const tot=segs.reduce((a,s)=>a+s.n,0);if(!tot)return '';
  return `<div class="sb thin">${segs.filter(s=>s.n).map(s=>`<i style="flex:${s.n} 1 0;background:${s.color}" data-tip="${esc(s.name+'|'+s.n+' of '+tot+' ('+Math.round(s.n/tot*100)+'%)')}"></i>`).join('')}</div><div class="hint num" style="margin-top:4px">${segs.map(s=>s.name+' '+Math.round(s.n/tot*100)+'%').join(' · ')}</div>`}

/* ---------- scatter: one dot per entity ---------- */
function scatter(o){const W=360,H=o.h||200,l=34,r=14,t=22,b=30,P=o.points;if(P.length<2)return '<p class="hint empty">Needs at least two reps.</p>';
  const xr=niceRange(Math.min.apply(null,P.map(p=>p.x))-2,Math.max.apply(null,P.map(p=>p.x))+2),yr=niceRange(Math.max(0,Math.min.apply(null,P.map(p=>p.y))-4),Math.max.apply(null,P.map(p=>p.y))+4);
  const X=v=>l+(v-xr[0])/(xr[1]-xr[0])*(W-l-r),Y=v=>t+(1-(v-yr[0])/(yr[1]-yr[0]))*(H-t-b),ms=Math.max.apply(null,P.map(p=>p.size||1));
  let g='';[yr[0],(yr[0]+yr[1])/2,yr[1]].forEach(v=>{g+=`<line x1="${l}" x2="${W-r}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" stroke="${GRID}"/><text x="${l-6}" y="${f1(Y(v)+3.5)}" text-anchor="end" class="ax">${Math.round(v)}${o.ySuffix||''}</text>`});
  [xr[0],(xr[0]+xr[1])/2,xr[1]].forEach(v=>{g+=`<text x="${f1(X(v))}" y="${H-b+13}" text-anchor="middle" class="ax">${Math.round(v)}</text>`});
  g+=`<text x="${(l+W-r)/2}" y="${H-3}" text-anchor="middle" class="ax">${esc(o.xLabel)}</text><text x="2" y="9" class="ax">${esc(o.yLabel)}</text>`;
  if(o.refX!=null)g+=`<line x1="${f1(X(o.refX))}" x2="${f1(X(o.refX))}" y1="${t}" y2="${H-b}" stroke="${MUTE}" stroke-width="1"/><text x="${f1(X(o.refX)+4)}" y="${t+9}" class="ax">store avg</text>`;
  if(o.refY!=null)g+=`<line x1="${l}" x2="${W-r}" y1="${f1(Y(o.refY))}" y2="${f1(Y(o.refY))}" stroke="${MUTE}" stroke-width="1"/>`;
  [...P].sort((a,b)=>(b.size||1)-(a.size||1)).forEach(p=>{const cx=X(p.x),cy=Y(p.y),rad=4+4.5*Math.sqrt((p.size||1)/ms),left=cx>W-r-70;
    g+=`<a href="${esc(p.href||'#')}" data-tip="${esc(p.tip)}" aria-label="${esc(p.tip.replace(/\|/g,', '))}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rad+5)}" fill="transparent"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rad)}" fill="${INK}" fill-opacity=".86" stroke="${SURF}" stroke-width="2"/><text x="${f1(cx+(left?-rad-4:rad+4))}" y="${f1(cy+3.5)}" text-anchor="${left?'end':'start'}" class="dl">${esc(p.label)}</text></a>`});
  return `<svg class="zc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||'Scatter chart')}">${g}</svg>`}

/* ---------- heat grid: rows x columns, value printed in every cell ---------- */
function heatGrid(o){return `<div class="tblwrap"><table class="hg"><thead><tr><th></th>${o.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${o.rows.map(r=>`<tr ${r.attr||''} class="${r.attr?'click':''} ${r.foot?'foot':''}"><td class="hg-n">${esc(r.label)}</td>${r.cells.map(c=>`<td><span class="heat num ${c.cls||''}" ${c.tip?`data-tip="${esc(c.tip)}"`:''}>${c.text}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}

/* ---------- small KPI tile ---------- */
function tile(o){return `<div class="ktile"><span class="k-l">${esc(o.label)}</span><div class="k-m"><b class="num">${o.value}</b>${o.spark||''}</div><span class="k-s">${o.sub||''}</span></div>`}
/* chart card with a finding as its title */
function ccard(title,hint,body,cls){return `<section class="card chartc ${cls||''}"><div class="cc-h"><h3>${title}</h3>${hint?`<span class="hint">${hint}</span>`:''}</div>${body}</section>`}

return {OUTCOME,INK,spark,lineChart,columns,splitBar,barList,pairList,miniSplit,scatter,heatGrid,tile,ccard,xcard,xtools,setAll,isOpen,legend};
})();
