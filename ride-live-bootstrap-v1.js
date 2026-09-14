(function(){
'use strict';
if(window.DBEST_RIDE_LIVE_BOOTSTRAP)return;
let bootedTx='';
function hideLegacy(){try{document.querySelectorAll('.ridePage .driverCard,.ridePage .vaahakStatusList,.ridePage .dispatchPending').forEach(x=>x.style.setProperty('display','none','important'));document.querySelectorAll('.ridePage button').forEach(b=>{const oc=String(b.getAttribute('onclick')||''),txt=String(b.textContent||'');if(/advanceRide\s*\(/.test(oc)||/Demo\s*:\s*Advance Trip Status/i.test(txt))b.style.setProperty('display','none','important')})}catch(_){}}
function inferTx(){try{const page=document.querySelector('.ridePage');if(!page)return'';const txt=(page.textContent||'')+' '+(document.querySelector('.ridePage')?.previousElementSibling?.textContent||'');const m=txt.match(/TX\d{8,}/i);return m?m[0].toUpperCase():''}catch(_){return''}}
function boot(){hideLegacy();const page=document.querySelector('.ridePage');if(!page)return;const tx=inferTx();if(!tx||tx===bootedTx)return;const fn=window.rideStatusScreen;if(typeof fn!=='function')return;bootedTx=tx;try{fn(tx)}catch(_){bootedTx=''}}
const mo=new MutationObserver(()=>{hideLegacy();setTimeout(boot,0)});mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
window.DBEST_RIDE_LIVE_BOOTSTRAP={version:'1.0.0',boot,hideLegacy};
})();