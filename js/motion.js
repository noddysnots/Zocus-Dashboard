/* Zocus motion. Purpose over decoration: every animation explains a change.
   - page(fn,dir): route change; content slides in from the side you navigated toward, cards stagger, charts draw, numbers count up.
   - flip(fn): wraps every re-render. Before it runs we record numbers, bar widths, column heights, line shapes and the active
     tab pill; after it we tween each to its new value, so changing the time range or a filter shows WHAT changed, not a redraw.
   - enter(el): entrance on a container. Cards below the fold wait and animate when scrolled into view.
   - mobile(): dots for chart carousels. Also: bottom-nav hides on scroll, sheet drag-to-close, swipe between reps, cursor light.
   All of it is skipped under prefers-reduced-motion (the CSS also disables animation and transitions). */
window.ZM=(function(){
'use strict';
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>matchMedia('(max-width:860px)').matches;
const EASE='cubic-bezier(.2,.9,.25,1.03)';
let busy=false,io=null;
const P=/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/;

/* ---------- numbers ---------- */
function tween(el,from,to,pre,post,dec,dur){const t0=performance.now(),final=pre+to.toFixed(dec)+post;
  (function step(now){const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);
    if(k<1&&el.isConnected){el.textContent=pre+(from+(to-from)*e).toFixed(dec)+post;requestAnimationFrame(step)}else if(el.isConnected)el.textContent=el.dataset.final||final})(t0);
  setTimeout(()=>{if(el.isConnected)el.textContent=el.dataset.final||final},dur+140)}
function countUp(root){
  root.querySelectorAll('.k-m b,.kpi .val,.statline b').forEach(el=>{
    const txt=el.textContent,m=txt.match(P);if(!m)return;
    const end=parseFloat(m[2].replace(/,/g,''));if(!isFinite(end)||end===0)return;
    el.dataset.final=txt;tween(el,0,end,m[1],m[3],(m[2].split('.')[1]||'').length,560)})}
function roll(el,o,n){const a=o.match(P),b=n.match(P);if(!a||!b||a[1]!==b[1]||a[3]!==b[3])return;
  const from=parseFloat(a[2].replace(/,/g,'')),to=parseFloat(b[2].replace(/,/g,''));if(!isFinite(from)||!isFinite(to)||from===to)return;
  el.dataset.final=n;tween(el,from,to,b[1],b[3],(b[2].split('.')[1]||'').length,520)}

/* ---------- value-to-value tweening across a re-render ---------- */
const NUM='.k-m b,.kpi .val,.statline b,.sb-l b,.bl-v',BARS='.bl-t>i,.pl-t>i,.bar>i,.bl-p,.fbar>i';
function capture(){const pg=document.getElementById('page');if(!pg||busy)return null;
  return {route:location.hash,
    nums:[...pg.querySelectorAll(NUM)].map(e=>e.textContent),
    bars:[...pg.querySelectorAll(BARS)].map(e=>e.getBoundingClientRect().width),
    cols:[...pg.querySelectorAll('.col')].map(e=>{try{return e.getBBox().height}catch(x){return 0}}),
    lines:[...pg.querySelectorAll('.ln')].map(e=>e.getAttribute('d'))}}
function apply(s){const pg=document.getElementById('page');if(!s||!pg||s.route!==location.hash||reduce())return;
  const nums=[...pg.querySelectorAll(NUM)];if(nums.length===s.nums.length)nums.forEach((e,i)=>{if(s.nums[i]!==e.textContent)roll(e,s.nums[i],e.textContent)});
  const bars=[...pg.querySelectorAll(BARS)];if(bars.length===s.bars.length)bars.forEach((e,i)=>{const nw=e.getBoundingClientRect().width,ow=s.bars[i];
    if(e.animate&&Math.abs(nw-ow)>1.5)e.animate([{width:ow+'px'},{width:nw+'px'}],{duration:520,easing:EASE})});
  const cols=[...pg.querySelectorAll('.col')];if(cols.length===s.cols.length)cols.forEach((e,i)=>{let nh=0;try{nh=e.getBBox().height}catch(x){}const oh=s.cols[i];
    if(e.animate&&oh>0&&nh>0&&Math.abs(nh-oh)>1)e.animate([{transformBox:'fill-box',transformOrigin:'50% 100%',transform:`scaleY(${oh/nh})`},{transformBox:'fill-box',transformOrigin:'50% 100%',transform:'scaleY(1)'}],{duration:520,easing:EASE})});
  const lines=[...pg.querySelectorAll('.ln')];if(lines.length===s.lines.length)lines.forEach((e,i)=>{const nd=e.getAttribute('d'),od=s.lines[i];
    if(!e.animate||!od||od===nd||od.replace(/[-\d.\s]/g,'')!==nd.replace(/[-\d.\s]/g,''))return;
    try{e.animate([{d:`path("${od}")`},{d:`path("${nd}")`}],{duration:560,easing:EASE})}catch(x){}})}

/* ---------- entrance (cards below the fold wait for scroll) ---------- */
function reveal(el){if(reduce()||!window.IntersectionObserver)return;if(io)io.disconnect();
  io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('shown');io.unobserve(e.target)}}),{rootMargin:'0px 0px -6% 0px',threshold:.06});
  el.querySelectorAll('.card,details.xband,.drill').forEach(c=>{if(c.parentElement&&c.parentElement.closest('.card'))return;
    if(c.getBoundingClientRect().top>innerHeight*.92){c.classList.add('reveal');io.observe(c)}})}
