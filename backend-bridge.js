(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabasePublishableKey;
  if(!url||!key){console.warn('DBest backend bridge: Supabase config missing');return;}

  const anonHeaders={
    'apikey':key,
    'Authorization':'Bearer '+key,
    'Content-Type':'application/json',
    'Prefer':'return=minimal'
  };

  async function request(path,opts={}){
    const r=await fetch(url+path,{...opts,headers:{...anonHeaders,...(opts.headers||{})}});
    let data={};
    try{data=await r.json()}catch(e){}
    if(!r.ok)throw new Error(data.message||data.msg||data.error_description||data.hint||('Request failed '+r.status));
    return data;
  }

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

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
    await request('/auth/v1/otp',{method:'POST',body:JSON.stringify({email,create_user:true})});
  }

  function removeVerifier(){const x=document.getElementById('dbestEmailVerifyOverlay');if(x)x.remove();}

  function showVerifier(email,memberId){
    removeVerifier();
    const wrap=document.createElement('div');
    wrap.id='dbestEmailVerifyOverlay';
    wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,20,40,.58);display:grid;place-items:center;padding:18px';
    wrap.innerHTML=`<div style="max-width:430px;width:100%;background:#fff;border-radius:20px;padding:22px;font-family:Inter,system-ui,Arial;box-shadow:0 25px 70px rgba(0,0,0,.25)">
      <h2 style="margin:0 0 8px;color:#13213a">Verify your email</h2>
      <p style="margin:0 0 16px;color:#687386;line-height:1.5">A 6-digit verification code has been sent to <b>${email}</b>.</p>
      <input id="dbestEmailOtp" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit OTP" style="width:100%;padding:13px;border:1px solid #dfe6f0;border-radius:12px;font-size:18px;letter-spacing:4px;text-align:center">
      <button id="dbestVerifyBtn" style="width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px;background:#175cff;color:#fff;font-weight:800">Verify Email</button>
      <button id="dbestResendBtn" style="width:100%;margin-top:8px;border:0;border-radius:12px;padding:11px;background:#edf3ff;color:#175cff;font-weight:800">Resend OTP</button>
      <button id="dbestLaterBtn" style="width:100%;margin-top:8px;border:0;background:transparent;padding:9px;color:#687386">Verify later</button>
      <div id="dbestVerifyMsg" style="margin-top:10px;font-size:13px;color:#687386"></div>
    </div>`;
    document.body.appendChild(wrap);

    const msg=wrap.querySelector('#dbestVerifyMsg');
    wrap.querySelector('#dbestLaterBtn').onclick=removeVerifier;
    wrap.querySelector('#dbestResendBtn').onclick=async()=>{try{msg.textContent='Sending a new OTP…';await sendEmailOtp(email);msg.textContent='New OTP sent.';}catch(e){msg.textContent=e.message;}};
    wrap.querySelector('#dbestVerifyBtn').onclick=async()=>{
      const token=String(wrap.querySelector('#dbestEmailOtp').value||'').trim();
      if(!/^\d{6}$/.test(token)){msg.textContent='Please enter the 6-digit OTP.';return;}
      try{
        msg.textContent='Verifying…';
        const data=await request('/auth/v1/verify',{method:'POST',body:JSON.stringify({email,token,type:'email'})});
        const access=data.access_token;
        if(!access)throw new Error('Verification succeeded but no session was returned');
        await request('/rest/v1/rpc/mark_member_email_verified',{method:'POST',headers:{'Authorization':'Bearer '+access},body:'{}'});
        try{
          if(typeof users!=='undefined'&&Array.isArray(users)){
            const u=users.find(x=>String(x.id||'')===String(memberId||''));
            if(u){u.emailVerified=true;u.emailVerifiedAt=new Date().toISOString();if(typeof save==='function')save();}
          }
        }catch(e){}
        msg.style.color='#15803d';msg.textContent='Email verified successfully.';
        setTimeout(removeVerifier,900);
      }catch(e){msg.style.color='#b91c1c';msg.textContent=e.message;}
    };
  }

  async function handleRegistration(form,tier){
    const synced=await syncMemberRegistration(form,tier);
    if(!synced)return;
    try{
      await sendEmailOtp(synced.email);
      showVerifier(synced.email,synced.member.id);
    }catch(err){
      console.warn('DBest email OTP:',err.message);
      if(typeof toast==='function')toast('Registration saved. Email verification could not be sent yet.');
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

  window.DBEST_BACKEND_BRIDGE={version:'1.1.0',syncMemberRegistration,sendEmailOtp,showVerifier};
})();
