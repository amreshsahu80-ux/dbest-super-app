(function(){
'use strict';
function repairCard(card){
  if(!card||!card.isConnected)return;
  var body=card.querySelector('.productBody')||card;
  var controls=Array.from(body.querySelectorAll('.addCartBtn,.qtyControl'));
  if(controls.length<2)return;
  // Keep the quantity selector whenever the product is already in the cart.
  var keep=controls.find(function(el){return el.classList.contains('qtyControl')})||controls[0];
  controls.forEach(function(el){if(el!==keep)el.remove()});
}
function scan(root){
  if(root&&root.nodeType===1){
    if(root.matches&&root.matches('.productCard'))repairCard(root);
    if(root.querySelectorAll)root.querySelectorAll('.productCard').forEach(repairCard);
  }
}
var pending=false;
function schedule(){if(pending)return;pending=true;queueMicrotask(function(){pending=false;scan(document.body)})}
function start(){
  scan(document.body);
  new MutationObserver(function(records){
    if(records.some(function(r){return r.addedNodes.length>0}))schedule();
  }).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();