(function(){
'use strict';
// Isolated branch only. Owner token remains in same-tab sessionStorage.
function isOwner(){try{return typeof session!=='undefined'&&session?.role==='owner'}catch{return false}}
function install(){
 if(!isOwner())return;
 const root=document.querySelector('.sectionContent.owner55');
 if(!root||document.getElementById('dbestOwnerMasterCsvGroup'))return;
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
[250,700,1500,3000].forEach(ms=>setTimeout(install,ms));
let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(install,100)}).observe(document.body,{childList:true,subtree:true});
})();
