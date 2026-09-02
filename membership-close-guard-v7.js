(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_CLOSE_GUARD_V7)return;
window.DBEST_MEMBERSHIP_CLOSE_GUARD_V7=true;
function blocker(){
  var old=document.getElementById('dbestMembershipCloseBlocker');if(old)old.remove();
  var b=document.createElement('div');b.id='dbestMembershipCloseBlocker';b.style.cssText='position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none;';
  function kill(e){try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){} }
  ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'].forEach(function(ev){b.addEventListener(ev,kill,{capture:true,passive:false})});
  document.body.appendChild(b);setTimeout(function(){if(b.parentNode)b.remove()},380);
}
function closeNow(e){
  try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){}
  var m=document.getElementById('dbestMembershipPlanModal');if(m)m.remove();
  blocker();
}
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
