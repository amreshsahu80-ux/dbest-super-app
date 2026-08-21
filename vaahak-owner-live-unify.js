(function(){
  const escLive=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notifyLive=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
  function currentSession(){try{return typeof session!=='undefined'?session:(window.session||null)}catch(e){return window.session||null}}
  function ownerRoleOk(){const s=currentSession();return !!(s&&s.role==='owner')}
  function ownerToken(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||''}catch(e){return''}}
  function liveReady(){return !!window.DBEST_VAAHAK_LIVE?.call}
  function showOwnerLogin(msg){
    notifyLive(msg||'Owner security session is not active. Please verify Owner OTP.');
    try{if(typeof ownerLogin==='function')ownerLogin()}catch(e){}
  }

  window.ownerApproveLiveVaahak=async function(id,approve){
    if(!ownerRoleOk()||!liveReady()||!ownerToken())return showOwnerLogin('Owner security session is not active. Please verify Owner OTP.');
    try{
      await window.DBEST_VAAHAK_LIVE.call('owner_approve',{partnerId:id,approve:!!approve},{owner:true});
      notifyLive(approve?'Vaahak approved.':'Vaahak rejected.');
      window.ownerVaahakControl();
    }catch(e){
      if(/owner_session_invalid|owner_session/i.test(String(e.message||'')))return showOwnerLogin('Owner security session expired. Please verify Owner OTP once.');
      notifyLive('Unable to update Vaahak: '+(e.message||'Unknown error'));
    }
  };

  function approvalBadge(v){
    const s=String(v||'Pending');
    const bg=s==='Approved'?'#e7f8ee':s==='Rejected'?'#fff0ef':'#fff7df';
    const fg=s==='Approved'?'#17633f':s==='Rejected'?'#9c3535':'#805b00';
    return '<span style="display:inline-block;margin-left:6px;padding:4px 8px;border-radius:999px;background:'+bg+';color:'+fg+';font-size:11px;font-weight:900">'+escLive(s)+'</span>';
  }

  function renderPartners(partners){
    if(!partners.length)return '<div class="notice">No live Vaahak registrations found in Supabase.</div>';
    return partners.map(v=>`<div class="ownerQueueRow" style="border:1px solid #dfe7f2;border-radius:16px;padding:14px;margin:10px 0;background:#fff">
      <h4 style="margin:0 0 6px">${escLive(v.name)} • ${escLive(v.id)} ${approvalBadge(v.owner_approval)}</h4>
      <small>${escLive(v.mobile||'')} • ${escLive(v.vehicle||'')} ${escLive(v.vehicle_no||'')}</small>
      <div class="revenueGrid" style="margin-top:10px">
        <div class="revenueCell"><small>Ride</small><b>${v.can_ride?'Enabled':'Disabled'}</b></div>
        <div class="revenueCell"><small>Delivery</small><b>${v.can_deliver?'Enabled':'Disabled'}</b></div>
        <div class="revenueCell"><small>Agreement</small><b>${escLive(v.agreement_status||'Pending')}</b></div>
        <div class="revenueCell"><small>Availability</small><b>${v.available?'Online':'Offline'}</b></div>
      </div>
      <div class="ownerQueueActions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="mini" onclick="ownerApproveLiveVaahak('${escLive(v.id)}',true)">Approve</button>
        <button class="mini" onclick="ownerApproveLiveVaahak('${escLive(v.id)}',false)">Reject</button>
        <button class="mini" onclick="ownerResetLiveVaahakPin('${escLive(v.id)}')">🔐 Reset PIN</button>
      </div>
    </div>`).join('');
  }

  function renderJobs(jobs){
    if(!jobs.length)return '<div class="notice">No live dispatch jobs yet.</div>';
    return jobs.map(j=>`<div class="vaahakJobRow"><div><label>Job</label><b>${escLive(j.id)}</b><small>${escLive(j.kind||'ride')} • ${escLive(j.tx_id||'')}</small></div><div><label>Route</label><span>${escLive(j.pickup||'')} → ${escLive(j.dropoff||'')}</span></div><div><label>Status</label><b>${escLive(j.status||'')}</b></div><div><label>Assigned</label><span>${escLive(j.assigned_partner_id||'Unassigned')}</span></div></div>`).join('');
  }

  window.ownerVaahakControl=async function(){
    if(!ownerRoleOk()||!liveReady()||!ownerToken())return showOwnerLogin('Owner session is not active. Please verify Owner OTP once.');
    sectionScreen(`${sectionTopBar('🛵 Vaahak Partner Control','Live Supabase • Registration • Approval • PIN • Dispatch','owner()')}
      <div class="sectionContent ownerMasterPage">
        <div class="notice" style="margin-bottom:12px"><b>Live Supabase Vaahak records.</b> This is now the single source for approval, PIN reset, login and dispatch.</div>
        <div id="liveVaahakOwnerList" class="ownerPanelCard"><h3>Live Vaahak Partners</h3><div class="notice">Loading live Vaahak records…</div></div>
        <div id="liveVaahakJobs" style="margin-top:16px"><h3>Live Dispatch Jobs</h3><div class="notice">Loading jobs…</div></div>
      </div>`);
    try{
      const d=await window.DBEST_VAAHAK_LIVE.call('owner_list',{}, {owner:true});
      const p=document.getElementById('liveVaahakOwnerList'); if(p)p.innerHTML='<h3>Live Vaahak Partners</h3>'+renderPartners(Array.isArray(d.partners)?d.partners:[]);
      const j=document.getElementById('liveVaahakJobs'); if(j)j.innerHTML='<h3>Live Dispatch Jobs</h3><div class="ownerList">'+renderJobs(Array.isArray(d.jobs)?d.jobs:[])+'</div>';
    }catch(e){
      const msg=String(e.message||'');
      const p=document.getElementById('liveVaahakOwnerList');
      if(/owner_session_invalid|owner_session/i.test(msg)){
        if(p)p.innerHTML='<h3>Live Vaahak Partners</h3><div class="notice"><b>Owner security session expired.</b><br>Please return to Owner login and verify OTP once.</div>';
        return notifyLive('Owner security session expired. Please verify Owner OTP once.');
      }
      if(p)p.innerHTML='<h3>Live Vaahak Partners</h3><div class="notice">Unable to load live Vaahak data: '+escLive(msg||'Unknown error')+'</div>';
    }
  };

  window.DBEST_VAAHAK_OWNER_LIVE_UNIFIED={version:'1.2.0'};
})();