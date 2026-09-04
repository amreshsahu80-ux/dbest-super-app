(function(){
'use strict';
const V='20260904-customer-terminal-status-v1';
if(window.DBEST_CUSTOMER_TERMINAL_STATUS_FIX?.version===V)return;
function normalize(){
 document.querySelectorAll('.dbestGoogleTrackCard').forEach(card=>{
  const meta=card.querySelector('.dbestGoogleTrackMeta'),badge=card.querySelector('.dbestGoogleTrackState'),line=card.querySelector('.dbestApproachLine');
  const text=String(meta?.textContent||'');
  if(/\bCancelled\b/i.test(text)){
   if(badge)badge.textContent='CANCELLED';
   if(line){line.textContent='This ride has been cancelled';line.style.background='#fff1f2';line.style.color='#be123c'}
  }else if(/\bCompleted\b/i.test(text)){
   if(badge)badge.textContent='COMPLETED';
   if(line){line.textContent='Ride completed';line.style.background='#ecfdf5';line.style.color='#047857'}
  }
 });
}
const mo=new MutationObserver(()=>queueMicrotask(normalize));
try{mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true})}catch(_){ }
setInterval(normalize,1200);normalize();
window.DBEST_CUSTOMER_TERMINAL_STATUS_FIX={version:V,normalize};
})();