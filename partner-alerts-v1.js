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
installMarketplaceCompleteButton();
load('/vaahak-dashboard-tabs-v1.js?v=20260916-tabs-v2','data-dbest-vaahak-dashboard-tabs').catch(e=>console.warn('DBest Vaahak tabs loader',e));
load('/partner-alerts-core-v1.js?v=20260914-vaahak-actions-v1','data-dbest-partner-alerts-core').then(()=>{if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;return load('/vaahak-compact-actions-v1.js?v=20260914-vaahak-activity-v1','data-dbest-vaahak-compact-actions').then(()=>load('/vaahak-strict-dispatch-v1.js?v=20260914-strict-dispatch-v1','data-dbest-vaahak-strict-dispatch')).then(()=>load('/vaahak-active-job-fix-v1.js?v=20260914-active-job-v1','data-dbest-vaahak-active-job-fix')).then(()=>load('/vaahak-completion-recovery-v1.js?v=20260914-completion-recovery-v1','data-dbest-vaahak-completion-recovery')).then(()=>load('/vaahak-complete-job-fix-v1.js?v=20260914-complete-fix-v2','data-dbest-vaahak-complete-fix'))}).catch(e=>console.warn('DBest partner alerts loader',e));
})();