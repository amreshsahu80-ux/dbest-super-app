(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_CLOSE_GUARD_V9)return;
window.DBEST_MEMBERSHIP_CLOSE_GUARD_V9=true;

function blocker(){
  var old=document.getElementById('dbestMembershipCloseBlocker');if(old)old.remove();
  var b=document.createElement('div');b.id='dbestMembershipCloseBlocker';b.style.cssText='position:fixed;inset:0;z-index:2147483646;background:transparent;touch-action:none;';
  function kill(e){try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){} }
  ['pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click'].forEach(function(ev){b.addEventListener(ev,kill,{capture:true,passive:false})});
  document.body.appendChild(b);setTimeout(function(){if(b.parentNode)b.remove()},320);
}

function closeNow(e){
  try{if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}}catch(_){}
  var m=document.getElementById('dbestMembershipPlanModal');
  if(m&&m.classList.contains('registrationPage')===false)m.remove();
  if(e)blocker();
}

/*
  The membership explainer listens for click events on document capture and
  infers a plan from ancestor text. Registration pages also contain the plan
  name/price, so Camera, Gallery, UPI and Submit clicks were being mistaken for
  membership-card clicks and cancelled before their own handlers could run.

  For the duration of a registration click, temporarily make the registration
  page look like the explainer modal. The explainer therefore ignores that
  click, while normal browser/default actions and the form's own handlers still
  run. The original id is restored immediately after the event completes.
*/
function protectRegistrationClick(e){
  var el=e.target&&e.target.nodeType===1?e.target:e.target&&e.target.parentElement;
  var page=el&&el.closest?el.closest('.registrationPage'):null;
  if(!page)return;

  var realModal=document.getElementById('dbestMembershipPlanModal');
  if(realModal&&realModal!==page){try{realModal.remove()}catch(_){} }

  if(page.id==='dbestMembershipPlanModal')return;
  var hadId=page.hasAttribute('id');
  var oldId=hadId?page.getAttribute('id'):'';
  page.id='dbestMembershipPlanModal';
  setTimeout(function(){
    try{
      if(page.id!=='dbestMembershipPlanModal')return;
      if(hadId)page.id=oldId;else page.removeAttribute('id');
    }catch(_){}
  },0);
}
window.addEventListener('click',protectRegistrationClick,true);

/* Keep any stale explainer from covering an active registration screen. */
['pointerdown','touchstart','focusin'].forEach(function(ev){
  document.addEventListener(ev,function(e){
    var el=e.target&&e.target.nodeType===1?e.target:e.target&&e.target.parentElement;
    var page=el&&el.closest?el.closest('.registrationPage'):null;
    if(!page)return;
    var m=document.getElementById('dbestMembershipPlanModal');
    if(m&&m!==page){try{m.remove()}catch(_){} }
  },true);
});

/* Reliable X close without letting the same tap hit the page behind it. */
document.addEventListener('pointerdown',function(e){
  var m=document.getElementById('dbestMembershipPlanModal');if(!m||m.classList.contains('registrationPage'))return;
  var x=e.target&&e.target.closest?e.target.closest('.db6-close,.db5-close,.dbmClose'):null;
  if(x&&m.contains(x))closeNow(e);
},{capture:true,passive:false});
document.addEventListener('touchstart',function(e){
  var m=document.getElementById('dbestMembershipPlanModal');if(!m||m.classList.contains('registrationPage'))return;
  var x=e.target&&e.target.closest?e.target.closest('.db6-close,.db5-close,.dbmClose'):null;
  if(x&&m.contains(x))closeNow(e);
},{capture:true,passive:false});
})();
