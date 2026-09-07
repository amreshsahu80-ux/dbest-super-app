(function(){
'use strict';
const V='20260907-cab-entry-fastpath-v2';
if(window.DBEST_CAB_ENTRY_CAPTURE?.version===V)return;
let opening=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function finalAuthority(timeout=700){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    const a=window.DBEST_FINAL_UI_AUTHORITY;
    if(a&&typeof a.openCab==='function')return a;
    await sleep(45);
  }
  return null;
}
async function openApproved(){
  if(opening)return;
  opening=true;
  try{
    const a=await finalAuthority();
    if(a){await a.openCab();return}
    const u=window.DBEST_CAB_SELECTED_UI;
    if(u&&typeof u.open==='function'){u.open();return}
    if(typeof window.openRidePlatform==='function'){await window.openRidePlatform();return}
    try{typeof toast==='function'?toast('Cab booking could not start. Please retry.'):alert('Cab booking could not start. Please retry.')}catch(_){}
  }catch(e){
    console.warn('DBest Cab entry',e);
    try{typeof toast==='function'?toast('Cab booking could not start. Please retry.'):alert('Cab booking could not start. Please retry.')}catch(_){}
  }finally{
    setTimeout(()=>{opening=false},180);
  }
}
function isCabEntry(el){
  if(!el)return false;
  const b=el.closest?.('button,a,[role="button"]');
  if(!b)return false;
  if(b.matches?.('.service-car'))return true;
  const oc=String(b.getAttribute?.('onclick')||'').replace(/\s+/g,'');
  return oc.includes("openService('car')")||oc.includes('openService("car")')||oc==='openRidePlatform()'||oc==='returnopenRidePlatform()';
}
document.addEventListener('click',e=>{
  if(!isCabEntry(e.target))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  openApproved();
},true);
window.DBEST_CAB_ENTRY_CAPTURE={version:V,open:openApproved};
})();