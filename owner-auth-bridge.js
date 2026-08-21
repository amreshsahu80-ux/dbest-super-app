(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabasePublishableKey;
  const ownerEmail=String(cfg.ownerEmail||'').trim().toLowerCase();
  if(!url||!key||!ownerEmail)return;

  async function request(path,body){
    const r=await fetch(url+path,{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok)throw new Error(data.error||data.message||('Request failed '+r.status));
    return data;
  }

  window.ownerGo=async function(e){
    e.preventDefault();
    const email=String(new FormData(e.target).get('u')||'').trim().toLowerCase();
    if(email!==ownerEmail)return toast('This email is not authorized as Project Owner');
    try{
      await request('/functions/v1/send-owner-otp',{email});
      ownerOtpVerify(email);
      toast('6-digit Owner OTP sent from DBest');
    }catch(err){
      toast(err.message==='otp_rate_limited'?'Please wait about a minute before requesting another Owner OTP.':'Owner OTP error: '+err.message);
    }
  };

  window.ownerVerifyOtp=async function(e,email){
    e.preventDefault();
    const token=String(new FormData(e.target).get('otp')||'').trim();
    if(!/^\d{6}$/.test(token))return toast('Enter the 6-digit OTP');
    try{
      const data=await request('/functions/v1/verify-owner-otp',{email:String(email||'').trim().toLowerCase(),code:token});
      if(!data.ok)throw new Error('Invalid or expired OTP');
      session={role:'owner',id:'OWNER'};
      ownerOpen=true;
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      owner();
      toast('Owner verified successfully');
    }catch(err){
      toast('OTP verification failed: '+(err.message||'Invalid or expired OTP'));
    }
  };

  window.DBEST_OWNER_AUTH_BRIDGE={version:'1.0.0'};
})();
