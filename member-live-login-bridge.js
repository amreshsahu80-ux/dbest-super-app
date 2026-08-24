(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const H={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  const TOKEN_KEY='dbest_member_live_token';
  const OVERLAY='dbestMemberLoginOtpOverlay';
  async function call(body){
    const r=await fetch(base+'/functions/v1/member-login-live',{method:'POST',headers:H,body:JSON.stringify(body||{})});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const err=new Error(data.error||'member_login_failed');err.status=r.status;throw err}
    if(data.token){try{localStorage.setItem(TOKEN_KEY,String(data.token))}catch(e){}}
    return data;
  }
  const requestOtp=v=>call({action:'request',login:String(v||'').trim()});
  const verifyOtp=(v,code)=>call({action:'verify',login:String(v||'').trim(),code:String(code||'').trim()});
  function mergeUser(u){if(!u)return null;try{if(Array.isArray(users)){const i=users.findIndex(x=>String(x.id||'')===String(u.id||''));if(i>=0)users[i]={...users[i],...u};else users.push(u)}}catch(e){}return u}
  function hydrateNetwork(list){if(!Array.isArray(list))return;list.forEach(mergeUser)}
  function hydrateTransactions(list){if(!Array.isArray(list))return;try{if(!Array.isArray(txs))return;const byId=new Map(txs.map(x=>[String(x.id||''),x]));for(const t of list){const id=String(t.id||'');if(!id)continue;if(byId.has(id))Object.assign(byId.get(id),t);else{txs.push(t);byId.set(id,t)}}txs.sort((a,b)=>new Date(b.createdISO||b.created||0)-new Date(a.createdISO||a.created||0))}catch(e){}}
  function removeOverlay(){document.getElementById(OVERLAY)?.remove()}
  function complete(data){
    const u=mergeUser(data.member);hydrateNetwork(data.branch||data.network||[]);hydrateTransactions(data.transactions||[]);
    if(!u){if(typeof toast==='function')toast('Active approved member not found.');return false}
    session={role:u.tier,id:u.id};u.lastLoginAt=new Date().toLocaleString('en-IN');if(typeof save==='function')save();if(typeof render==='function')render();if(typeof memberDash==='function')memberDash(u.id);if(typeof toast==='function')toast('Secure login successful — live hierarchy loaded');return true;
  }
  function showOtp(login,masked){
    removeOverlay();
    const wrap=document.createElement('div');wrap.id=OVERLAY;wrap.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(10,20,40,.70);display:grid;place-items:center;padding:18px;overflow:auto';
    wrap.innerHTML=`<div style="max-width:430px;width:100%;background:#fff;border-radius:20px;padding:22px;font-family:Inter,system-ui,Arial;box-shadow:0 25px 70px rgba(0,0,0,.30)"><h2 style="margin:0 0 8px;color:#13213a">Secure DBest Login</h2><p style="margin:0 0 16px;color:#687386;line-height:1.5">A 6-digit login OTP has been sent to <b>${String(masked||'your registered email')}</b>. Enter it to access your account, hierarchy and transactions.</p><input id="dbestMemberLoginOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Enter 6-digit OTP" style="box-sizing:border-box;width:100%;padding:13px;border:1px solid #dfe6f0;border-radius:12px;font-size:18px;letter-spacing:4px;text-align:center"><button id="dbestMemberVerifyLogin" style="width:100%;margin-top:12px;border:0;border-radius:12px;padding:12px;background:#175cff;color:#fff;font-weight:800">Verify & Login</button><button id="dbestMemberResendLogin" style="width:100%;margin-top:8px;border:0;border-radius:12px;padding:11px;background:#edf3ff;color:#175cff;font-weight:800">Resend OTP</button><button id="dbestMemberCancelLogin" style="width:100%;margin-top:8px;border:0;border-radius:12px;padding:10px;background:#f5f6f8;color:#52627a;font-weight:800">Cancel</button><div id="dbestMemberLoginMsg" style="margin-top:10px;font-size:13px;color:#687386;line-height:1.45"></div></div>`;
    document.body.appendChild(wrap);const msg=wrap.querySelector('#dbestMemberLoginMsg');
    wrap.querySelector('#dbestMemberCancelLogin').onclick=removeOverlay;
    wrap.querySelector('#dbestMemberResendLogin').onclick=async()=>{try{msg.style.color='#687386';msg.textContent='Sending a new OTP…';const d=await requestOtp(login);msg.style.color='#15803d';msg.textContent='New OTP sent to '+(d.maskedEmail||masked||'your registered email')+'.'}catch(err){msg.style.color='#b91c1c';msg.textContent=err.message==='otp_rate_limited'?'Please wait about a minute before requesting another OTP.':'OTP could not be sent. Please retry.'}};
    const verify=async()=>{const code=String(wrap.querySelector('#dbestMemberLoginOtp').value||'').replace(/\D/g,'');if(!/^\d{6}$/.test(code)){msg.style.color='#b91c1c';msg.textContent='Enter the 6-digit OTP.';return}const btn=wrap.querySelector('#dbestMemberVerifyLogin');btn.disabled=true;btn.textContent='Verifying…';try{const data=await verifyOtp(login,code);if(complete(data))removeOverlay()}catch(err){msg.style.color='#b91c1c';msg.textContent=err.status===401?'Invalid or expired OTP. Please try again.':'Login verification could not complete. Please retry.'}finally{btn.disabled=false;btn.textContent='Verify & Login'}};
    wrap.querySelector('#dbestMemberVerifyLogin').onclick=verify;wrap.querySelector('#dbestMemberLoginOtp').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verify()}});setTimeout(()=>wrap.querySelector('#dbestMemberLoginOtp')?.focus(),80);
  }
  window.DBEST_MEMBER_LIVE={getToken:()=>{try{return localStorage.getItem(TOKEN_KEY)||''}catch(e){return''}},clear:()=>{try{localStorage.removeItem(TOKEN_KEY)}catch(e){}},requestOtp,verifyOtp};
  window.memberGo=async function(e){
    e.preventDefault();const form=e.target,btn=form.querySelector('button');if(btn){btn.disabled=true;btn.textContent='Sending OTP…'}
    try{const v=String(new FormData(form).get('id')||'').trim();const data=await requestOtp(v);showOtp(v,data.maskedEmail);if(typeof toast==='function')toast('Login OTP sent to your registered email');}
    catch(err){console.error('DBest secure member login',err);if(typeof toast==='function')toast(err.status===404?'Active approved member not found.':err.message==='otp_rate_limited'?'Please wait about a minute before requesting another OTP.':'Login OTP could not be sent. Please retry.')}
    finally{if(btn){btn.disabled=false;btn.textContent='Login'}}
  };
})();