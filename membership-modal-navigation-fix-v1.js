(function(){
'use strict';
const VERSION='20260906-membership-modal-navigation-v2-selectsafe';
if(window.DBEST_MEMBERSHIP_MODAL_NAV?.version===VERSION)return;
const STATE_KEY='dbestMembershipExplainer';
let sx=0,sy=0,st=0;
function modal(){return document.getElementById('dbestMembershipSafeModal')}
function activeRegistration(){return !!document.querySelector('#dbestSimpleMemberForm,#dbestOwnerSimpleMemberForm,.dbestSimpleReg,.dbestOwnerOnboard,.registrationPage')}
function isPlanTrigger(el){
  if(!el||modal()||activeRegistration())return false;
  let n=el.closest?.('button,a,[role="button"],.tile,.card,.plan')||el;
  for(let i=0;n&&n!==document.body&&i<4;i++,n=n.parentElement){
    const oc=String(n.getAttribute?.('onclick')||'');
    if(/reg\(\s*['"](?:leader|prime|promoter|guest)['"]\s*\)/i.test(oc))return true;
    const t=String(n.innerText||n.textContent||'').toLowerCase();
    if(t.length<650&&((t.includes('leader')&&t.includes('999'))||(t.includes('prime')&&t.includes('599'))||(t.includes('promoter')&&t.includes('299'))||(t.includes('guest')&&(/\b49\b/.test(t)||t.includes('₹49')))))return true;
  }
  return false;
}
function hasMarker(){try{return !!(history.state&&history.state[STATE_KEY])}catch(e){return false}}
function pushMarker(){
  if(hasMarker())return;
  try{history.pushState(Object.assign({},history.state||{}, {[STATE_KEY]:true}),'',location.href)}catch(e){}
}
function clearMarker(){
  if(!hasMarker())return;
  try{const s=Object.assign({},history.state||{});delete s[STATE_KEY];history.replaceState(s,'',location.href)}catch(e){}
}
function dismiss(){
  const m=modal();
  if(hasMarker()){
    try{history.back();return}catch(e){}
  }
  try{m&&m.remove()}catch(e){}
}
function wrapAuthority(){
  const a=window.DBEST_FINAL_UI_AUTHORITY;
  if(!a||typeof a.openMembershipCard!=='function'||a.__dbestNavWrapped)return;
  const original=a.openMembershipCard;
  a.openMembershipCard=function(plan){pushMarker();return original.call(this,plan)};
  a.__dbestNavWrapped=true;
}
/* Keep Back/back-swipe dismissible, but never navigate backward when a plan is
   selected. Selection must stay on the current history entry so the registration
   form can open and remain visible. */
window.addEventListener('click',function(e){
  const m=modal();
  if(m){
    const close=e.target.closest?.('.dbsafeClose');
    const select=e.target.closest?.('.dbsafeSelect');
    if(select){clearMarker();return}
    if(close||e.target===m){if(hasMarker())setTimeout(function(){try{history.back()}catch(_){}},0);return}
  }
  if(isPlanTrigger(e.target))pushMarker();
},true);
window.addEventListener('popstate',function(){
  const m=modal();
  if(m){try{m.remove()}catch(e){}}
},true);
window.addEventListener('touchstart',function(e){
  if(!modal()||!e.touches||e.touches.length!==1)return;
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();
},{passive:true,capture:true});
window.addEventListener('touchend',function(e){
  if(!modal()||!e.changedTouches||e.changedTouches.length!==1)return;
  const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy,dt=Date.now()-st;
  if(dx>85&&Math.abs(dy)<90&&dt<900)dismiss();
},{passive:true,capture:true});
setTimeout(wrapAuthority,0);
setTimeout(wrapAuthority,700);
window.addEventListener('load',wrapAuthority,{once:true});
window.DBEST_MEMBERSHIP_MODAL_NAV={version:VERSION,dismiss:dismiss,pushState:pushMarker,clearState:clearMarker};
})();