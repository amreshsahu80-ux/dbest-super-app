(function(){
'use strict';
// Marketplace cards must expose exactly one cart action. Other scripts can
// inject buttons after the original catalogue renders.
function clean(card){
 if(!card||!card.isConnected)return;
 var body=card.querySelector('.productBody')||card;
 var native=body.querySelector('.qtyControl,.addCartBtn');
 var buttons=Array.from(card.querySelectorAll('button'));
 var cartButtons=buttons.filter(function(b){
   return /add\\s*to\\s*cart/i.test(b.textContent||'') ||
     b.classList.contains('addCartBtn') ||
     (b.closest('.qtyControl')!==null);
 });
 var keep=native&&native.classList.contains('qtyControl')?null:native;
 // If a native quantity selector exists, preserve both its +/- buttons.
 cartButtons.forEach(function(b){
   if(b.closest('.qtyControl')){
     if(native&&native.classList.contains('qtyControl')&&b.closest('.qtyControl')===native)return;
     if(native&&native.classList.contains('addCartBtn')){b.closest('.qtyControl').remove();return;}
   }
   if(b!==keep)b.remove();
 });
 // Remove redundant injected quantity summaries sitting outside the product body.
 Array.from(card.children).forEach(function(el){
   if(el.classList.contains('productImage')||el.classList.contains('productBody'))return;
   var t=(el.textContent||'').trim();
   if(t&&/^\\d+\\s*[×x]\\s*[^\\n]{1,90}$/.test(t)&&!el.querySelector('button,input'))el.remove();
 });
 Array.from(card.childNodes).forEach(function(n){
   if(n.nodeType===3&&/^\\s*\\d+\\s*[×x]\\s*[^\\n]{1,90}\\s*$/.test(n.textContent||''))n.remove();
 });
}
function scan(){document.querySelectorAll('.productCard').forEach(clean)}
var busy=false;
function schedule(){if(busy)return;busy=true;requestAnimationFrame(function(){busy=false;scan()})}
function start(){scan();new MutationObserver(function(records){if(records.some(function(r){return r.addedNodes.length>0||r.type==='characterData'}))schedule()}).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();