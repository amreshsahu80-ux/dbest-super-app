(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',COM=BASE+'/functions/v1/vaahak-commerce-live';
  function isOwner(){try{return typeof session!=='undefined'&&session&&session.role==='owner'}catch(e){return false}}
  function cleanOverlays(){if(!document.getElementById('dbestShowcaseOwnerModal')&&!document.getElementById('dbestShowcaseEditModal'))document.body.style.overflow='';}
  async function vaahakRevenueApi(action,body={},owner=false){
    const h={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
    if(owner){const t=window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||'';if(!t)throw new Error('owner_session_required');h['x-dbest-owner-token']=t}
    const r=await fetch(COM,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'request_failed');return d;
  }
  function openFinanceSection(kind){
    if(!isOwner())return typeof window.ownerLogin==='function'?window.ownerLogin():null;
    const isIns=kind==='insurance', id=isIns?'insurance':'mf';
    const title=isIns?'Insurance Section Control':'Mutual Fund Section Control';
    const icon=isIns?'🛡️':'📈';
    const l=(typeof links!=='undefined'&&links&&links[id])||{};
    if(typeof window.sectionScreen!=='function')return window.toast?.('Owner section screen unavailable');
    const top=typeof window.sectionTopBar==='function'?window.sectionTopBar(icon+' '+title,'Deeplink • Images • Display','owner()'):`<div style="display:flex;gap:10px;align-items:center"><button class="btn soft" onclick="owner()">← Back</button><h2>${title}</h2></div>`;
    window.sectionScreen(`${top}<div class="sectionContent ownerStudio dbestFinanceOwnerControl" data-owner-finance="${kind}"><div class="payoutIntro"><b>${isIns?'Insurance':'Mutual Fund'} controls only.</b><br><small>Manage partner deeplink and the customer-facing image/text cards here. Promoter/User payout rules are managed separately in Payout Studio.</small></div><div class="cards"><div class="card"><b>🖼 ${isIns?'Insurer':'Mutual Fund House'} Cards</b><small style="display:block;margin:6px 0 12px;color:var(--m)">Add, edit, hide/show, reorder or replace card images and text.</small><button class="btn" type="button" data-dbest-finance-visual="${kind}">Manage Images & Cards</button></div><div class="card"><b>🔗 Partner Deeplink</b><form class="form" onsubmit="saveLink(event,'${id}')"><div class="f full"><label>Partner Name</label><input name="partner" value="${esc(l.partner||'')}"></div><div class="f full"><label>External URL</label><input name="url" value="${esc(l.url||'')}" placeholder="https://..."></div><div class="f full"><label>Button Label</label><input name="buttonLabel" value="${esc(l.buttonLabel||('Continue to '+(l.partner||'Partner')))}"></div><div class="f full"><label><input type="checkbox" name="enabled" ${l.enabled!==false&&l.url?'checked':''}> Enabled</label></div><div class="f full"><button class="btn">Save ${isIns?'Insurance':'Mutual Fund'} Deeplink</button></div></form></div></div></div>`);
    setTimeout(()=>{document.querySelector(`[data-dbest-finance-visual="${kind}"]`)?.addEventListener('click',()=>window.DBEST_SHOWCASE_ADMIN?.openManager?.(kind));},0);
  }
  window.ownerInsuranceSectionControl=()=>openFinanceSection('insurance');
  window.ownerMutualFundSectionControl=()=>openFinanceSection('mutual_fund');
  window.ownerQuickAddUser=function(){cleanOverlays();if(typeof window.registerChoice==='function')return window.registerChoice();if(typeof window.account==='function')return window.account();window.toast?.('Member registration screen unavailable');};
  window.ownerQuickAddVendor=function(){cleanOverlays();if(typeof window.ownerMarketplaceControl==='function')return window.ownerMarketplaceControl();window.toast?.('Vendor onboarding screen unavailable');};
  window.ownerQuickAddVaahak=function(){cleanOverlays();if(typeof window.ownerVaahakControl==='function')return window.ownerVaahakControl();window.toast?.('Vaahak onboarding screen unavailable');};

  window.ownerVaahakRevenueControl=async function(){
    cleanOverlays();if(!isOwner())return typeof window.ownerLogin==='function'?window.ownerLogin():null;
    if(typeof window.sectionScreen!=='function')return window.toast?.('Owner section screen unavailable');
    const top=typeof window.sectionTopBar==='function'?window.sectionTopBar('🛵 Vaahak Revenue & Delivery Payout','Live Marketplace delivery earning • Owner controlled','owner()'):`<div><button class="btn soft" onclick="owner()">← Back</button><h2>Vaahak Revenue & Delivery Payout</h2></div>`;
    window.sectionScreen(`${top}<div class="sectionContent ownerMasterPage"><div class="ownerPanelCard" style="border:2px solid #cfe0ff"><h3>Marketplace Delivery Payout for Vaahak</h3><p class="muted">This is the predefined earning paid to the Vaahak for each completed Marketplace delivery. The rate is snapshotted when a new delivery job is created, so old completed earnings do not change later.</p><form id="dbestOwnerDeliveryRateForm" class="form"><div class="f"><label>Vaahak Earning ₹ / Completed Delivery</label><input name="flat" type="number" min="0" step="1" required placeholder="35"></div><div class="f"><label>Settlement Cycle</label><input name="settlement" value="Weekly" required></div><div class="f full"><button class="btn" type="submit">Save Live Delivery Payout</button></div></form><div id="dbestOwnerDeliveryRateStatus" class="notice" style="margin-top:10px">Loading current live rate…</div></div><div class="ownerPanelCard" style="margin-top:14px"><h3>Cab Ride Revenue</h3><p class="muted">Cab fares continue to use the predefined ride pricing/payout rules already configured for the platform. This control is specifically for Marketplace delivery earnings.</p><button class="btn soft" type="button" onclick="ownerQuickAddVaahak()">Open Full Vaahak Partner Control</button></div></div>`);
    const form=document.getElementById('dbestOwnerDeliveryRateForm'),status=document.getElementById('dbestOwnerDeliveryRateStatus');
    if(form)form.onsubmit=window.saveOwnerVaahakDeliveryRate;
    try{const d=await vaahakRevenueApi('delivery_rate');const r=d.rate||{};if(form){form.elements.flat.value=Number(r.flat||0);form.elements.settlement.value=String(r.settlement||'Weekly')}if(status)status.innerHTML=`<b>Current live payout:</b> ₹${Math.round(Number(r.flat||0))} per completed Marketplace delivery • ${esc(r.settlement||'Weekly')} settlement.`}catch(e){if(status)status.textContent='Could not load the live delivery payout. Please retry.'}
  };
  window.saveOwnerVaahakDeliveryRate=async function(e){
    e.preventDefault();if(!isOwner())return;const f=new FormData(e.target),flat=Number(f.get('flat')),settlement=String(f.get('settlement')||'Weekly').trim()||'Weekly';
    if(!Number.isFinite(flat)||flat<0)return window.toast?.('Enter a valid Marketplace delivery payout.');
    const status=document.getElementById('dbestOwnerDeliveryRateStatus');if(status)status.textContent='Saving live payout…';
    try{const d=await vaahakRevenueApi('owner_set_delivery_rate',{flat,settlement},true),r=d.rate||{flat,settlement};try{if(typeof partnerAgreementConfig!=='undefined'&&partnerAgreementConfig?.vaahak){partnerAgreementConfig.vaahak.deliveryFlat=Number(r.flat||flat);partnerAgreementConfig.vaahak.settlement=String(r.settlement||settlement)}}catch(x){}if(status)status.innerHTML=`<b>Saved:</b> ₹${Math.round(Number(r.flat||flat))} per completed Marketplace delivery • ${esc(r.settlement||settlement)} settlement.`;window.toast?.('Marketplace delivery payout updated successfully.')}catch(err){if(status)status.textContent=err.message==='owner_session_required'||/owner_session/i.test(err.message)?'Owner security session expired. Please login again.':'Could not save live delivery payout: '+err.message;window.toast?.('Live delivery payout could not be updated.')}};

  function addSectionControls(){
    if(!isOwner())return;
    const root=document.querySelector('.sectionContent.owner55'); if(!root)return;
    const groups=[...root.querySelectorAll('.owner55Group')];
    const platform=groups.find(g=>/Platform & Experience/i.test(g.innerText||''))||groups[0];
    const grid=platform?.querySelector('.owner55Grid');
    if(grid&&!document.getElementById('dbestOwnerInsuranceControl')){
      const ins=document.createElement('button');ins.id='dbestOwnerInsuranceControl';ins.className='owner55Action';ins.innerHTML='<span>🛡️</span><b>Insurance Section</b><small>Insurance deeplink, insurer cards, images, text, order and visibility only.</small>';ins.onclick=window.ownerInsuranceSectionControl;
      const mf=document.createElement('button');mf.id='dbestOwnerMutualFundControl';mf.className='owner55Action';mf.innerHTML='<span>📈</span><b>Mutual Fund Section</b><small>Mutual Fund deeplink, AMC cards, images, text, order and visibility only.</small>';mf.onclick=window.ownerMutualFundSectionControl;
      grid.append(ins,mf);
    }
    const host=root.querySelector('.owner55Groups')||root;
    if(!document.getElementById('dbestOwnerVaahakRevenueGroup')){
      const group=document.createElement('div');group.className='owner55Group';group.id='dbestOwnerVaahakRevenueGroup';group.innerHTML='<div class="owner55GroupHead"><div><b>Vaahak Revenue & Delivery</b><small>Owner control for Marketplace delivery payout and Vaahak commercial settings.</small></div></div><div class="owner55Grid"><button class="owner55Action" id="dbestOwnerVaahakRevenueButton"><span>💰</span><b>Vaahak Revenue / Delivery Payout</b><small>Set the predefined ₹ earning paid for every completed Marketplace delivery.</small></button><button class="owner55Action" onclick="ownerQuickAddVaahak()"><span>🛵</span><b>Full Vaahak Partner Control</b><small>Onboarding, KYC, agreements and operational controls.</small></button></div>';host.prepend(group);group.querySelector('#dbestOwnerVaahakRevenueButton').onclick=window.ownerVaahakRevenueControl;
    }
    if(!document.getElementById('dbestOwnerQuickAddGroup')){
      const group=document.createElement('div');group.className='owner55Group';group.id='dbestOwnerQuickAddGroup';
      group.innerHTML='<div class="owner55GroupHead"><div><b>Quick Add / Emergency Onboarding</b><small>Owner can initiate onboarding without bypassing normal validation, KYC or duplicate checks.</small></div></div><div class="owner55Grid"><button class="owner55Action" onclick="ownerQuickAddUser()"><span>👤</span><b>Add User / Member</b><small>Open standard Member registration from Owner Console.</small></button><button class="owner55Action" onclick="ownerQuickAddVendor()"><span>🏪</span><b>Add Vendor</b><small>Open Vendor onboarding and catalogue control.</small></button><button class="owner55Action" onclick="ownerQuickAddVaahak()"><span>🛵</span><b>Add Vaahak</b><small>Open Vaahak onboarding, vehicle and dispatch control.</small></button></div>';
      host.prepend(group);
    }
  }
  function routeOwnerControl(e){
    if(!isOwner())return; const b=e.target.closest?.('button'); if(!b)return; const t=(b.innerText||'').trim().toLowerCase();
    if(t.includes('vaahak revenue')||t.includes('delivery payout')){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerVaahakRevenueControl();}
    if(t.includes('insurance section')){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerInsuranceSectionControl();}
    if(t.includes('mutual fund section')){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerMutualFundSectionControl();}
    if(t.includes('tile media studio')||t==='tile media'||t.startsWith('tile media\n')){if(typeof window.ownerTileMediaStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerTileMediaStudio();}}
    if(t.includes('deeplink integrations')||t.includes('deeplink integration studio')||t==='deeplinks'||t.includes('external deeplinks')){if(typeof window.ownerDeeplinkStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerDeeplinkStudio();}}
    if(t.includes('payout studio')||t==='payouts'||t.startsWith('payout rules')){if(typeof window.ownerPayoutStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerPayoutStudio();}}
  }
  document.addEventListener('click',routeOwnerControl,true);
  const observer=new MutationObserver(()=>{cleanOverlays();addSectionControls();});observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(addSectionControls,250);
  window.DBEST_OWNER_CLEAN_CONTROLS={refresh:addSectionControls,insurance:window.ownerInsuranceSectionControl,mutualFund:window.ownerMutualFundSectionControl,vaahakRevenue:window.ownerVaahakRevenueControl,quickAdd:{user:window.ownerQuickAddUser,vendor:window.ownerQuickAddVendor,vaahak:window.ownerQuickAddVaahak}};
})();
