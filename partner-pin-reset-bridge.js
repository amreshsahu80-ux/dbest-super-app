(function(){
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(e){alert(msg)}}
  function escp(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
  function ownerOk(){return !!(window.session&&window.session.role==='owner'&&window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.())}

  window.ownerResetLiveVaahakPin=async function(id){
    if(!ownerOk())return notify('Owner security session expired. Please log in again.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    if(!confirm('Reset PIN for '+id+'? Existing Vaahak sessions will be signed out.'))return;
    try{
      await window.DBEST_VAAHAK_LIVE.call('owner_reset_pin',{partnerId:id,newPin:pin},{owner:true});
      notify('Vaahak PIN reset successfully. Existing sessions have been signed out.');
      await renderLivePinPanel();
    }catch(e){notify('Vaahak PIN reset failed: '+(e.message||'Unknown error'))}
  };

  window.ownerResetLegacyVaahakPin=function(id){
    if(!window.session||window.session.role!=='owner')return notify('Owner login required.');
    const v=typeof vaahakPartners!=='undefined'&&Array.isArray(vaahakPartners)?vaahakPartners.find(x=>String(x.id).toUpperCase()===String(id).toUpperCase()):null;
    if(!v)return notify('Legacy Vaahak record not found.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    if(!confirm('Reset local PIN for '+(v.name||id)+'?'))return;
    v.pin=pin;try{typeof save==='function'&&save()}catch(e){}
    notify('Local Vaahak PIN reset. This legacy record remains device-only; use a Live Vaahak ID for cross-device login.');
    if(typeof ownerVaahakControl==='function')ownerVaahakControl();
  };

  window.ownerResetVendorPin=function(id){
    if(!window.session||window.session.role!=='owner')return notify('Owner login required.');
    const v=typeof marketVendor==='function'?marketVendor(id):null;if(!v)return notify('Vendor not found.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    if(!confirm('Reset login PIN for '+(v.name||id)+'?'))return;
    v.pin=pin;try{typeof save==='function'&&save()}catch(e){}
    notify('Vendor PIN reset successfully.');
    if(typeof ownerMarketplaceControl==='function')ownerMarketplaceControl();
  };

  function addVendorResetPanel(){
    if(!window.session||window.session.role!=='owner')return;
    const host=document.querySelector('.sectionContent.ownerMasterPage')||document.querySelector('.sectionContent');if(!host||document.getElementById('dbestVendorPinReset'))return;
    if(typeof commerceConfig==='undefined'||!Array.isArray(commerceConfig.vendors))return;
    const box=document.createElement('div');box.id='dbestVendorPinReset';box.className='ownerPanelCard';box.style.marginTop='14px';
    box.innerHTML='<h3>🔐 Vendor Login PIN</h3><div class="notice">Owner can reset a Vendor PIN. Member/User login is not included because members use email-based authentication.</div><div class="ownerQueue" style="margin-top:10px">'+(commerceConfig.vendors.map(v=>'<div class="ownerQueueRow"><h4>'+escp(v.name)+' • '+escp(v.id)+'</h4><small>'+escp(v.mobile||'')+' • '+escp(v.city||'')+'</small><div class="ownerQueueActions"><button class="mini" onclick="ownerResetVendorPin(\''+String(v.id).replace(/'/g,"\\'")+'\')">Reset PIN</button></div></div>').join('')||'<div class="notice">No vendors onboarded yet.</div>')+'</div>';
    const h=[...host.querySelectorAll('h3')].find(x=>/Onboarded Vendors/i.test(x.textContent||''));if(h)h.before(box);else host.prepend(box);
  }

  async function renderLivePinPanel(){
    if(!ownerOk()||!window.DBEST_VAAHAK_LIVE?.call)return;
    const host=document.querySelector('.sectionContent.ownerMasterPage')||document.querySelector('.sectionContent');if(!host)return;
    let box=document.getElementById('dbestVaahakPinResetTop');
    if(!box){box=document.createElement('div');box.id='dbestVaahakPinResetTop';box.className='ownerPanelCard';box.style.cssText='margin:0 0 16px;border:2px solid #b9d0ff;background:#f8fbff';host.prepend(box)}
    box.innerHTML='<h3>🔐 Live Vaahak Login & PIN</h3><div class="notice">Loading live Supabase Vaahak partners…</div>';
    try{
      const d=await window.DBEST_VAAHAK_LIVE.call('owner_list',{}, {owner:true});
      const partners=d.partners||[];
      box.innerHTML='<h3>🔐 Live Vaahak Login & PIN</h3><div class="notice">Use the <b>live Supabase Vaahak ID</b> shown here for cross-device login. Older locally stored VHK records below are legacy records.</div><div class="ownerQueue" style="margin-top:10px">'+(partners.map(v=>'<div class="ownerQueueRow" style="border:1px solid #d9e5f7;border-radius:14px;padding:12px;margin:8px 0;background:#fff"><h4 style="margin:0 0 6px">'+escp(v.name)+' • '+escp(v.id)+'</h4><small>'+escp(v.mobile||'')+' • '+escp(v.vehicle||'')+' '+escp(v.vehicle_no||'')+' • '+escp(v.owner_approval||'')+'</small><div class="ownerQueueActions" style="margin-top:8px"><button class="mini" type="button" onclick="ownerResetLiveVaahakPin(\''+String(v.id).replace(/'/g,"\\'")+'\')">🔐 Reset PIN</button></div></div>').join('')||'<div class="notice">No live Vaahak registrations found.</div>')+'</div>';
    }catch(e){box.innerHTML='<h3>🔐 Live Vaahak Login & PIN</h3><div class="notice">Unable to load live Vaahak list. Please re-login as Owner and reopen Vaahak Dispatch.</div>'}
  }

  function addVisibleCardResetButtons(){
    if(!window.session||window.session.role!=='owner')return;
    const roots=[...document.querySelectorAll('.sectionContent div')];
    roots.forEach(card=>{
      if(card.dataset?.dbestPinDone)return;
      const txt=(card.innerText||'').trim();
      const m=txt.match(/VHK\d+/i);if(!m)return;
      if(!/Registration|KYC|Ride Payout|Owner Sign/i.test(txt))return;
      if(card.children.length>30)return;
      const id=m[0].toUpperCase();
      const btn=document.createElement('button');btn.type='button';btn.className='mini dbestInlineResetPin';btn.style.cssText='margin:10px 6px 0 0;padding:9px 12px;font-weight:900';btn.textContent='🔐 Reset PIN';
      btn.onclick=async()=>{
        try{const d=await window.DBEST_VAAHAK_LIVE.call('owner_list',{}, {owner:true});const isLive=(d.partners||[]).some(v=>String(v.id).toUpperCase()===id);return isLive?window.ownerResetLiveVaahakPin(id):window.ownerResetLegacyVaahakPin(id)}catch(e){return window.ownerResetLegacyVaahakPin(id)}
      };
      const anchor=[...card.querySelectorAll('button')].find(b=>/View Agreement|Approve KYC|Reject/i.test(b.textContent||''));
      if(anchor)anchor.parentElement.appendChild(btn);else card.appendChild(btn);
      card.dataset.dbestPinDone='1';
    });
  }

  const oldMarket=window.ownerMarketplaceControl;
  if(typeof oldMarket==='function')window.ownerMarketplaceControl=function(){oldMarket();setTimeout(addVendorResetPanel,120)};
  const oldVaahak=window.ownerVaahakControl;
  if(typeof oldVaahak==='function')window.ownerVaahakControl=function(){oldVaahak();setTimeout(()=>{renderLivePinPanel();addVisibleCardResetButtons()},150);setTimeout(addVisibleCardResetButtons,700)};
  const obs=new MutationObserver(()=>{if(window.session?.role==='owner'&&/Vaahak Partner Control/i.test(document.body.innerText||'')){addVisibleCardResetButtons();}});
  try{obs.observe(document.documentElement,{subtree:true,childList:true})}catch(e){}
  window.DBEST_PARTNER_PIN_RESET={version:'1.2.0',renderLivePinPanel};
})();