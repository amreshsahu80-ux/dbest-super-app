(function(){
'use strict';
function isOwner(){try{return typeof session!=='undefined'&&session&&session.role==='owner'}catch(_){return false}}
function openDistributorManagement(){location.href='/SuperAdmin?manage=1'}
function inject(){
  if(!isOwner())return;
  const roots=[...document.querySelectorAll('.sectionContent.ownerMasterPage,.sectionContent.owner55')];
  for(const root of roots){
    if(root.querySelector('#dbestOwnerDistributorManagementEntry'))continue;
    const grid=root.querySelector('.ownerControlGrid,.owner55Grid');
    if(!grid)continue;
    const b=document.createElement('button');
    b.id='dbestOwnerDistributorManagementEntry';
    b.className=grid.classList.contains('owner55Grid')?'owner55Action':'ownerControl';
    b.type='button';
    b.innerHTML='<span>🗺️</span><b>Distributor Management</b><small>Manage Zone, State and District Distributors, permissions, onboarding, agreements, activation and territory hierarchy.</small>';
    b.onclick=openDistributorManagement;
    grid.appendChild(b);
    break;
  }
}
const rawOwner=window.owner;
if(typeof rawOwner==='function'&&!rawOwner.__dbestDistributorEntry){
  const w=function(){const out=rawOwner.apply(this,arguments);setTimeout(inject,40);return out};
  w.__dbestDistributorEntry=true;window.owner=w;
}
const rawOps=window.ownerOperations;
if(typeof rawOps==='function'&&!rawOps.__dbestDistributorEntry){
  const w=function(){const out=rawOps.apply(this,arguments);setTimeout(inject,40);return out};
  w.__dbestDistributorEntry=true;window.ownerOperations=w;
}
new MutationObserver(()=>setTimeout(inject,25)).observe(document.documentElement,{childList:true,subtree:true});
[100,400,1000,2000].forEach(ms=>setTimeout(inject,ms));
window.DBEST_OWNER_DISTRIBUTOR_MANAGEMENT={open:openDistributorManagement};
})();