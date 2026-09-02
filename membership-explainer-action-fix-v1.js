(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX)return;
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
window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX={version:'20260902-v1',close:closeModal,openRegistration:openRegistration};
})();