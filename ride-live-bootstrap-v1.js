(function(){
'use strict';
if(window.DBEST_RIDE_LIVE_BOOTSTRAP)return;
let bootedTx='';
function hideLegacy(){try{document.querySelectorAll('.ridePage .driverCard,.ridePage .vaahakStatusList,.ridePage .dispatchPending').forEach(x=>x.style.setProperty('display','none','important'));document.querySelectorAll('.ridePage button').forEach(b=>{const oc=String(b.getAttribute('onclick')||''),txt=String(b.textContent||'');if(/advanceRide\s*\(/.test(oc)||/Demo\s*:\s*Advance Trip Status/i.test(txt))b.style.setProperty('display','none','important')})}catch(_){}}
function inferTx(){try{const page=document.querySelector('.ridePage');if(!page)return'';const txt=(page.textContent||'')+' '+(document.querySelector('.ridePage')?.previousElementSibling?.textContent||'');const m=txt.match(/TX\d{8,}/i);return m?m[0].toUpperCase():''}catch(_){return''}}
function loadGoogleTracking(){try{if(!document.querySelector('.ridePage'))return false;if(!String(window.DBEST_RUNTIME_CONFIG?.googleMapsApiKey||'').trim())return false;if(document.querySelector('script[data-dbest-customer-google-map-runtime]'))return true;const s=document.createElement('script');s.src='/customer-google-live-tracking-v1.js?v=20260915-customer-map-runtime-v1';s.async=true;s.setAttribute('data-dbest-customer-google-map-runtime','1');(document.head||document.documentElement).appendChild(s);return true}catch(_){return false}}
function boot(){hideLegacy();const page=document.querySelector('.ridePage');if(!page)return;loadGoogleTracking();const tx=inferTx();if(!tx||tx===bootedTx)return;const fn=window.rideStatusScreen;if(typeof fn!=='function')return;bootedTx=tx;try{fn(tx)}catch(_){bootedTx=''}}
const mo=new MutationObserver(()=>{hideLegacy();setTimeout(boot,0)});mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,700,1500,3000,6000,10000].forEach(ms=>setTimeout(()=>{boot();loadGoogleTracking()},ms));
try{const r=window.DBEST_RUNTIME_READY;if(r&&typeof r.finally==='function')r.finally(()=>{loadGoogleTracking();setTimeout(loadGoogleTracking,250)})}catch(_){}
window.DBEST_RIDE_LIVE_BOOTSTRAP={version:'1.1.0',boot,hideLegacy,loadGoogleTracking};
})();