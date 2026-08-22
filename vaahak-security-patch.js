(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const apiBase=String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/vaahak-live';
  const rawFetch=window.fetch.bind(window);
  const customerKey=txId=>'dbest_live_customer_token_'+String(txId||'');
  const getCustomerToken=txId=>{try{return localStorage.getItem(customerKey(txId))||''}catch(e){return''}};
  const saveCustomerToken=(txId,token)=>{try{if(txId&&token)localStorage.setItem(customerKey(txId),String(token))}catch(e){}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notify=msg=>{try{typeof toast==='function'?toast(msg):alert(msg)}catch(e){alert(msg)}};

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input&&input.url||'');
    if(!url.startsWith(apiBase)||!init||String(init.method||'GET').toUpperCase()!=='POST')return rawFetch(input,init);
    let body=null;
    try{body=JSON.parse(String(init.body||'{}'))}catch(e){return rawFetch(input,init)}
    if(body.action==='ride_status'&&body.txId&&!body.customerToken){
      const t=getCustomerToken(body.txId);if(t)body.customerToken=t;
      init={...init,body:JSON.stringify(body)};
    }
    const res=await rawFetch(input,init);
    if(body.action==='create_ride'){
      const text=await res.text();
      try{const data=JSON.parse(text||'{}');if(res.ok&&data.customerToken)saveCustomerToken(body.txId,data.customerToken)}catch(e){}
      return new Response(text,{status:res.status,statusText:res.statusText,headers:res.headers});
    }
    return res;
  };

  window.vaahakJobAction=async function(jobId,action){
    try{
      const payload={jobId};
      if(action==='start'){
        const otp=String(prompt('Enter the customer 4-digit Ride PIN to start this ride')||'').trim();
        if(!/^\d{4}$/.test(otp))return notify('A valid 4-digit Ride PIN is required.');
        payload.otp=otp;
      }
      await window.DBEST_VAAHAK_LIVE.call(action,payload,{vaahak:true});
      notify(action==='accept'?'Ride accepted.':action==='start'?'Ride started after Ride PIN verification.':action==='complete'?'Ride completed.':'Request skipped.');
      window.vaahakDashboard?.();
    }catch(err){
      if(err.message==='invalid_ride_otp'||err.message==='ride_otp_required')return notify('Ride PIN is incorrect. Please ask the customer for the current Ride PIN.');
      notify(err.message==='ride_already_taken'?'Another Vaahak has already accepted this ride.':'Unable to update ride: '+err.message);
    }
  };

  const oldRideStatus=window.rideStatusScreen;
  let securePoll=null;
  function secureCustomerPoll(txId){
    if(securePoll)clearInterval(securePoll);
    const tick=async()=>{
      const customerToken=getCustomerToken(txId);if(!customerToken)return;
      try{
        const d=await window.DBEST_VAAHAK_LIVE.call('ride_status',{txId:String(txId),customerToken});
        if(!d.job)return;
        let box=document.getElementById('dbestLiveRideStatus');
        if(!box){
          box=document.createElement('div');box.id='dbestLiveRideStatus';
          box.style.cssText='margin:12px 24px;padding:14px;border:1px solid #cfe0ff;border-radius:16px;background:#fff;box-shadow:0 8px 20px rgba(20,60,120,.08)';
          (document.querySelector('.sectionContent')||document.body).prepend(box);
        }
        box.innerHTML=`<b>📡 Live Vaahak Status: ${esc(d.job.status)}</b>${d.partner?`<div style="margin-top:6px">🛵 ${esc(d.partner.name)} • ${esc(d.partner.vehicle)} ${esc(d.partner.vehicle_no||'')} • ⭐ ${esc(d.partner.rating||'')}</div>`:'<div style="margin-top:6px;color:#64748b">Waiting for an online Vaahak to accept this ride…</div>'}${d.job.otp&&['Accepted','Trip Started'].includes(d.job.status)?`<div style="margin-top:8px;font-size:22px;font-weight:900">Ride PIN: ${esc(d.job.otp)}</div>`:''}`;
        if(d.job.status==='Completed'){clearInterval(securePoll);securePoll=null;}
      }catch(e){}
    };
    tick();securePoll=setInterval(tick,3000);
  }
  if(typeof oldRideStatus==='function'){
    window.rideStatusScreen=function(txId){oldRideStatus(txId);setTimeout(()=>secureCustomerPoll(txId),350);};
  }

  window.DBEST_VAAHAK_SECURITY={version:'1.1.0',getCustomerToken};
})();
