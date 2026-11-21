(function(){
'use strict';
// Isolated Owner Console module; intentionally not loaded by the live application.
// Requires a compatible owner-session authentication bridge before deployment.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function token(){return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||'';}
function owner(){try{return window.session?.role==='owner'||session?.role==='owner'}catch{return false}}
async function enforce(vendorId,action,reason){
 if(!owner()||!token())throw Error('Owner authentication required');
 const r=await fetch('/api/marketplace/owner-vendor-enforcement',{method:'POST',cache:'no-store',
 headers:{'Content-Type':'application/json','x-dbest-owner-token':token()},
 body:JSON.stringify({vendorId,action,reason})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.ok)throw Error(d.error||'Enforcement failed');
 return d;
}
function render(root,vendors){
 if(!owner()||!token())throw Error('Owner authentication required');
 if(!root||!Array.isArray(vendors))throw Error('Invalid vendor list');
 root.replaceChildren();
 const heading=document.createElement('h3');heading.textContent='Vendor Compliance Controls';root.append(heading);
 const note=document.createElement('p');note.textContent='Suspension blocks a vendor. Termination deactivates the vendor. Historical orders are retained.';root.append(note);
 vendors.forEach(v=>{
  const box=document.createElement('section');box.className='ownerPanelCard';box.style.margin='10px 0';
  const title=document.createElement('strong');title.textContent=String(v.name||v.id||'Vendor');
  const state=document.createElement('p');state.textContent='Status: '+(!v.active?'Inactive':v.operational_hold?'Suspended':'Active');
  const reason=document.createElement('textarea');reason.placeholder='Reason (minimum 10 characters for suspension/termination)';reason.setAttribute('aria-label','Compliance reason for '+String(v.name||v.id));
  box.append(title,state,reason);
  for(const action of ['suspend','reinstate','terminate']){
   const btn=document.createElement('button');btn.type='button';btn.textContent=action[0].toUpperCase()+action.slice(1);
   btn.disabled=action==='reinstate'?(!v.active||v.owner_approval!=='Approved'||!v.operational_hold):(!v.active||v.operational_hold);
   btn.addEventListener('click',async()=>{
    const why=reason.value.trim();
    if(action!=='reinstate'&&why.length<10){window.alert('Enter a reason of at least 10 characters');return;}
    if(!window.confirm('Confirm '+action+' for '+String(v.name||v.id)+'?'))return;
    btn.disabled=true;
    try{await enforce(String(v.id),action,why);await open();}
    catch(e){window.alert(e.message);}
    finally{btn.disabled=false;}
   });
   box.append(btn);
  }
  root.append(box);
 });
}
async function open(){
 if(!owner()||!token())throw Error('Owner authentication required');
 if(typeof window.sectionScreen!=='function')throw Error('Owner screen unavailable');
 const top=typeof window.sectionTopBar==='function'?window.sectionTopBar('Vendor Compliance','Suspend, reinstate or terminate vendors','owner()'):'<h2>Vendor Compliance</h2>';
 window.sectionScreen(top+'<div class="sectionContent ownerMasterPage"><div id="dbestVendorEnforcementPanel" class="ownerPanelCard">Loading vendors…</div></div>');
 const root=document.getElementById('dbestVendorEnforcementPanel');
 const response=await fetch('/api/marketplace/owner-vendor-list',{headers:{'x-dbest-owner-token':token()},cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok){root.textContent='Unable to load vendors: '+(data.error||response.status);return;}
 render(root,data.vendors);
}
function install(){
 if(!owner()||!token())return;
 const root=document.querySelector('.sectionContent.owner55');
 if(!root||document.getElementById('dbestVendorEnforcementEntry'))return;
 const host=root.querySelector('.owner55Groups')||root;
 const group=document.createElement('div');group.className='owner55Group';group.id='dbestVendorEnforcementEntry';
 const head=document.createElement('div');head.className='owner55GroupHead';head.textContent='Vendor Compliance';
 const grid=document.createElement('div');grid.className='owner55Grid';
 const button=document.createElement('button');button.type='button';button.className='owner55Action';button.textContent='Vendor Suspension & Termination';button.onclick=()=>open().catch(e=>window.alert(e.message));
 grid.append(button);group.append(head,grid);host.prepend(group);
}
[300,1000,2500].forEach(ms=>setTimeout(install,ms));
new MutationObserver(()=>{clearTimeout(window.__dbestVendorComplianceInstall);window.__dbestVendorComplianceInstall=setTimeout(install,120)}).observe(document.body,{childList:true,subtree:true});
window.DBEST_MARKETPLACE_VENDOR_ENFORCEMENT={render,open,install};
})();
