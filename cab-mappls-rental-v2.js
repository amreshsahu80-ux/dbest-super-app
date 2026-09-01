(function(){
'use strict';
if(window.DBEST_CAB_LIVE_SHIM&&window.DBEST_CAB_LIVE_SHIM.version==='20260901-live-v1')return;
const V='20260901-live-v1';
let readyPromise=null;
function load(src,id){return new Promise((resolve,reject)=>{const old=document.getElementById(id);if(old){if(old.dataset.loaded==='1')return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src+'?v='+V;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.body.appendChild(s)})}
function ensure(){if(readyPromise)return readyPromise;readyPromise=(async()=>{await load('/cab-google-resilient-v1.js','dbest-cab-google-live');await load('/cab-google-premium-ui-v2.js','dbest-cab-premium-live');await load('/cab-google-compact-ui-v3.js','dbest-cab-compact-live');if(!window.DBEST_CAB_GOOGLE||typeof window.DBEST_CAB_GOOGLE.open!=='function')throw new Error('Cab live module unavailable');return window.DBEST_CAB_GOOGLE})().catch(err=>{readyPromise=null;throw err});return readyPromise}
function open(){ensure().then(c=>{window.openRidePlatform=open;c.open()}).catch(err=>{console.error('DBest Cab live load failed',err);try{typeof toast==='function'?toast('Cab is temporarily unavailable. Please retry.'):alert('Cab is temporarily unavailable. Please retry.')}catch(e){}})}
function vehicles(){ensure().then(c=>c.vehicles&&c.vehicles())}
window.DBEST_CAB_LIVE_SHIM={version:V,ensure,open};
window.DBEST_CAB_MAPPLS_RENTAL={version:'GOOGLE_RESILIENT_PREMIUM_V1',open,vehicles};
window.DBEST_ACTIVE_CAB_VERSION='GOOGLE_RESILIENT_PREMIUM_V1';
window.openRidePlatform=open;
ensure().catch(err=>console.warn('DBest Cab live preload warning',err));
})();