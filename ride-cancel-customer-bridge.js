(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const cancelApi=base+'/functions/v1/ride-cancel-live';
  let activeTx='', timer=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
  async function cancelCustomer(jobId,txId){
    const token=window.DBEST_VAAHAK_SECURITY?.getCustomerToken?.(txId)||'';
    if(!token)return notify('Ride session not found. Please reopen the booking status page.');
    if(!confirm('Cancel this ride?'))return;
    const reason=prompt('Optional cancellation reason')||'';
    const r=await fetch(cancelApi,{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({action:'customer_cancel',jobId,txId,customerToken:token,reason})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){return notify(d.error==='ride_already_started'?'Ride has already started and can no longer be cancelled.':'Unable to cancel ride: '+(d.error||'Please try again.'));}
    notify('Ride cancelled successfully.');
    refresh(txId);
  }
  async function refresh(txId){
    const token=window.DBEST_VAAHAK_SECURITY?.getCustomerToken?.(txId)||'';
    if(!token||!window.DBEST_VAAHAK_LIVE?.call)return;
    try{
      const d=await window.DBEST_VAAHAK_LIVE.call('ride_status',{txId:String(txId),customerToken:token});
      if(!d.job)return;
      let box=document.getElementById('dbestLiveRideCancel');
      if(!box){box=document.createElement('div');box.id='dbestLiveRideCancel';box.style.cssText='margin:10px 24px 14px;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#fff';(document.querySelector('.sectionContent')||document.body).prepend(box);}
      const can=['Open','Accepted'].includes(String(d.job.status));
      box.innerHTML=can?`<button id="dbestCustomerCancelBtn" style="border:0;border-radius:12px;padding:11px 15px;background:#fff0ef;color:#a72f2f;font-weight:800">Cancel Ride</button><span style="margin-left:10px;color:#64748b;font-size:12px">Available until the trip starts.</span>`:`<div style="color:#64748b;font-size:13px">Ride status: <b>${esc(d.job.status)}</b></div>`;
      const b=document.getElementById('dbestCustomerCancelBtn');if(b)b.onclick=()=>cancelCustomer(d.job.id,String(txId));
      if(['Cancelled','Completed','Trip Started'].includes(String(d.job.status))&&timer){clearInterval(timer);timer=null;}
    }catch(e){}
  }
  const old=window.rideStatusScreen;
  if(typeof old==='function')window.rideStatusScreen=function(txId){activeTx=String(txId);old(txId);setTimeout(()=>refresh(activeTx),450);if(timer)clearInterval(timer);timer=setInterval(()=>refresh(activeTx),3000);};
  window.DBEST_RIDE_CANCEL={version:'1.0.0',refresh};
})();