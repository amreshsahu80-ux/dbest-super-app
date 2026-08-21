(function(){
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(e){alert(msg)}}
  function escp(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ownerOk(){return !!(window.session&&window.session.role==='owner'&&window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.())}

  window.ownerResetLiveVaahakPin=async function(id){
    if(!ownerOk())return notify('Owner security session expired. Please log in again.');
    const pin=String(prompt('Enter a new 4–8 digit PIN for '+id)||'').trim();
    if(!pin)return;if(!/^\d{4,8}$/.test(pin))return notify('PIN must contain 4 to 8 digits.');
    if(!confirm('Reset PIN for '+id+'? Existing Vaahak sessions will be signed out.'))return;
    try{
      await window.DBEST_VAAHAK_LIVE.call('owner_reset_pin',{partnerId:id,newPin:pin},{owner:true});
      notify('Vaahak PIN reset successfully. Existing sessions have been signed out.');
      if(typeof ownerVaahakControl==='function')ownerVaahakControl();
    }catch(e){notify('Vaahak PIN reset failed: '+(e.message||'Unknown error'))}
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
    box.innerHTML='<h3>🔐 Vendor Login PIN</h3><div class="notice">Owner can reset a Vendor PIN. Member/User login is not included here because members use email-based authentication.</div><div class="ownerQueue" style="margin-top:10px">'+(commerceConfig.vendors.map(v=>'<div class="ownerQueueRow"><h4>'+escp(v.name)+' • '+escp(v.id)+'</h4><small>'+escp(v.mobile||'')+' • '+escp(v.city||'')+'</small><div class="ownerQueueActions"><button class="mini" onclick="ownerResetVendorPin(\''+String(v.id).replace(/'/g,"\\'")+'\')">Reset PIN</button></div></div>').join('')||'<div class="notice">No vendors onboarded yet.</div>')+'</div>';
    const h=[...host.querySelectorAll('h3')].find(x=>/Onboarded Vendors/i.test(x.textContent||''));if(h)h.before(box);else host.prepend(box);
  }
  function addVaahakResetButtons(){
    if(!window.session||window.session.role!=='owner')return;
    const box=document.getElementById('dbestLiveVaahakOwner');if(!box)return;
    [...box.querySelectorAll('.ownerQueueRow')].forEach(row=>{const txt=row.textContent||'';const m=txt.match(/VHK\d+/i);if(!m||row.querySelector('.dbestResetVaahakPin'))return;const actions=row.querySelector('.ownerQueueActions')||row;const b=document.createElement('button');b.className='mini dbestResetVaahakPin';b.type='button';b.textContent='Reset PIN';b.onclick=()=>window.ownerResetLiveVaahakPin(m[0].toUpperCase());actions.appendChild(b)});
  }

  const oldMarket=window.ownerMarketplaceControl;
  if(typeof oldMarket==='function')window.ownerMarketplaceControl=function(){oldMarket();setTimeout(addVendorResetPanel,120)};
  const oldVaahak=window.ownerVaahakControl;
  if(typeof oldVaahak==='function')window.ownerVaahakControl=function(){oldVaahak();setTimeout(()=>{addVaahakResetButtons();setTimeout(addVaahakResetButtons,500)},220)};
  const obs=new MutationObserver(()=>{if(window.session?.role==='owner'){addVaahakResetButtons();}});try{obs.observe(document.documentElement,{subtree:true,childList:true})}catch(e){}
  window.DBEST_PARTNER_PIN_RESET={version:'1.0.0'};
})();