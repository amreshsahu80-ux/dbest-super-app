(function(){
'use strict';
function clean(card){
 if(!card||!card.isConnected)return;
 const body=card.querySelector('.productBody');
 if(!body)return;
 const native=body.querySelector('.qtyControl,.addCartBtn');
 if(!native)return;
 // Keep only the original, stateful catalogue control; remove injected duplicates.
 const candidates=Array.from(card.querySelectorAll('button')).filter(b=>
   /add\s*to\s*cart/i.test(b.textContent||'')||
   b.classList.contains('addCartBtn')||
   !!b.closest('.qtyControl')||
   /^[+−-]$/.test((b.textContent||'').trim())
 );
 candidates.forEach(b=>{
   if(b===native||native.contains(b))return;
   const group=b.closest('.qtyControl');
   if(group&&group!==native&&!group.contains(native)){group.remove();return}
   const parent=b.parentElement;
   if(parent&&parent!==body&&parent!==card&&parent.children.length===1&&!parent.contains(native))parent.remove();
   else b.remove();
 });
 // Remove stray "2 Plates" / "1 × Large" labels appended after the native card body.
 const extras=Array.from(card.childNodes).filter(n=>n!==body&&!((n.nodeType===1)&&n.classList.contains('productImage')));
 extras.forEach(n=>{
   if(n.nodeType===3){if(/^\s*\d+\s*(?:[×x]\s*)?[^\n]{1,60}\s*$/.test(n.textContent||''))n.remove();return}
   if(n.nodeType!==1)return;
   if(n.classList.contains('dbestQtyControl')){n.remove();return}
   if(n.querySelector('button,input,.qtyControl,.addCartBtn'))return;
   const t=(n.textContent||'').trim();
   if(/^\d+\s*(?:[×x]\s*)?(?:Plates?|Items?|Large|Regular|Pieces?|Pcs?|Qty\b)[^\n]{0,40}$/i.test(t))n.remove();
 });
}
function scan(){document.querySelectorAll('.productCard').forEach(clean)}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan()})}
function start(){scan();new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule()}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();