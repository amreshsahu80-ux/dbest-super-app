(function(){
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(e){alert(msg)}}
  function isOwner(){try{return typeof session!=='undefined'&&session&&session.role==='owner'}catch(e){return false}}
  function ownerOk(){return isOwner()&&!!window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  window.ownerResetLiveVaahakPin=async function(id){
    if(!ownerOk())return notify('Owner security session expired. Please log in again.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    if(!confirm('Reset PIN for '+id+'? Existing Vaahak sessions will be signed out.'))return;
    try{await window.DBEST_VAAHAK_LIVE.call('owner_reset_pin',{partnerId:id,newPin:pin},{owner:true});notify('Vaahak PIN reset successfully. Existing sessions have been signed out.');}
    catch(e){notify('Vaahak PIN reset failed: '+(e.message||'Unknown error'))}
  };

  window.ownerResetLegacyVaahakPin=function(id){
    if(!isOwner())return notify('Owner login required.');
    const v=typeof vaahakPartners!=='undefined'&&Array.isArray(vaahakPartners)?vaahakPartners.find(x=>String(x.id).toUpperCase()===String(id).toUpperCase()):null;
    if(!v)return notify('Legacy Vaahak record not found.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    v.pin=pin;try{typeof save==='function'&&save()}catch(e){};notify('Vaahak PIN reset successfully on this legacy record.');
  };

  window.ownerResetVendorPin=function(id){
    if(!isOwner())return notify('Owner login required.');
    const v=typeof marketVendor==='function'?marketVendor(id):null;if(!v)return notify('Vendor not found.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    v.pin=pin;try{typeof save==='function'&&save()}catch(e){};notify('Vendor PIN reset successfully.');
  };

  async function addVaahakButtons(){
    if(!isOwner()||!/Vaahak Partner Control/i.test(document.body.innerText||''))return;
    const cards=[...document.querySelectorAll('.sectionContent div')];
    let liveIds=[];try{if(ownerOk()&&window.DBEST_VAAHAK_LIVE?.call){const d=await window.DBEST_VAAHAK_LIVE.call('owner_list',{}, {owner:true});liveIds=(d.partners||[]).map(v=>String(v.id).toUpperCase())}}catch(e){}
    cards.forEach(card=>{
      if(card.querySelector('.dbestPinResetBtn'))return;
      const txt=card.innerText||'';const m=txt.match(/VHK\d+/i);if(!m)return;
      if(!/Approve KYC|View Agreement|Ride Payout|Owner Sign/i.test(txt))return;
      const id=m[0].toUpperCase();
      const anchor=[...card.querySelectorAll('button')].find(b=>/View Agreement|Approve KYC|Reject/i.test(b.textContent||''));if(!anchor)return;
      const btn=document.createElement('button');btn.type='button';btn.className='mini dbestPinResetBtn';btn.textContent='🔐 Reset PIN';btn.style.cssText='margin:10px 6px 0 0;padding:9px 12px;font-weight:900';
      btn.onclick=()=>liveIds.includes(id)?window.ownerResetLiveVaahakPin(id):window.ownerResetLegacyVaahakPin(id);
      anchor.parentElement.appendChild(btn);
    });
  }

  function addVendorControls(){
    if(!isOwner()||!/Vendor|Marketplace/i.test(document.body.innerText||''))return;
    if(typeof commerceConfig==='undefined'||!Array.isArray(commerceConfig.vendors))return;
    const host=document.querySelector('.sectionContent.ownerMasterPage')||document.querySelector('.sectionContent');if(!host||document.getElementById('dbestVendorPinPanel'))return;
    const box=document.createElement('div');box.id='dbestVendorPinPanel';box.className='ownerPanelCard';box.style.cssText='margin:14px 0;border:2px solid #b9d0ff;background:#f8fbff;padding:14px;border-radius:16px';
    box.innerHTML='<h3 style="margin-top:0">🔐 Vendor PIN Controls</h3><div class="notice">Owner can reset any Vendor PIN. Vendors can also change their own PIN from their dashboard.</div>'+(commerceConfig.vendors.map(v=>'<div style="border:1px solid #d9e5f7;border-radius:12px;padding:10px;margin:8px 0;background:#fff"><b>'+esc(v.name)+' • '+esc(v.id)+'</b><div style="margin-top:7px"><button class="mini" type="button" onclick="ownerResetVendorPin(\''+String(v.id).replace(/'/g,"\\'")+'\')">🔐 Reset PIN</button></div></div>').join('')||'<div class="notice">No vendors onboarded yet.</div>');
    host.prepend(box);
  }

  async function refresh(){try{await addVaahakButtons();addVendorControls()}catch(e){}}
  const obs=new MutationObserver(()=>{clearTimeout(window.__dbestPinTimer);window.__dbestPinTimer=setTimeout(refresh,100)});
  try{obs.observe(document.documentElement,{subtree:true,childList:true})}catch(e){}
  setInterval(refresh,1200);setTimeout(refresh,300);
  window.DBEST_PARTNER_PIN_RESET={version:'2.0.0',refresh};
})();