(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const API=base+'/functions/v1/vaahak-live';
  const TOKEN_KEY='dbest_vaahak_live_token';
  let pollTimer=null,lastAlerted='';
  function token(){try{return localStorage.getItem(TOKEN_KEY)||''}catch(e){return''}}
  function saveToken(v){try{v?localStorage.setItem(TOKEN_KEY,v):localStorage.removeItem(TOKEN_KEY)}catch(e){}}
  function escx(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(e){alert(msg)}}
  async function call(action,body,opts){
    const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
    if(opts?.vaahak&&token())headers['x-vaahak-token']=token();
    if(opts?.owner){const t=window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||'';if(t)headers['x-dbest-owner-token']=t;}
    const r=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,...(body||{})})});
    let d={};try{d=await r.json()}catch(e){}
    if(!r.ok)throw new Error(d.error||('Request failed '+r.status));
    return d;
  }
  window.DBEST_VAAHAK_LIVE={call,version:'1.0.0'};

  async function alertNewJob(job){
    if(!job||job.id===lastAlerted)return;lastAlerted=job.id;
    try{navigator.vibrate&&navigator.vibrate([250,120,250]);}catch(e){}
    try{const C=window.AudioContext||window.webkitAudioContext;if(C){const c=new C(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=760;g.gain.value=.08;o.start();setTimeout(()=>{o.stop();c.close()},350)}}catch(e){}
    try{if(Notification.permission==='granted')new Notification('New DBest Ride Request',{body:(job.pickup||'Pickup')+' → '+(job.dropoff||'Destination'),tag:job.id,renotify:true});}catch(e){}
  }

  window.registerVaahakPortal=async function(e){
    e.preventDefault();const f=new FormData(e.target);
    try{
      const d=await call('register',{name:String(f.get('name')||''),mobile:String(f.get('mobile')||''),email:String(f.get('email')||''),pin:String(f.get('pin')||''),vehicle:String(f.get('vehicle')||''),vehicleNo:String(f.get('vehicleNo')||''),canRide:f.get('ride')==='on',canDeliver:f.get('delivery')==='on'});
      notify('Vaahak registration submitted. Your Vaahak ID is '+d.id+'. Please note it for login.');
      setTimeout(()=>window.vaahakLoginScreen?.(),900);
    }catch(err){notify(err.message==='mobile_already_registered'?'This mobile number is already registered as Vaahak.':'Registration failed: '+err.message)}
  };

  window.vaahakPortalLogin=async function(e){
    e.preventDefault();const f=new FormData(e.target);
    try{const d=await call('login',{login:String(f.get('id')||''),pin:String(f.get('pin')||'')});saveToken(d.token);window.vaahakDashboard();}
    catch(err){notify('Invalid Vaahak ID / mobile or PIN.');}
  };
  window.vaahakPortalLogout=function(){saveToken('');if(pollTimer)clearInterval(pollTimer);pollTimer=null;window.openVaahakPortal?.()};

  window.vaahakToggleOnline=async function(){
    try{
      if('Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch(e){}}
      const d=await call('status',{}, {vaahak:true});
      const next=!d.partner.available;await call('availability',{available:next},{vaahak:true});notify(next?'You are ONLINE and ready for rides.':'You are OFFLINE.');window.vaahakDashboard();
    }catch(err){notify(err.message==='owner_approval_pending'?'Owner approval is required before going online.':'Unable to change status: '+err.message)}
  };
  window.vaahakJobAction=async function(jobId,action){
    try{await call(action,{jobId},{vaahak:true});notify(action==='accept'?'Ride accepted.':action==='start'?'Ride started.':action==='complete'?'Ride completed.':'Request skipped.');window.vaahakDashboard();}
    catch(err){notify(err.message==='ride_already_taken'?'Another Vaahak has already accepted this ride.':'Unable to update ride: '+err.message)}
  };

  async function renderLiveDashboard(silent){
    if(!token())return window.openVaahakPortal?.();
    try{
      const d=await call('status',{}, {vaahak:true});const v=d.partner,jobs=d.jobs||[];
      const open=jobs.filter(j=>j.status==='Open');if(open[0])alertNewJob(open[0]);
      const active=jobs.filter(j=>!['Completed','Cancelled'].includes(j.status));
      if(typeof sectionScreen!=='function')return;
      sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('🛵 Vaahak Live Dashboard',`${v.id} • ${v.name}`,'openVaahakPortal()'):''}<div class="sectionContent"><div class="vhWrap"><div class="vhHero"><h2>${escx(v.name)}</h2><div>${escx(v.vehicle)} • ${escx(v.vehicle_no||'')} • ${escx(v.owner_approval)}</div></div><div class="vhStatus"><div class="vhStat"><small>Owner Approval</small><b>${escx(v.owner_approval)}</b></div><div class="vhStat"><small>Agreement</small><b>${escx(v.agreement_status)}</b></div><div class="vhStat"><small>Live Status</small><b>${v.available?'ONLINE':'OFFLINE'}</b></div><div class="vhStat"><small>Requests</small><b>${active.length}</b></div></div><div class="vhCard"><div class="vhActions"><button class="btn ${v.available?'vhOffline':'vhOnline'}" onclick="vaahakToggleOnline()">${v.available?'Go Offline':'Go Online'}</button><button class="btn soft" onclick="vaahakPortalLogout()">Logout</button></div><small style="display:block;margin-top:10px;color:#64748b">Live ride requests refresh automatically every 3 seconds. Keep this page open during testing.</small></div><h3>Live Ride / Delivery Requests</h3><div class="vhJobs">${active.map(j=>`<div class="vhJob"><b>${j.kind==='ride'?'🚕 Ride Request':'📦 Delivery'} • ${escx(j.id)}</b><div class="route">${escx(j.pickup)} → ${escx(j.dropoff)}</div><small>${j.distance_km?Number(j.distance_km).toFixed(1)+' km • ':''}${j.fare?'Fare ₹'+Number(j.fare)+' • ':''}Status: ${escx(j.status)}</small><div class="vhActions" style="margin-top:9px">${j.status==='Open'?`<button class="mini" onclick="vaahakJobAction('${j.id}','accept')">Accept Ride</button><button class="mini" onclick="vaahakJobAction('${j.id}','reject')">Skip</button>`:''}${j.assigned_partner_id===v.id&&j.status==='Accepted'?`<button class="mini" onclick="vaahakJobAction('${j.id}','start')">Start Ride</button>`:''}${j.assigned_partner_id===v.id&&j.status==='Trip Started'?`<button class="mini" onclick="vaahakJobAction('${j.id}','complete')">Complete Ride</button>`:''}</div></div>`).join('')||'<div class="vhCard">No live requests right now.</div>'}</div></div></div>`);
    }catch(err){if(!silent){if(/session/i.test(err.message)){saveToken('');notify('Vaahak session expired. Please login again.');window.vaahakLoginScreen?.()}else notify('Live dashboard error: '+err.message)}}
  }
  window.vaahakDashboard=function(){renderLiveDashboard(false);if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(()=>{if(token())renderLiveDashboard(true)},3000)};

  const oldRideStatus=window.rideStatusScreen;
  if(typeof oldRideStatus==='function'){
    window.rideStatusScreen=function(txId){
      oldRideStatus(txId);
      try{
        const flag='dbest_live_ride_'+txId;if(localStorage.getItem(flag))return;
        const x=Array.isArray(window.txs)?window.txs.find(t=>String(t.id)===String(txId)):(typeof txs!=='undefined'&&Array.isArray(txs)?txs.find(t=>String(t.id)===String(txId)):null);
        const r=x?.ride||x?.meta?.ride||{};if(!x||!r)return;
        const user=(typeof users!=='undefined'&&Array.isArray(users))?users.find(u=>u.id===x.userId):null;
        call('create_ride',{txId:String(txId),customerName:user?.name||x.user||'',customerMobile:user?.mobile||'',pickup:r.pickup||'',drop:r.drop||'',pickupLat:r.pickupCoords?.lat,pickupLng:r.pickupCoords?.lng,dropLat:r.dropCoords?.lat,dropLng:r.dropCoords?.lng,distanceKm:Number(r.distance||0),fare:Number(x.amount||0),vehicleType:r.vehicleName||r.vehicleId||''}).then(()=>{localStorage.setItem(flag,'1');startCustomerRidePoll(txId)}).catch(()=>{});
      }catch(e){}
    };
  }
  let customerTimer=null;
  function startCustomerRidePoll(txId){if(customerTimer)clearInterval(customerTimer);const tick=async()=>{try{const d=await call('ride_status',{txId});if(!d.job)return;let box=document.getElementById('dbestLiveRideStatus');if(!box){box=document.createElement('div');box.id='dbestLiveRideStatus';box.style.cssText='margin:12px 24px;padding:14px;border:1px solid #cfe0ff;border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(20,60,120,.08)';const host=document.querySelector('.sectionContent')||document.body;host.prepend(box)}box.innerHTML=`<b>📡 Live Vaahak Status: ${escx(d.job.status)}</b>${d.partner?`<div style="margin-top:6px">🛵 ${escx(d.partner.name)} • ${escx(d.partner.vehicle)} ${escx(d.partner.vehicle_no||'')} • ⭐ ${escx(d.partner.rating||'')}</div>`:'<div style="margin-top:6px;color:#64748b">Waiting for an online Vaahak to accept this ride…</div>'}${d.job.otp&&['Accepted','Trip Started'].includes(d.job.status)?`<div style="margin-top:8px;font-size:22px;font-weight:900">Ride OTP: ${escx(d.job.otp)}</div>`:''}`;if(d.job.status==='Completed'){clearInterval(customerTimer);customerTimer=null}}catch(e){}};tick();customerTimer=setInterval(tick,3000)}

  const oldOwner=window.ownerVaahakControl;
  if(typeof oldOwner==='function')window.ownerVaahakControl=function(){oldOwner();setTimeout(loadOwnerLiveVaahak,150)};
  async function loadOwnerLiveVaahak(){
    if(!window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.())return;
    try{const d=await call('owner_list',{}, {owner:true});const host=document.querySelector('.sectionContent.ownerMasterPage')||document.querySelector('.sectionContent');if(!host)return;let box=document.getElementById('dbestLiveVaahakOwner');if(!box){box=document.createElement('div');box.id='dbestLiveVaahakOwner';box.className='ownerPanelCard';box.style.marginTop='16px';host.prepend(box)}box.innerHTML=`<h3>📡 Live Cross-Device Vaahak</h3><div class="notice">These partners and ride requests are stored in Supabase and work across different phones/browsers.</div><div class="ownerQueue" style="margin-top:10px">${(d.partners||[]).map(v=>`<div class="ownerQueueRow"><h4>${escx(v.name)} • ${escx(v.id)}</h4><small>${escx(v.mobile)} • ${escx(v.vehicle)} ${escx(v.vehicle_no||'')} • ${v.available?'ONLINE':'OFFLINE'}</small><div class="ownerQueueActions"><b>${escx(v.owner_approval)}</b>${v.owner_approval!=='Approved'?`<button class="mini" onclick="ownerApproveLiveVaahak('${v.id}',true)">Approve</button>`:''}<button class="mini" onclick="ownerApproveLiveVaahak('${v.id}',false)">Reject</button></div></div>`).join('')||'<div class="notice">No live Vaahak registrations yet.</div>'}</div><h3>Live Ride Jobs</h3><div class="ownerQueue">${(d.jobs||[]).slice(0,10).map(j=>`<div class="ownerQueueRow"><b>${escx(j.id)} • ${escx(j.status)}</b><small>${escx(j.pickup)} → ${escx(j.dropoff)}${j.assigned_partner_id?' • '+escx(j.assigned_partner_id):''}</small></div>`).join('')||'<div class="notice">No live ride jobs yet.</div>'}</div>`;}catch(e){}
  }
  window.ownerApproveLiveVaahak=async function(id,approve){try{await call('owner_approve',{partnerId:id,approve:!!approve},{owner:true});notify(approve?'Vaahak approved for live testing.':'Vaahak rejected.');loadOwnerLiveVaahak()}catch(e){notify('Owner action failed: '+e.message)}};

  const params=new URLSearchParams(location.search);if(params.get('portal')==='vaahak'){setTimeout(()=>window.openVaahakPortal?.(),300)}
})();