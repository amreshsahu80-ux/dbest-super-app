(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const API=base+'/functions/v1/member-ride-history';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt=v=>{try{return v?new Date(v).toLocaleString('en-IN'):'—'}catch(e){return v||'—'}};
  const token=()=>window.DBEST_MEMBER_LIVE?.getToken?.()||'';
  async function fetchRides(){
    const t=token();if(!t)throw new Error('member_session_required');
    const r=await fetch(API,{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','x-dbest-member-token':t},body:'{}'});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'history_failed');return d;
  }
  function badge(s){const x=String(s||'');const bg=x==='Completed'?'#e8f8ee':x==='Cancelled'?'#fff0ef':x==='Trip Started'?'#fff6db':'#edf3ff';const col=x==='Completed'?'#17633f':x==='Cancelled'?'#9c3535':x==='Trip Started'?'#8a6300':'#1552bd';return `<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${bg};color:${col};font-weight:800;font-size:12px">${esc(x)}</span>`}
  function rideCard(r){return `<div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:13px;margin:10px 0;box-shadow:0 6px 18px rgba(20,50,100,.06)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><b>🚕 ${esc(r.id)}</b>${badge(r.status)}</div><div style="margin-top:7px;font-weight:700">${esc(r.pickup)} → ${esc(r.dropoff)}</div><div style="margin-top:6px;color:#64748b;font-size:13px">${esc(r.vehicle_type||'Ride')} • ${r.distance_km?Number(r.distance_km).toFixed(1)+' km • ':''}${r.fare?'₹'+Number(r.fare):''}</div>${r.partner?`<div style="margin-top:6px">🛵 ${esc(r.partner.name)} • ${esc(r.partner.vehicle)} ${esc(r.partner.vehicle_no||'')} • ⭐ ${esc(r.partner.rating||'')}</div>`:''}<div style="margin-top:6px;color:#64748b;font-size:12px">Booked: ${dt(r.created_at)}${r.started_at?` • Started: ${dt(r.started_at)}`:''}${r.completed_at?` • Completed: ${dt(r.completed_at)}`:''}${r.cancelled_at?` • Cancelled: ${dt(r.cancelled_at)}`:''}</div>${r.status==='Cancelled'?`<div style="margin-top:6px;color:#9c3535;font-size:12px">Cancelled by ${esc(r.cancelled_by||'—')}${r.cancellation_reason?' • '+esc(r.cancellation_reason):''}</div>`:''}</div>`}
  window.openMyRides=async function(){
    if(typeof sectionScreen==='function')sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('🚕 My Rides','Current & past DBest rides','memberDash(session.id)'):''}<div class="sectionContent"><div id="dbestMyRides"><div style="padding:18px">Loading ride history…</div></div></div>`);
    const host=document.getElementById('dbestMyRides');if(!host)return;
    try{const d=await fetchRides(),s=d.summary||{},rows=d.rides||[];host.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 14px"><div class="ownerPanelCard"><small>Total</small><b style="display:block;font-size:22px">${s.total||0}</b></div><div class="ownerPanelCard"><small>Active</small><b style="display:block;font-size:22px">${s.active||0}</b></div><div class="ownerPanelCard"><small>Completed</small><b style="display:block;font-size:22px">${s.completed||0}</b></div><div class="ownerPanelCard"><small>Cancelled</small><b style="display:block;font-size:22px">${s.cancelled||0}</b></div></div><div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:12px;margin-bottom:12px"><b>Total completed ride spend: ₹${Number(s.totalSpend||0).toFixed(0)}</b></div>${rows.length?rows.map(rideCard).join(''):'<div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:18px">No rides yet.</div>'}`;}catch(e){host.innerHTML='<div style="padding:18px;background:#fff0ef;border-radius:14px">Please login again to refresh your secure ride history.</div>'}
  };
  function addButton(){const host=document.querySelector('.sectionContent');if(!host||document.getElementById('dbestMyRidesBtn'))return;const b=document.createElement('button');b.id='dbestMyRidesBtn';b.className='btn';b.style.cssText='margin:10px 0 14px';b.textContent='🚕 My Rides';b.onclick=()=>window.openMyRides();host.prepend(b)}
  const oldMember=window.memberDash;if(typeof oldMember==='function')window.memberDash=function(id){oldMember(id);setTimeout(addButton,120)};
  const oldRide=window.rideStatusScreen;if(typeof oldRide==='function')window.rideStatusScreen=function(txId){oldRide(txId);setTimeout(addButton,120)};
})();
