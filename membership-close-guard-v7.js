(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_CLOSE_GUARD_V8)return;
window.DBEST_MEMBERSHIP_CLOSE_GUARD_V8=true;
var suppressUntil=0;
function blocker(){
  var old=document.getElementById('dbestMembershipCloseBlocker');if(old)old.remove();
  var b=document.createElement('div');b.id='dbestMembershipCloseBlocker';b.style.cssText='position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none;';
  function kill(e){try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){} }
  ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'].forEach(function(ev){b.addEventListener(ev,kill,{capture:true,passive:false})});
  document.body.appendChild(b);setTimeout(function(){if(b.parentNode)b.remove()},380);
}
function closeNow(e){
  try{if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}}catch(_){}
  var m=document.getElementById('dbestMembershipPlanModal');if(m)m.remove();
  if(e)blocker();
}
function isRegistrationInteraction(target){
  var el=target&&target.nodeType===1?target:target&&target.parentElement;
  if(!el)return false;
  if(el.closest&&el.closest('#dbestMembershipPlanModal'))return false;
  if(el.matches&&el.matches('input,textarea,select,option,[contenteditable="true"]'))return true;
  if(el.closest&&el.closest('form'))return true;
  for(var i=0,node=el;node&&node!==document.body&&i<8;i++,node=node.parentElement){
    try{
      var controls=node.querySelectorAll&&node.querySelectorAll('input,textarea,select');
      var txt=String(node.innerText||node.textContent||'');
      if(controls&&controls.length>=2&&/(full\s*name|mobile|email|kyc|photo\s*id|registration|register)/i.test(txt))return true;
    }catch(_){}
  }
  return false;
}
function suppressForRegistration(target){
  if(!isRegistrationInteraction(target))return;
  suppressUntil=Date.now()+1200;
  var m=document.getElementById('dbestMembershipPlanModal');if(m)m.remove();
}
['pointerdown','touchstart','mousedown'].forEach(function(ev){
  document.addEventListener(ev,function(e){suppressForRegistration(e.target)},{capture:true,passive:true});
});
document.addEventListener('focusin',function(e){
  if(isRegistrationInteraction(e.target)){suppressUntil=Date.now()+1200;var m=document.getElementById('dbestMembershipPlanModal');if(m)m.remove()}
},true);
var observer=new MutationObserver(function(){
  var m=document.getElementById('dbestMembershipPlanModal');
  if(!m)return;
  var active=document.activeElement;
  if(Date.now()<suppressUntil||isRegistrationInteraction(active))m.remove();
});
function startObserver(){try{observer.observe(document.documentElement||document.body,{childList:true,subtree:true})}catch(_){} }
if(document.documentElement)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});
document.addEventListener('pointerdown',function(e){
  var m=document.getElementById('dbestMembershipPlanModal');if(!m)return;
  var x=e.target&&e.target.closest?e.target.closest('.db6-close,.db5-close,.dbmClose'):null;
  if(x&&m.contains(x))closeNow(e);
},{capture:true,passive:false});
document.addEventListener('touchstart',function(e){
  var m=document.getElementById('dbestMembershipPlanModal');if(!m)return;
  var x=e.target&&e.target.closest?e.target.closest('.db6-close,.db5-close,.dbmClose'):null;
  if(x&&m.contains(x))closeNow(e);
},{capture:true,passive:false});
})();
