(function(){
'use strict';
const V='20260902-v2';
if(window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX?.version===V)return;
function modal(){return document.getElementById('dbestMembershipPlanModal')}
function closeModal(e){
  if(e){try{e.preventDefault()}catch(_){}try{e.stopPropagation()}catch(_){}try{e.stopImmediatePropagation()}catch(_){}}
  var m=modal();if(m&&m.parentNode)m.parentNode.removeChild(m);
}
function sourceFor(plan){
  var nodes=document.querySelectorAll('button,a,[role="button"]');
  for(var i=0;i<nodes.length;i++){
    var el=nodes[i];
    if(el.closest&&el.closest('#dbestMembershipPlanModal'))continue;
    var oc=String(el.getAttribute&&el.getAttribute('onclick')||'');
    if(oc&&new RegExp("\\breg\\(\\s*['\\\"]"+plan+"['\\\"]\\s*\\)",'i').test(oc))return el;
  }
  return null;
}
function openRegistration(plan){
  var src=sourceFor(plan);
  if(src&&typeof src.onclick==='function'){
    try{src.onclick.call(src);return true}catch(e){console.warn('DBest membership registration direct handler',e)}
  }
  try{if(typeof window.reg==='function'){window.reg(plan);return true}}catch(e){console.warn('DBest membership registration window.reg',e)}
  try{
    if(typeof window.registerChoice==='function')window.registerChoice();
    setTimeout(function(){try{if(typeof window.reg==='function')window.reg(plan)}catch(_){}},0);
    return true;
  }catch(e){}
  return false;
}
function repairModal(){
  var m=modal();if(!m)return;
  var x=m.querySelector('.dbmClose');
  if(x)x.onclick=function(e){closeModal(e);return false};
  var buttons=m.querySelectorAll('.dbmChoose');
  for(var i=0;i<buttons.length;i++)buttons[i].onclick=function(e){
    var plan=String(this.dataset.plan||'').toLowerCase();
    closeModal(e);
    if(plan)setTimeout(function(){openRegistration(plan)},0);
    return false;
  };
}
function onClick(e){
  var m=modal();if(!m)return;
  var closeBtn=e.target&&e.target.closest?e.target.closest('.dbmClose'):null;
  if(closeBtn&&m.contains(closeBtn)){closeModal(e);return}
  var choose=e.target&&e.target.closest?e.target.closest('.dbmChoose'):null;
  if(choose&&m.contains(choose)){
    var plan=String(choose.dataset.plan||'').toLowerCase();
    closeModal(e);
    if(plan)setTimeout(function(){openRegistration(plan)},0);
    return;
  }
  if(e.target===m)closeModal(e);
}
document.addEventListener('click',onClick,true);
document.addEventListener('pointerup',function(e){var m=modal();if(!m)return;var b=e.target&&e.target.closest?e.target.closest('.dbmClose'):null;if(b&&m.contains(b))closeModal(e)},true);
// A restored browser/history snapshot can recreate the explainer DOM without its original element handlers.
// Never leave that stale overlay on screen when navigating back from registration.
window.addEventListener('popstate',function(){setTimeout(closeModal,0);setTimeout(closeModal,120)});
window.addEventListener('pageshow',function(e){if(e&&e.persisted){setTimeout(closeModal,0);setTimeout(closeModal,120)}else setTimeout(repairModal,0)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal())closeModal(e)},true);
setTimeout(repairModal,0);
window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX={version:V,close:closeModal,openRegistration:openRegistration,repair:repairModal};
})();