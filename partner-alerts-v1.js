(function(){
'use strict';
function load(src,attr){return new Promise((resolve,reject)=>{const old=document.querySelector('script['+attr+']');if(old)return resolve();const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');s.onload=resolve;s.onerror=reject;(document.head||document.documentElement).appendChild(s)})}
function installMarketplaceCompleteButton(){
  const enforce=()=>{
    const host=document.getElementById('jobs');
    if(!host)return;
    const box=host.querySelector('.paymentBox');
    if(!box)return;
    const text=String(box.textContent||'');
    const verified=/Marketplace Payment/i.test(text)&&/RAZORPAY VERIFIED|PREPAID/i.test(text);
    const old=box.querySelector('[data-dbest-direct-complete]');
    if(!verified){if(old)old.remove();return}
    if(old)return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn wide';
    btn.setAttribute('data-dbest-direct-complete','1');
    btn.style.marginTop='12px';
    btn.textContent='✅ Complete Delivery';
    btn.onclick=async()=>{
      try{
        const j=typeof currentJob!=='undefined'?currentJob:null;
        if(!j||!j.id){if(typeof note==='function')note('Active Marketplace delivery could not be resolved. Refresh once and retry.',false);return}
        if(typeof completeJob!=='function'){if(typeof note==='function')note('Delivery completion action is not available. Refresh once and retry.',false);return}
        btn.disabled=true;btn.textContent='Checking customer confirmation…';
        await completeJob(j.id);
      }finally{
        setTimeout(()=>{if(document.body.contains(btn)){btn.disabled=false;btn.textContent='✅ Complete Delivery'}},1200);
      }
    };
    box.appendChild(btn);
  };
  enforce();
  new MutationObserver(enforce).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  setInterval(enforce,500);
}
if(!/\/vaahak(?:-standalone-v2\.html|\.html)?\/?$/i.test(location.pathname)&&!/\/Vaahak\/?$/i.test(location.pathname))installMarketplaceCompleteButton();
const IS_VAAHAK_ROUTE=/\/vaahak(?:-standalone-v2\.html|\.html)?\/?$/i.test(location.pathname)||/\/Vaahak\/?$/i.test(location.pathname);
if(IS_VAAHAK_ROUTE){
 load('/vaahak-dashboard-tabs-v1.js?v=20260929-simplified-tabs-v3','data-dbest-vaahak-dashboard-tabs')
  .then(()=>load('/vaahak-wallet-razorpay-ui-v1.js?v=20260929-simplified-wallet-v2','data-dbest-vaahak-wallet-razorpay'))
  .catch(e=>console.warn('DBest Vaahak dashboard/wallet loader',e));
}
if(!IS_VAAHAK_ROUTE)load('/partner-alerts-core-v1.js?v=20260914-vaahak-actions-v1','data-dbest-partner-alerts-core').catch(e=>console.warn('DBest partner alerts loader',e));
})();