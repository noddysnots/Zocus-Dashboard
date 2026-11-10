/* Developer splash: "Zocus AI." + tagline, every page load. When the app is ready the big title shrinks and travels into the
   logo in the top bar while the dashboard rises in behind it. Click or any key skips ahead. */
(function(){
'use strict';
var el=document.getElementById('splash');
var skip=false;try{skip=sessionStorage.getItem('zocus-skip-splash')==='1';sessionStorage.removeItem('zocus-skip-splash')}catch(e){}
var rs,rd;var start=new Promise(function(r){rs=r}),done=new Promise(function(r){rd=r});
var minPassed=false,ready=false,closed=false;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function fade(){el.classList.add('out');setTimeout(function(){el.remove();rd()},650)}
function close(){if(closed)return;closed=true;rs();
  var title=el.querySelector('.sp-title'),logo=document.querySelector('.top .logo span');
  if(reduce||!title||!logo||!title.animate){fade();return}
  var a=title.getBoundingClientRect(),b=logo.getBoundingClientRect();
  if(!a.width||!b.width||document.hidden){fade();return}
  var s=b.height/a.height*1.05,dx=(b.left+b.width/2)-(a.left+a.width/2),dy=(b.top+b.height/2)-(a.top+a.height/2),end='translate('+dx+'px,'+dy+'px) scale('+s+')';
  el.classList.add('handoff');
  var anim=title.animate([{transform:'none',opacity:1},{transform:end,opacity:1,offset:.86},{transform:end,opacity:0}],{duration:820,easing:'cubic-bezier(.65,0,.2,1)',fill:'forwards'});
  logo.animate([{opacity:0},{opacity:0,offset:.8},{opacity:1}],{duration:820});
  anim.onfinish=function(){el.remove();rd()};
  setTimeout(function(){if(el.isConnected){el.remove();rd()}},1400)}
function check(){if(minPassed&&ready)close()}
window.ZSplash={start:start,done:done,ready:function(){ready=true;var h=document.getElementById('spHint');if(h)h.textContent='Click to continue';check()}};
if(skip||!el){if(el)el.remove();closed=true;rs();rd();window.ZSplash.ready=function(){};return}
setTimeout(function(){minPassed=true;check()},reduce?900:1900);
el.addEventListener('click',function(){if(ready)close()});
addEventListener('keydown',function(e){if(!closed&&ready&&(e.key==='Enter'||e.key===' '||e.key==='Escape')){e.preventDefault();close()}});
})();
