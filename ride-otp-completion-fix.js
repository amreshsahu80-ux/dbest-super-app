(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const api=base+'/functions/v1/vaahak-live';
  const tk='dbest_vaahak_live_token';
  const notify=(m,ok=true)=>{try{if(typeof note==='function')return note(m,ok);if(typeof toast==='function')return toast(m);alert(m)}catch(e){alert(m)}};
  async function apiCall(action,body={},vaahak=false){
    const h={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
    if(vaahak){const t=localStorage.getItem(tk)||'';if(t)h['x-vaahak-token']=t;}
    const r=await fetch(api,{method:'POST',headers:h,body:JSON.stringify({action,...body})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.error||'request_failed');e.status=r.status;throw e}return d;
  }

  if(!window.__DBEST_RIDE_META_FETCH_PATCH__){
    window.__DBEST_RIDE_META_FETCH_PATCH__=true;
    const raw=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:String(input&&input.url||'');
      if(url.startsWith(api)&&init&&String(init.method||'GET').toUpperCase()==='POST'){
        try{
          const b=JSON.parse(String(init.body||'{}'));
          if(b.action==='create_ride'){
            let u=null;
            try{
              if(typeof session!=='undefined'&&session?.id&&typeof users!=='undefined'&&Array.isArray(users))u=users.find(x=>String(x.id)===String(session.id))||null;
              if(!u&&typeof users!=='undefined'&&Array.isArray(users)&&b.customerMobile)u=users.find(x=>String(x.mobile||'').replace(/\D/g,'').slice(-10)===String(b.customerMobile||'').replace(/\D/g,'').slice(-10))||null;
            }catch(e){}
            if(!b.customerMemberId&&u?.id)b.customerMemberId=String(u.id);
            if(!b.customerEmail&&u?.email)b.customerEmail=String(u.email);
            init={...init,body:JSON.stringify(b)};
          }
        }catch(e){}
      }
      return raw(input,init);
    };
  }

  function install(){
    window.startWithOtp=async function(id){
      const el=document.getElementById('rideOtp')||document.getElementById('otp_'+id);
      const otp=String(el?.value||'').replace(/\D/g,'').slice(0,4);
      if(!/^\d{4}$/.test(otp))return notify('Enter the 4-digit customer Ride OTP.',false);
      try{
        const d=await apiCall('start',{jobId:id,otp},true);
        if(!d.otpVerified)throw new Error('otp_not_verified');
        notify('OTP verified successfully. Ride started.');
        if(typeof loadStatus==='function')loadStatus();
        if(typeof window.vaahakDashboard==='function')window.vaahakDashboard();
      }catch(e){
        if(e.message==='invalid_ride_otp')return notify('OTP does not match this ride. Ask the customer for the OTP shown for this Ride ID.',false);
        if(e.message==='ride_not_ready_to_start')return notify('This ride is no longer in Accepted status. Refresh the dashboard.',false);
        notify('Ride could not start: '+e.message,false);
      }
    };

    window.vaahakJobAction=async function(jobId,action){
      try{
        const payload={jobId};
        if(action==='start'){
          const otp=String(prompt('Enter the customer 4-digit Ride OTP for '+jobId)||'').replace(/\D/g,'').slice(0,4);
          if(!/^\d{4}$/.test(otp))return notify('A valid 4-digit Ride OTP is required.',false);
          payload.otp=otp;
        }
        const d=await apiCall(action,payload,true);
        if(action==='start'&&!d.otpVerified)return notify('OTP verification failed.',false);
        if(action==='complete'){
          const mail=d.email||{};
          notify(mail.sent?'Ride completed. Completion voucher email sent to the customer.':'Ride completed. Voucher email could not be confirmed; it is recorded for follow-up.');
        }else notify(action==='accept'?'Ride accepted.':action==='start'?'OTP verified. Ride started.':'Ride updated.');
        if(typeof window.vaahakDashboard==='function')window.vaahakDashboard();
        if(typeof loadStatus==='function')loadStatus();
      }catch(e){
        if(e.message==='invalid_ride_otp')return notify('OTP does not match this ride. Ask the customer for the OTP shown for this Ride ID.',false);
        notify('Unable to update ride: '+e.message,false);
      }
    };
  }
  [0,400,1200,2500].forEach(ms=>setTimeout(install,ms));
})();