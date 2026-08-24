(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabasePublishableKey;
  if(!url||!key)return;

  const OWNER_TOKEN_KEY='dbest_owner_session_token';
  let sending=false,verifying=false;
  async function request(path,body,extraHeaders){
    const r=await fetch(url+path,{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json',...(extraHeaders||{})},body:JSON.stringify(body||{})});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const er=new Error(data.error||data.message||('Request failed '+r.status));er.status=r.status;throw er;}
    return data;
  }
  function saveOwnerToken(token){try{sessionStorage.setItem(OWNER_TOKEN_KEY,String(token||''));}catch(e){}}
  function getOwnerToken(){try{return String(sessionStorage.getItem(OWNER_TOKEN_KEY)||'');}catch(e){return '';}}
  function clearOwnerToken(){try{sessionStorage.removeItem(OWNER_TOKEN_KEY);}catch(e){}}
  function upsertUser(u){try{if(!Array.isArray(users)||!u)return;const i=users.findIndex(x=>String(x.id||'')===String(u.id||''));if(i>=0)users[i]={...users[i],...u};else users.push(u);}catch(e){}}
  async function hydrateOwnerLiveData(){
    const ownerToken=getOwnerToken(); if(!ownerToken)return;
    try{
      const d=await request('/functions/v1/owner-live-network',{}, {'x-dbest-owner-token':ownerToken});
      (d.members||[]).forEach(upsertUser);
      if(Array.isArray(txs)&&Array.isArray(d.transactions)){
        const seen=new Set(txs.map(x=>String(x.id||'')));
        d.transactions.forEach(x=>{if(!seen.has(String(x.id||''))){txs.push(x);seen.add(String(x.id||''));}});
        txs.sort((a,b)=>new Date(b.createdISO||b.created||0)-new Date(a.createdISO||a.created||0));
      }
      if(typeof save==='function')save();
    }catch(e){console.warn('Owner live network hydration failed',e);}
  }
  function openOwnerConsole(){
    session={role:'owner',id:'OWNER'};ownerOpen=true;
    try{if(typeof save==='function')save();}catch(e){}
    try{if(typeof render==='function')render();}catch(e){}
    try{if(typeof owner==='function'){owner();return true;}}catch(e){console.warn('Owner master console open failed',e)}
    try{if(typeof ownerOperations==='function'){ownerOperations();return true;}}catch(e){console.warn('Owner operations open failed',e)}
    try{if(typeof sectionScreen==='function')sectionScreen('<div class="sectionContent"><div class="notice"><b>Owner login verified.</b><br>Owner Console is loading. Please refresh this page once.</div></div>');}catch(e){}
    return false;
  }

  window.ownerGo=async function(e){
    e.preventDefault();
    if(sending)return;
    const email=String(new FormData(e.target).get('u')||'').trim().toLowerCase();
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return toast('Enter the authorized Owner email address');
    sending=true;const btn=e.submitter||e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Sending OTP…'}
    try{
      await request('/functions/v1/send-owner-otp',{email});
      ownerOtpVerify(email);
      toast('Latest 6-digit Owner OTP sent. Use only the newest DBest Owner login email.');
    }catch(err){
      const m=String(err.message||'');
      if(m==='owner_not_authorized')toast('This email is not authorized for Owner access');
      else toast(m==='otp_rate_limited'?'Please wait about a minute before requesting another Owner OTP.':'Owner OTP error: '+m);
    }finally{sending=false;if(btn){btn.disabled=false;btn.textContent='Send Secure OTP'}}
  };

  window.ownerVerifyOtp=async function(e,email){
    e.preventDefault();if(verifying)return;
    const token=String(new FormData(e.target).get('otp')||'').replace(/\D/g,'').slice(0,6);
    if(!/^\d{6}$/.test(token))return toast('Enter the 6-digit OTP from the latest DBest Owner login email');
    verifying=true;const btn=e.submitter||e.target.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Verifying…'}
    let verified=false;
    try{
      const data=await request('/functions/v1/verify-owner-otp',{email:String(email||'').trim().toLowerCase(),code:token});
      if(!data.ok||!data.ownerToken)throw new Error('invalid_or_expired_otp');
      saveOwnerToken(data.ownerToken);verified=true;
      session={role:'owner',id:'OWNER'};ownerOpen=true;
      await hydrateOwnerLiveData();
      openOwnerConsole();
      toast('Owner verified — Owner Console opened');
    }catch(err){
      if(!verified)clearOwnerToken();
      const m=String(err.message||'');
      if(m==='invalid_or_expired_otp')toast('That OTP is not the latest valid code. Request a new OTP and use the newest email only.');
      else toast('Owner verification error: '+m);
    }finally{verifying=false;if(btn){btn.disabled=false;btn.textContent='Verify & Open Owner Console'}}
  };

  const originalApprovePayment=window.approvePayment;
  if(typeof originalApprovePayment==='function'){
    window.approvePayment=async function(id){
      if(!session||session.role!=='owner')return originalApprovePayment(id);
      const ownerToken=getOwnerToken();
      if(!ownerToken){toast('Owner security session expired. Please log in again.');return ownerLogin();}
      const u=typeof users!=='undefined'&&Array.isArray(users)?users.find(x=>String(x.id||'')===String(id||'')):null;
      if(!u)return toast('Member not found');
      try{
        toast('Approving membership and sending Welcome Mail…');
        const data=await request('/functions/v1/approve-member-and-welcome',{memberId:String(id||'')},{'x-dbest-owner-token':ownerToken});
        originalApprovePayment(id);
        await hydrateOwnerLiveData();
        if(data.emailSent)toast('Membership activated. Welcome Mail sent successfully.');
        else if(data.alreadySent)toast('Membership activated. Welcome Mail had already been sent.');
        else toast('Membership activated, but Welcome Mail could not be sent. Please retry later.');
      }catch(err){
        if(/owner_session/i.test(String(err.message||''))){clearOwnerToken();toast('Owner security session expired. Please log in again.');return ownerLogin();}
        if(/member_email_not_verified/i.test(String(err.message||'')))return toast('Cannot approve: member email verification is still pending.');
        toast('Approval could not be completed: '+(err.message||'Unknown error'));
      }
    };
  }

  const originalRemoveMember=window.removeMember;
  if(typeof originalRemoveMember==='function'){
    window.removeMember=async function(id){
      if(!session||session.role!=='owner')return originalRemoveMember(id);
      if(!confirm('Remove this member? The member may register again later with the same email, mobile, PAN and Aadhaar.'))return;
      const ownerToken=getOwnerToken();
      if(!ownerToken){toast('Owner security session expired. Please log in again.');return ownerLogin();}
      try{
        await request('/functions/v1/delete-member',{memberId:String(id||'')},{'x-dbest-owner-token':ownerToken});
        if(typeof users!=='undefined'&&Array.isArray(users))users=users.filter(x=>String(x.id||'')!==String(id||''));
        if(typeof txs!=='undefined'&&Array.isArray(txs))txs=txs.filter(x=>String(x.userId||'')!==String(id||''));
        if(typeof save==='function')save();
        toast('Member deleted. The same person can register again without duplicate conflict.');
        if(typeof ownerMemberOnboarding==='function')ownerMemberOnboarding();
      }catch(err){
        if(/owner_session/i.test(String(err.message||''))){clearOwnerToken();toast('Owner security session expired. Please log in again.');return ownerLogin();}
        toast('Member could not be deleted: '+(err.message||'Unknown error'));
      }
    };
  }

  window.DBEST_OWNER_AUTH_BRIDGE={version:'1.5.0',getOwnerToken,hydrateOwnerLiveData,openOwnerConsole};
})();