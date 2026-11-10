/* Developer splash: "Zocus AI." + tagline. Shows on every page load, fades out when the app is ready (min ~1.9s). Click or key skips. */
(function(){
'use strict';
var el=document.getElementById('splash');
var skip=false;try{skip=sessionStorage.getItem('zocus-skip-splash')==='1';sessionStorage.removeItem('zocus-skip-splash')}catch(e){}
var resolveDone;var done=new Promise(function(r){resolveDone=r});
var minPassed=false,ready=false,closed=false;
function close(){if(closed)return;closed=true;if(el){el.classList.add('out');setTimeout(function(){el.remove()},700)}resolveDone()}
function check(){if(minPassed&&ready)close()}
if(skip||!el){if(el)el.remove();closed=true;resolveDone();window.ZSplash={done:done,ready:function(){}};return}
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
setTimeout(function(){minPassed=true;check()},reduce?900:1900);
el.addEventListener('click',function(){if(ready)close()});
addEventListener('keydown',function(e){if(!closed&&ready&&(e.key==='Enter'||e.key===' '||e.key==='Escape')){e.preventDefault();close()}});
window.ZSplash={done:done,ready:function(){ready=true;var h=document.getElementById('spHint');if(h)h.textContent='Click to continue';check()}};
})();
