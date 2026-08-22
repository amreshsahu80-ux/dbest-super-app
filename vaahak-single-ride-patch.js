(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const cancelApi=base+'/functions/v1/ride-cancel-live';
  const token=()=>{try{return localStorage.getItem('dbest_vaahak_live_token')||''}catch(e){return''}};
  const note2=(m,ok=true)=>{try{typeof note==='function'?note(m,ok):alert(m)}catch(e){alert(m)}};
  async function cancelAssigned(jobId){
    if(!confirm('Cancel this ride before it starts?'))return;
    const reason=prompt('Optional cancellation reason')||'';
    const r=await fetch(cancelApi,{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','x-vaahak-token':token()},body:JSON.stringify({action:'vaahak_cancel',jobId,reason})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)return note2(d.error==='ride_already_started'?'Ride has already started and cannot be cancelled.':'Unable to cancel ride: '+(d.error||'Please try again.'),false);
    note2('Ride cancelled.');
    try{loadStatus()}catch(e){}
  }
  function patchCards(){
    const host=document.getElementById('jobs');if(!host)return;
    const cards=[...host.querySelectorAll('.job')];if(!cards.length)return;
    let chosen=cards.find(c=>/Trip Started|Accepted/.test(c.innerText||''))||cards[0];
    cards.forEach(c=>{c.style.display=c===chosen?'block':'none'});
    if(/Accepted/.test(chosen.innerText||'')&&!chosen.querySelector('.dbestVaahakCancel')){
      const row=chosen.querySelector('.otpRow')||chosen.querySelector('.row:last-child')||chosen;
      const idMatch=(chosen.innerText||'').match(/VJ\d+/);
      const btn=document.createElement('button');btn.type='button';btn.className='btn soft dbestVaahakCancel';btn.style.marginTop='10px';btn.textContent='Cancel Ride';
      btn.onclick=()=>{const inline=chosen.querySelector('[onclick*="startWithOtp"]');const m=inline?.getAttribute('onclick')?.match(/startWithOtp\('([^']+)'\)/);const id=m&&m[1]||idMatch&&idMatch[0];if(id)cancelAssigned(id)};
      row.parentNode.insertBefore(btn,row.nextSibling);
    }
    let msg=document.getElementById('dbestSingleRideNote');
    if(cards.length>1&&!msg){msg=document.createElement('div');msg.id='dbestSingleRideNote';msg.className='muted';msg.style.marginTop='10px';msg.textContent='Only one ride is shown at a time. Finish or cancel the active ride before taking another.';host.appendChild(msg)}
  }
  const mo=new MutationObserver(()=>patchCards());
  mo.observe(document.body,{subtree:true,childList:true});
  setInterval(patchCards,1200);
  window.DBEST_VAAHAK_CANCEL={cancelAssigned};
})();