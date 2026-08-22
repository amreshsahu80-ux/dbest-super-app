(function(){
  function esc2(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function when(v){try{return v?new Date(v).toLocaleString('en-IN'):'—'}catch(e){return v||'—'}}
  function badge(s){const x=String(s||'');const bg=x==='Completed'?'#e8f8ee':x==='Cancelled'?'#fff0ef':x==='Trip Started'?'#fff6db':'#edf3ff';const col=x==='Completed'?'#17633f':x==='Cancelled'?'#9c3535':x==='Trip Started'?'#8a6300':'#1552bd';return `<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${bg};color:${col};font-weight:800;font-size:12px">${esc2(x)}</span>`}
  async function renderHistory(){
    if(typeof token!=='function'||!token()||typeof call!=='function')return;
    const dash=document.getElementById('dash');if(!dash)return;
    let card=document.getElementById('vaahakHistoryCard');
    if(!card){card=document.createElement('div');card.id='vaahakHistoryCard';card.className='card';card.innerHTML='<h3>Ride History / My Jobs</h3><div id="vaahakHistoryStats" class="stat" style="margin-top:10px"></div><div id="vaahakHistoryList" style="margin-top:10px">Loading…</div>';dash.appendChild(card)}
    try{
      const d=await call('status',{},true),v=d.partner,all=(d.jobs||[]).filter(j=>j.assigned_partner_id===v.id);
      const completed=all.filter(j=>j.status==='Completed'),cancelled=all.filter(j=>j.status==='Cancelled'),active=all.filter(j=>!['Completed','Cancelled'].includes(j.status));
      const earnings=completed.reduce((a,j)=>a+Number(j.partner_earning||0),0);
      document.getElementById('vaahakHistoryStats').innerHTML=`<div><small>Total Jobs</small><b>${all.length}</b></div><div><small>Active</small><b>${active.length}</b></div><div><small>Completed</small><b>${completed.length}</b></div><div><small>Earnings</small><b>₹${Math.round(earnings)}</b></div>`;
      document.getElementById('vaahakHistoryList').innerHTML=all.length?all.map(j=>`<div class="job" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc2(j.id)}</b>${badge(j.status)}</div><div style="margin-top:6px">${esc2(j.pickup)} → ${esc2(j.dropoff)}</div><small>${j.distance_km?Number(j.distance_km).toFixed(1)+' km • ':''}${j.fare?'Fare ₹'+Number(j.fare)+' • ':''}${j.partner_earning?'Your earning ₹'+Number(j.partner_earning):''}</small><div class="muted" style="margin-top:6px;font-size:12px">Booked: ${when(j.created_at)}${j.accepted_at?' • Accepted: '+when(j.accepted_at):''}${j.started_at?' • Started: '+when(j.started_at):''}${j.completed_at?' • Completed: '+when(j.completed_at):''}</div></div>`).join(''):'No ride history yet.';
    }catch(e){}
  }
  const oldShow=window.show;if(typeof oldShow==='function')window.show=function(id){oldShow(id);if(id==='dash')setTimeout(renderHistory,300)};
  setInterval(()=>{const dash=document.getElementById('dash');if(dash&&!dash.classList.contains('hidden'))renderHistory()},5000);
})();
