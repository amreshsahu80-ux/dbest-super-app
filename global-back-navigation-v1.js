(function(){
'use strict';
const V='20260913-global-back-nav-v1';
if(window.DBEST_GLOBAL_BACK_NAV&&window.DBEST_GLOBAL_BACK_NAV.version===V)return;

function goBack(){
  try{
    if(window.history.length>1){window.history.back();return;}
  }catch(_){}
  location.href='/';
}

function installButton(){
  if(document.getElementById('dbestGlobalBack'))return;
  const b=document.createElement('button');
  b.id='dbestGlobalBack';
  b.type='button';
  b.setAttribute('aria-label','Back');
  b.title='Back';
  b.textContent='←';
  b.style.cssText='position:fixed;left:12px;top:74px;z-index:99990;width:40px;height:40px;border:1px solid rgba(23,92,255,.14);border-radius:14px;background:rgba(255,255,255,.96);color:#175cff;box-shadow:0 8px 22px rgba(24,39,75,.13);font:900 23px/1 system-ui,-apple-system,Segoe UI,Arial,sans-serif;display:grid;place-items:center;padding:0;cursor:pointer;backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent';
  b.addEventListener('click',goBack);
  document.body.appendChild(b);
}

let sx=0,sy=0,st=0,tracking=false,blocked=false;
function isBlockedTarget(t){
  if(!t||!t.closest)return false;
  return !!t.closest('input,textarea,select,[contenteditable="true"],.tabs,[data-horizontal-scroll],.carousel,.slider');
}
function start(e){
  if(!e.touches||e.touches.length!==1)return;
  const t=e.target;
  blocked=isBlockedTarget(t);
  tracking=!blocked;
  if(!tracking)return;
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();
}
function end(e){
  if(!tracking){tracking=false;return;}
  tracking=false;
  if(!e.changedTouches||!e.changedTouches.length)return;
  const ex=e.changedTouches[0].clientX,ey=e.changedTouches[0].clientY;
  const dx=ex-sx,dy=Math.abs(ey-sy),dt=Date.now()-st;
  if(dx>=76&&dy<=Math.max(46,dx*.55)&&dt<=900)goBack();
}

document.addEventListener('touchstart',start,{passive:true,capture:true});
document.addEventListener('touchend',end,{passive:true,capture:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});else installButton();
new MutationObserver(installButton).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_GLOBAL_BACK_NAV={version:V,back:goBack};
})();
