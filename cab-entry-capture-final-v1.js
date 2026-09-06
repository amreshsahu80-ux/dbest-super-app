(function(){
'use strict';
const V='20260906-cab-entry-capture-v1';
if(window.DBEST_CAB_ENTRY_CAPTURE?.version===V)return;
let opening=false;
function waitForApproved(timeout=2200){return new Promise(resolve=>{const end=Date.now()+timeout;const tick=()=>{const u=window.DBEST_CAB_SELECTED_UI;if(u&&typeof u.open==='function')return resolve(u);if(Date.now()>=end)return resolve(null);setTimeout(tick,60)};tick()})}
async function openApproved(){if(opening)return;opening=true;try{let u=window.DBEST_CAB_SELECTED_UI;if(!u||typeof u.open!=='function')u=await waitForApproved();if(u&&typeof u.open==='function'){u.open();return}try{typeof toast==='function'?toast('Cab booking is loading. Please tap Cab again.'):alert('Cab booking is loading. Please tap Cab again.')}catch(_){}}finally{setTimeout(()=>{opening=false},120)}}
function isCabEntry(el){if(!el)return false;const b=el.closest?.('button,a,[role="button"]');if(!b)return false;if(b.matches?.('.service-car'))return true;const oc=String(b.getAttribute?.('onclick')||'').replace(/\s+/g,'');if(oc.includes("openService('car')")||oc.includes('openService("car")')||oc.includes('openRidePlatform()'))return true;return false}
document.addEventListener('click',e=>{if(!isCabEntry(e.target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openApproved()},true);
document.addEventListener('pointerup',e=>{if(!isCabEntry(e.target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openApproved()},true);
window.DBEST_CAB_ENTRY_CAPTURE={version:V,open:openApproved};
})();