function enter(el,dir){if(!el||reduce()||document.hidden)return;
  el.dataset.dir=dir||'u';el.classList.remove('enter');void el.offsetWidth;el.classList.add('enter');
  countUp(el);reveal(el);setTimeout(()=>el.classList.remove('enter'),1300)}
function soft(sel){if(reduce())return;document.querySelectorAll(sel).forEach(el=>{el.classList.remove('soft');void el.offsetWidth;el.classList.add('soft');setTimeout(()=>el.classList.remove('soft'),260)})}
function page(fn,dir){busy=true;try{fn()}finally{busy=false}enter(document.getElementById('page'),dir)}

/* ---------- sliding pill + tween wrapper for every re-render ---------- */
const GROUPS='.nav,.seg,.tabs,.otabs',ACTIVE='[aria-current="page"],[aria-pressed="true"],[aria-selected="true"]';
const snap=()=>[...document.querySelectorAll(GROUPS)].map(g=>{const a=g.querySelector(ACTIVE);return a?a.getBoundingClientRect():null});
function flip(fn){if(reduce()){fn();dots();return}
  const before=snap(),data=capture();fn();dots();
  document.querySelectorAll(GROUPS).forEach((g,i)=>{const a=g.querySelector(ACTIVE),b=before[i];if(!a||!b||!a.animate)return;
    const r=a.getBoundingClientRect(),dx=b.left-r.left;if(Math.abs(dx)<2||Math.abs(b.top-r.top)>4||b.width===0)return;
    a.animate([{transform:`translateX(${dx}px)`},{transform:'none'}],{duration:380,easing:EASE})});
  apply(data)}

/* ---------- chart carousels on phones: position dots ---------- */
function dots(){document.querySelectorAll('.dots2').forEach(d=>d.remove());if(!mobile())return;
  document.querySelectorAll('#page .cgrid3,#page .agrid').forEach(c=>{const n=c.children.length;if(n<2)return;
    const d=document.createElement('div');d.className='dots2';d.setAttribute('aria-hidden','true');
    d.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i?'':'on'}" data-i="${i}"></i>`).join('');c.after(d);
    c.addEventListener('scroll',()=>{const w=c.children[0].offsetWidth+12,i=Math.round(c.scrollLeft/w);d.querySelectorAll('i').forEach((x,k)=>x.classList.toggle('on',k===i))},{passive:true});
    d.addEventListener('click',e=>{const i=e.target.dataset&&e.target.dataset.i;if(i!=null)c.children[+i].scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})})})}

/* ---------- expand / collapse with spring height ---------- */
document.addEventListener('click',e=>{
  const sum=e.target.closest&&e.target.closest('#page summary');if(!sum||reduce())return;
  if(e.target.closest('[data-go],[data-conv],[data-filter],[data-rf],a,button,select,input'))return;
  const d=sum.parentElement,body=sum.nextElementSibling;if(!d||!body||!body.animate)return;
  e.preventDefault();if(d.dataset.busy)return;d.dataset.busy='1';
  const done=()=>{delete d.dataset.busy;body.style.overflow=''};body.style.overflow='hidden';
  if(d.open){const h=body.offsetHeight;body.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:220,easing:'ease-in'}).onfinish=()=>{d.open=false;done()}}
  else{d.open=true;const h=body.offsetHeight;body.animate([{height:'0px',opacity:0},{height:h+'px',opacity:1}],{duration:420,easing:EASE}).onfinish=done}
});

/* ---------- cursor light on cards (mouse only) ---------- */
document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const c=e.target.closest&&e.target.closest('.card');
  if(c){const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')}},{passive:true});

/* ---------- phones: hide bottom nav while scrolling down, drag sheet to close, swipe between reps ---------- */
let ly=0;addEventListener('scroll',()=>{if(!mobile())return;const y=scrollY;
  if(y>ly+8&&y>140)document.body.classList.add('nav-hide');else if(y<ly-8||y<90)document.body.classList.remove('nav-hide');ly=y},{passive:true});
let drag=null,sw=null;
document.addEventListener('touchstart',e=>{if(!mobile())return;const t=e.touches[0],T=e.target;
  const h=T.closest&&T.closest('.drawer .grab,.drawer .dhead');if(h){drag={y:t.clientY,d:document.querySelector('.drawer'),dy:0};return}
  if(T.closest&&T.closest('.rephead,.rnav')&&!T.closest('select'))sw={x:t.clientX,y:t.clientY}},{passive:true});
document.addEventListener('touchmove',e=>{if(!drag)return;drag.dy=Math.max(0,e.touches[0].clientY-drag.y);drag.d.style.animation='none';drag.d.style.transform=`translateY(${drag.dy}px)`},{passive:true});
document.addEventListener('touchend',e=>{
  if(drag){const {d,dy}=drag;drag=null;
    if(dy>110){d.style.transition='transform .22s ease-in';d.style.transform='translateY(100%)';setTimeout(()=>{const x=document.querySelector('.drawer [data-act=close].iconbtn');if(x)x.click()},200)}
    else{d.style.transition='transform .4s '+EASE;d.style.transform='';setTimeout(()=>{d.style.transition=''},420)}}
  if(sw){const t=e.changedTouches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y;sw=null;
    if(Math.abs(dx)>80&&Math.abs(dy)<40){const b=document.querySelectorAll('.rsw .iconbtn');if(b.length===2)b[dx<0?1:0].click()}}});

return {page,enter,soft,flip,dots};
})();
