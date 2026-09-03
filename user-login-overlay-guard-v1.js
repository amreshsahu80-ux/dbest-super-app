(function(){
'use strict';
if(window.DBEST_USER_LOGIN_OVERLAY_GUARD)return;
const V='20260903-user-login-overlay-guard-v1';
let navUntil=0,lastKey='',lastAt=0;

function closeExplainer(){
  try{
    const m=document.getElementById('dbestMembershipPlanModal');
    if(m&&!m.classList.contains('registrationPage'))m.remove();
  }catch(_){}
}
function mark(ms=5000){navUntil=Math.max(navUntil,Date.now()+ms);window.__DBEST_LOGIN_NAV_UNTIL=navUntil;closeExplainer();[0,30,100,220,500].forEach(t=>setTimeout(closeExplainer,t))}
function actionFor(el){
  if(!el)return'';
  const btn=el.closest?.('button,a,[role="button"]');if(!btn)return'';
  if(btn.closest?.('#dbestMembershipPlanModal'))return'';
  const oc=String(btn.getAttribute('onclick')||'').replace(/\s+/g,'');
  if(btn.id==='account'||/^account\(\);?$/.test(oc))return'account';
  if(/^loginChoice\(\);?$/.test(oc))return'loginChoice';
  if(/^memberLogin\(\);?$/.test(oc))return'memberLogin';
  return'';
}
function runAction(name){
  mark();
  try{
    const fn=window[name];
    if(typeof fn==='function'){fn();return true}
  }catch(e){console.warn('DBest user login navigation guard',e)}
  return false;
}
function press(e){
  const name=actionFor(e.target);if(!name)return;
  const key=name+'|'+String(e.target?.textContent||'').trim().slice(0,40),now=Date.now();
  if(key===lastKey&&now-lastAt<450)return;
  lastKey=key;lastAt=now;
  runAction(name);
}
// Run the intended Account/Login navigation before legacy document-click
// membership listeners can mistake the surrounding membership-price text for a plan card.
document.addEventListener('pointerdown',press,{capture:true,passive:true});
document.addEventListener('touchstart',press,{capture:true,passive:true});
document.addEventListener('mousedown',press,true);

// On current builds, suppress the later inline click because the intended action
// already ran on pointer/touch down. On older cached builds an earlier explainer
// listener may stop this event; the post-press cleanup above still removes its overlay.
document.addEventListener('click',function(e){
  const name=actionFor(e.target);if(!name||Date.now()>navUntil)return;
  try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){}
  closeExplainer();
},true);

function wrap(name){
  try{
    const base=window[name];if(typeof base!=='function'||base.__dbestLoginGuard)return;
    const guarded=function(){mark();const r=base.apply(this,arguments);mark();return r};
    guarded.__dbestLoginGuard=true;guarded.__dbestBase=base;window[name]=guarded;
  }catch(_){}
}
function install(){['account','loginChoice','memberLogin'].forEach(wrap)}

// If any older membership layer creates an explainer while the account/login
// navigation is active, remove only that explainer. Registration pages are untouched.
const mo=new MutationObserver(function(){
  if(Date.now()<=navUntil)closeExplainer();
  install();
});
mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,350,900,1800,3500].forEach(t=>setTimeout(install,t));
window.addEventListener('pageshow',function(){closeExplainer();install()});
window.addEventListener('popstate',function(){closeExplainer();setTimeout(install,0)});

window.DBEST_USER_LOGIN_OVERLAY_GUARD={version:V,close:closeExplainer,mark,install};
})();
