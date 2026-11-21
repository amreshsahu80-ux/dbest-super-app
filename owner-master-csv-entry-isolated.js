(function(){
'use strict';
// Isolated branch only. Owner token remains in same-tab sessionStorage.
function isOwner(){try{return typeof session!=='undefined'&&session?.role==='owner'}catch{return false}}
function install(){
 if(!isOwner())return;
 const root=document.querySelector('.sectionContent.owner55');
 if(!root)return;
 if(document.getElementById('dbestOwnerMasterCsvGroup'))return;
 const host=root.querySelector('.owner55Groups')||root;
 const group=document.createElement('div');
 group.id='dbestOwnerMasterCsvGroup';group.className='owner55Group';
 group.innerHTML='<div class="owner55GroupHead"><div><b>Master Product Catalogue</b><small>CSV upload and draft review — isolated test, not customer publication.</small></div></div><div class="owner55Grid"><button type="button" class="owner55Action" id="dbestOwnerCsvLaunch"><span>📄</span><b>Upload Master Product CSV</b><small>MRP, descriptions, dimensions and images. Save only as drafts.</small></button></div>';
 host.prepend(group);
 group.querySelector('#dbestOwnerCsvLaunch').onclick=()=>{
  const token=window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||'';
  if(!token){window.toast?.('Owner secure session missing. Please sign in with OTP.');return}
  // Navigate this tab, never window.open: sessionStorage is scoped to tab + origin.
  window.location.assign('/review-only/owner-master-csv-review.html');
 };
}
function installFloating(){
 if(!isOwner()||document.getElementById('dbestCsvOwnerFloating'))return;
 const b=document.createElement('button');b.id='dbestCsvOwnerFloating';b.type='button';
 b.textContent='📄 Master CSV Upload';b.setAttribute('aria-label','Upload master product CSV');
 b.style.cssText='position:fixed;right:12px;bottom:86px;z-index:2147483000;background:#124fa3;color:#fff;border:0;border-radius:12px;padding:13px 16px;font:700 14px system-ui;box-shadow:0 4px 18px #0004;max-width:65vw';
 b.onclick=()=>{if(!window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()){window.toast?.('Secure Owner OTP session missing. Please sign in again.');return}location.assign('/review-only/owner-master-csv-review.html')};
 document.body.append(b);
 const qa=document.createElement('button');qa.id='dbestVendorOfferQaFloating';qa.type='button';qa.textContent='🛍️ Vendor Pricing QA';qa.style.cssText=b.style.cssText+';bottom:145px;background:#374151';qa.onclick=()=>{if(!window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()){window.toast?.('Owner session required');return}location.assign('/review-only/vendor-offer-pricing-qa.html')};document.body.append(qa);
}
[250,700,1500,3000].forEach(ms=>setTimeout(()=>{install();installFloating()},ms));
let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{install();installFloating()},100)}).observe(document.body,{childList:true,subtree:true});
})();
