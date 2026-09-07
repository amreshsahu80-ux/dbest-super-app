(function(){
'use strict';
const V='20260907-cab-entry-lazy-v2';
if(window.DBEST_CAB_ENTRY_CAPTURE?.version===V)return;
const ASSET_V='20260907-cab-fast-v1';
let opening=false,ensurePromise=null;

function preload(src){
  try{
    if(document.querySelector('link[data-dbest-cab-preload="'+src+'"]'))return;
    const l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;l.setAttribute('data-dbest-cab-preload',src);document.head.appendChild(l)
  }catch(_){ }
}
function warm(){
  preload('/cab-selected-ui-v3.js?v='+ASSET_V);
  preload('/cab-planned-ui-v2.js?v='+ASSET_V);
}
function load(src,attr){return new Promise((resolve,reject)=>{
  let s=document.querySelector('script['+attr+']');
  if(s){if(s.dataset.loaded==='1')return resolve();s.addEventListener('load',resolve,{once:true});s.addEventListener('error',reject,{once:true});return}
  s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;(document.body||document.documentElement).appendChild(s)
})}
async function ensureApproved(){
  const ready=window.DBEST_CAB_SELECTED_UI;
  if(ready&&typeof ready.open==='function')return ready;
  if(!ensurePromise)ensurePromise=(async()=>{
    await load('/cab-selected-ui-v3.js?v='+ASSET_V,'data-dbest-cab-selected-ui-v3');
    const base=window.DBEST_CAB_SELECTED_UI;
    if(!base||typeof base.open!=='function')throw new Error('Selected Cab UI unavailable');
    try{await load('/cab-planned-ui-v2.js?v='+ASSET_V,'data-dbest-cab-planned-ui-v2')}catch(e){console.warn('DBest Cab enhancement load warning',e)}
    return window.DBEST_CAB_SELECTED_UI||base
  })().finally(()=>{ensurePromise=null});
  return ensurePromise
}
function optimizeImages(){
  try{document.querySelectorAll('#dbestSelectedCabModal img,#dbestCabSelectedModal img,.dbestCabSelected img,.cabSelected img').forEach(img=>{img.loading='lazy';img.decoding='async'})}catch(_){ }
}
async function openApproved(){
  if(opening)return;opening=true;
  try{
    const u=await ensureApproved();
    if(u&&typeof u.open==='function'){
      window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V16_FINAL';
      u.open();requestAnimationFrame(optimizeImages);return
    }
    throw new Error('Cab UI unavailable')
  }catch(e){
    console.error('DBest Cab entry',e);
    try{typeof toast==='function'?toast('Cab booking could not open. Please retry.'):alert('Cab booking could not open. Please retry.')}catch(_){ }
  }finally{setTimeout(()=>{opening=false},120)}
}
function isCabEntry(el){
  if(!el)return false;const b=el.closest?.('button,a,[role="button"]');if(!b)return false;
  if(b.matches?.('.service-car'))return true;
  const oc=String(b.getAttribute?.('onclick')||'').replace(/\s+/g,'');
  return oc.includes("openService('car')")||oc.includes('openService("car")')||oc.includes('openRidePlatform()')
}
document.addEventListener('click',e=>{
  if(!isCabEntry(e.target))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openApproved()
},true);

if(document.readyState==='complete')setTimeout(warm,300);else window.addEventListener('load',()=>{if('requestIdleCallback'in window)requestIdleCallback(warm,{timeout:1400});else setTimeout(warm,500)},{once:true});
window.DBEST_CAB_ENTRY_CAPTURE={version:V,open:openApproved,ensure:ensureApproved,warm};
})();