(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabasePublishableKey;
  if(!url||!key){console.warn('DBest backend bridge: Supabase config missing');return;}

  const baseHeaders={
    'apikey':key,
    'Authorization':'Bearer '+key,
    'Content-Type':'application/json'
  };

  async function request(path,opts={}){
    const headers={...baseHeaders,...(opts.headers||{})};
    if(path.startsWith('/rest/v1/'))headers['Prefer']='return=minimal';
    const r=await fetch(url+path,{...opts,headers});
    let data={};
    try{data=await r.json()}catch(e){}
    if(!r.ok)throw new Error(data.message||data.msg||data.error||data.error_description||data.hint||('Request failed '+r.status));
    return data;
  }

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  const PENDING_KEY='dbest_pending_email_verify';

  function setPending(email,memberId){
    try{localStorage.setItem(PENDING_KEY,JSON.stringify({email,memberId:String(memberId||'')}));}catch(e){}
  }
  function clearPending(){try{localStorage.removeItem(PENDING_KEY);}catch(e){}}
  function getPending(){
    try{const x=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');return x&&x.email?x:null;}catch(e){return null;}
  }

  async function findCreatedMember(email,mobile,tier){
    for(let i=0;i<25;i++){
      try{
        if(typeof users!=='undefined'&&Array.isArray(users)){
          const u=[...users].reverse().find(x=>String(x.email||'').toLowerCase()===email&&String(x.mobile||'')===mobile&&String(x.tier||'')===tier);
          if(u)return u;
        }
      }catch(e){}
      await sleep(200);
    }
    return null;
  }

  async function syncMemberRegistration(form,tier){
    const f=new FormData(form);
    const email=String(f.get('email')||'').trim().toLowerCase();
    const mobile=String(f.get('mobile')||'').trim();
    const name=String(f.get('name')||'').trim();
    const city=String(f.get('city')||'').trim();
    const upline=String(f.get('up')||'').trim().toUpperCase();
    if(!email||!mobile||!name)return null;

    const member=await findCreatedMember(email,mobile,tier);
    if(!member){console.warn('DBest backend bridge: member created locally but not found for sync');return null;}

    const amount=Number(member.paidAmount??(typeof tiers!=='undefined'&&tiers[tier]?tiers[tier].price:0))||0;
    const payload={city,upline:upline||member.upline||'',referral_code:member.ref||'',kyc_status:member.kyc||'Pending',card_issued:!!member.card,source:'dbest-super-app',integration_branch:cfg.integrationBranch||''};

    try{
      await request('/rest/v1/onboarding_records',{method:'POST',body:JSON.stringify({kind:'member',external_id:String(member.id||''),name:String(member.name||name),email,mobile,category:tier,status:String(member.status||'Pending'),payment_status:String(member.paymentStatus||'Pending Verification'),payment_amount:amount,payment_ref:String(member.paymentRef||''),payload,email_verified:false})});
    }catch(err){
      if(!/duplicate|unique/i.test(err.message))throw err;
    }

    return {member,email};
  }

  async function sendEmailOtp(email){
    return request('/functions/v1/send-member-otp',{method:'POST',body:JSON.stringify({email})});
  }

  async function verifyEmailOtp(email,code){
    return request('/functions/v1/verify-member-otp',{method:'POST',body:JSON.stringify({email,code})});
  }

  function removeVerifier(){const x=document.getElementById('dbestEmailVerifyOverlay');if(x)x.remove();}

  function showVerifier(email,memberId,initialMessage){
    removeVerifier();
    setPending(email,memberId);
    const wrap=document.createElement('div');
    wrap.id='dbestEmailVerifyOverlay';
    wrap.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(10,20,40,.68);display:grid;place-items:center;padding:18px;overflow:auto';
    wrap.innerHTML=`<div style="max-width:430px;width:100%;background:#fff;border-radius:20px;padding:22px;font-family:Inter,system-ui,Arial;box-shadow:0 25px 70px rgba(0,0,0,.28)">
      <h2 style="margin:0 0 8px;color:#13213a">Verify your email</h2>
      <p style="margin:0 0 16px;color:#687386;line-height:1.5">Email verification is required before you continue. A 6-digit code will be sent to <b>${email}</b>.</p>
      <input id="dbestEmailOtp" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit OTP" style="box-sizing:border-box;width:100%;padding:13px;border:1px solid #dfe6f0;border-radius:12px;font-size:18px;letter-spacing:4px;text-align:center">
      <button id="dbestVerifyBtn" style="width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px;background:#175cff;color:#fff;font-weight:800">Verify Email</button>
      <button id="dbestResendBtn" style="width:100%;margin-top:8px;border:0;border-radius:12px;padding:11px;background:#edf3ff;color:#175cff;font-weight:800">Resend OTP</button>
      <div id="dbestVerifyMsg" style="margin-top:10px;font-size:13px;color:#687386;line-height:1.45"></div>
    </div>`;
    document.body.appendChild(wrap);

    const msg=wrap.querySelector('#dbestVerifyMsg');
    if(initialMessage)msg.textContent=initialMessage;
    wrap.querySelector('#dbestResendBtn').onclick=async()=>{
      try{
        msg.style.color='#687386';msg.textContent='Sending a new OTP…';
        await sendEmailOtp(email);
        msg.style.color='#15803d';msg.textContent='New OTP sent from DBest. Please check Inbox and Spam.';
      }catch(e){
        msg.style.color='#b91c1c';
        msg.textContent=e.message==='otp_rate_limited'?'Please wait about a minute before requesting another OTP.':('OTP could not be sent: '+e.message);
      }
    };
    wrap.querySelector('#dbestVerifyBtn').onclick=async()=>{
      const token=String(wrap.querySelector('#dbestEmailOtp').value||'').trim();
      if(!/^\d{6}$/.test(token)){msg.style.color='#b91c1c';msg.textContent='Please enter the 6-digit OTP.';return;}
      try{
        msg.style.color='#687386';msg.textContent='Verifying…';
        const data=await verifyEmailOtp(email,token);
        if(!data.ok)throw new Error('Invalid or expired OTP');
        try{
          if(typeof users!=='undefined'&&Array.isArray(users)){
            const u=users.find(x=>String(x.id||'')===String(memberId||''));
            if(u){u.emailVerified=true;u.emailVerifiedAt=new Date().toISOString();if(typeof save==='function')save();}
          }
        }catch(e){}
        clearPending();
        msg.style.color='#15803d';msg.textContent='Email verified successfully. You can now continue.';
        setTimeout(removeVerifier,900);
      }catch(e){msg.style.color='#b91c1c';msg.textContent=(/400|invalid|verification/i.test(e.message)?'Invalid or expired OTP. Please try again.':e.message);}
    };
  }

  async function handleRegistration(form,tier){
    const synced=await syncMemberRegistration(form,tier);
    if(!synced)return;
    showVerifier(synced.email,synced.member.id,'Sending your verification code…');
    const msg=document.getElementById('dbestVerifyMsg');
    try{
      await sendEmailOtp(synced.email);
      if(msg){msg.style.color='#15803d';msg.textContent='OTP sent from DBest. Please check Inbox and Spam.';}
    }catch(err){
      console.warn('DBest email OTP:',err.message);
      if(msg){msg.style.color='#b91c1c';msg.textContent='OTP could not be sent. Tap Resend OTP to try again.';}
    }
  }

  document.addEventListener('submit',function(ev){
    try{
      const form=ev.target;
      if(!(form instanceof HTMLFormElement))return;
      const attr=form.getAttribute('onsubmit')||'';
      const m=attr.match(/regGo\(event,'([^']+)'\)/);
      if(!m)return;
      const tier=m[1];
      setTimeout(()=>handleRegistration(form,tier).catch(err=>console.warn('DBest registration backend:',err.message)),0);
    }catch(err){console.warn('DBest backend bridge:',err);}
  },true);

  function restorePendingGate(){
    const p=getPending();
    if(!p)return;
    setTimeout(()=>showVerifier(String(p.email),String(p.memberId||''),'Email verification is still pending. Tap Resend OTP if you need a new code.'),700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restorePendingGate,{once:true});else restorePendingGate();

  window.DBEST_BACKEND_BRIDGE={version:'1.3.0',syncMemberRegistration,sendEmailOtp,verifyEmailOtp,showVerifier};
})();
