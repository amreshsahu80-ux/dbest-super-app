(function(){
'use strict';
const VERSION='1.1.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const OTP_API=BASE+'/functions/v1/vendor-agreement-otp';
const BRIDGE=BASE+'/functions/v1/marketplace-vendor-legacy-bridge';
const VENDOR_API=BASE+'/functions/v1/vendor-growth-live';
const oldSend=window.sendPartnerOtp;
const oldVerify=window.verifyPartnerOtp;
const oldScreen=window.vendorAgreementScreen;
const STORE_PREFIX='dbest_vendor_agreement_otp_';
const VTK='dbest_vendor_live_token';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>String(v??'').trim();
function getVendor(id){try{return (commerceConfig?.vendors||[]).find(v=>String(v.id||'')===String(id||''))||null}catch(e){return null}}
function vendorToken(){try{return localStorage.getItem(VTK)||''}catch(e){return''}}
function toast2(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
function getState(id){try{return JSON.parse(sessionStorage.getItem(STORE_PREFIX+id)||'null')}catch(e){return null}}
function setState(id,v){try{if(v)sessionStorage.setItem(STORE_PREFIX+id,JSON.stringify(v));else sessionStorage.removeItem(STORE_PREFIX+id)}catch(e){}}
function currentVersion(){try{return String(partnerAgreementConfig?.version||'')}catch(e){return''}}
async function post(url,action,body={},extraHeaders={}){
  if(!BASE||!KEY) throw new Error('Email service configuration is unavailable.');
  const r=await fetch(url,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...extraHeaders},body:JSON.stringify({action,...body})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(String(d.error||'request_failed'));e.data=d;e.status=r.status;throw e}return d;
}
async function hydrateVendor(id){
  const v=getVendor(id); if(!v) return null;
  const t=vendorToken();
  if(!t) return v;
  try{
    const d=await post(VENDOR_API,'vendor_dashboard',{}, {'x-vendor-token':t});
    const live=d?.vendor;
    if(live&&String(live.id||'')===String(id||'')){
      v.email=text(live.email)||v.email||'';
      v.mobile=text(live.mobile)||v.mobile||'';
      v.ownerName=text(live.owner_name)||v.ownerName||'';
      v.name=text(live.name)||v.name||'';
      v.address=text(live.address)||v.address||'';
      v.city=text(live.city)||v.city||'';
      v.pincode=text(live.pincode)||v.pincode||'';
      v.ownerApproval=text(live.owner_approval)||v.ownerApproval||'';
      v.active=live.active!==undefined?!!live.active:v.active;
      try{typeof save==='function'&&save()}catch(e){}
    }
  }catch(e){console.warn('DBest vendor email hydrate',e)}
  return v;
}
async function ensureRegistration(v){
  if(!v?.id||!v?.email) throw new Error('vendor_email_missing');
  // Existing live vendors are already registered. Legacy sync is only needed when the original PIN is available.
  if(!v.pin) return;
  await post(BRIDGE,'sync_registration',{
    id:v.id,name:v.name,ownerName:v.ownerName,type:v.type,mobile:v.mobile,email:v.email,pin:v.pin,
    address:v.address||[v.name,v.city].filter(Boolean).join(', '),city:v.city||'',pincode:v.pincode||'',
    agreementStatus:v.agreement?.status||'Unsigned',
    profileMeta:{pan:v.pan||'',gstin:v.gstin||'',establishmentNo:v.establishmentNo||'',sectorLicence:v.sectorLicence||'',bank:v.bank||'',ifsc:v.ifsc||'',accountHolder:v.accountHolder||'',documents:v.documents||{},registrationStatus:v.registrationStatus||''}
  });
}
function friendly(err){
  const k=String(err?.message||err||'');
  if(k==='otp_rate_limited') return 'OTP was just sent. Please wait a few seconds before requesting another.';
  if(k==='email_send_failed') return 'OTP email could not be sent. Please try again.';
  if(k==='email_service_unavailable') return 'Email service is temporarily unavailable. Please try again shortly.';
  if(k==='vendor_email_missing'||k==='Vendor registration details are incomplete.') return 'Registered Vendor email could not be loaded. Please logout and login again, then retry.';
  if(k==='vendor_email_mismatch') return 'The registered vendor email does not match. Please contact DBest support.';
  if(k==='incorrect_otp') return 'Incorrect OTP. Please check the email and try again.';
  if(k==='otp_expired') return 'This OTP has expired. Please request a new OTP.';
  if(k==='otp_not_requested') return 'Please send an OTP first.';
  if(k==='otp_attempts_exceeded') return 'Too many incorrect attempts. Please request a new OTP.';
  if(k==='invalid_otp_format') return 'Please enter the 6-digit OTP sent to your email.';
  if(k==='vendor_not_found') return 'Vendor registration is still syncing. Please try Send OTP again.';
  return 'Vendor agreement OTP failed. Please try again.';
}
function paintEmail(v){
  const sel=document.getElementById('vendorPartnerChannel');
  if(!sel) return null;
  const email=text(v?.email);
  sel.innerHTML=`<option value="email">${email?'Email — '+esc(email):'Email'}</option>`;
  sel.value='email';sel.disabled=false;
  const card=sel.closest?.('.signCard')||document.querySelector('.signGrid .signCard');
  if(card){
    let line=document.getElementById('dbestVendorRegisteredEmail');
    if(!line){line=document.createElement('div');line.id='dbestVendorRegisteredEmail';line.style.cssText='margin:8px 0 4px;padding:9px 11px;border-radius:10px;background:#eef4ff;color:#173f83;font-size:13px;line-height:1.35';sel.parentElement?.appendChild(line)}
    line.innerHTML=email?`✉️ OTP will be sent to registered email: <b>${esc(email)}</b>`:'✉️ Loading registered Vendor email…';
  }
  return card;
}
async function decorateScreen(id){
  setTimeout(async()=>{
    let v=getVendor(id); if(!v) return;
    paintEmail(v);
    v=await hydrateVendor(id)||v;
    const firstSign=paintEmail(v);
    document.querySelectorAll('.demoOtp').forEach(x=>x.remove());
    const input=document.getElementById('partnerOtp_vendor_'+id);
    const state=getState(id);
    if(state&&firstSign&&!input&&!v.agreement?.partnerSigned){
      const old=document.getElementById('dbestLiveVendorOtpBox');if(old)old.remove();
      const box=document.createElement('div');
      box.id='dbestLiveVendorOtpBox';
      box.innerHTML=`<div class="notice" style="margin-top:10px">✉️ OTP sent to <b>${esc(state.maskedEmail||v.email||'your registered email')}</b>. It is valid for 10 minutes.</div><div class="otpBox2"><input id="partnerOtp_vendor_${esc(id)}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Enter 6-digit email OTP"><button class="btn" onclick="verifyPartnerOtp('vendor','${esc(id)}','partner')">Verify & Sign Agreement</button></div>`;
      firstSign.appendChild(box);
    }
  },30);
}
if(typeof oldScreen==='function') window.vendorAgreementScreen=function(id){const r=oldScreen.apply(this,arguments);decorateScreen(id);return r};

window.sendPartnerOtp=async function(kind,id,who,channel){
  if(kind!=='vendor'||who!=='partner') return typeof oldSend==='function'?oldSend.apply(this,arguments):undefined;
  let v=getVendor(id); if(!v) return toast2('Vendor registration not found.');
  const btn=document.activeElement instanceof HTMLButtonElement?document.activeElement:null;
  if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent||'';btn.textContent='Sending OTP…'}
  try{
    v=await hydrateVendor(id)||v;
    paintEmail(v);
    await ensureRegistration(v);
    const d=await post(OTP_API,'send',{vendorId:v.id,email:v.email});
    setState(v.id,{sentAt:Date.now(),maskedEmail:d.maskedEmail||v.email});
    toast2('OTP sent to '+(d.maskedEmail||v.email||'the registered vendor email')+'.');
    window.vendorAgreementScreen(v.id);
  }catch(e){console.warn('DBest vendor agreement OTP send',e);toast2(friendly(e))}
  finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Send OTP'}}
};

window.verifyPartnerOtp=async function(kind,id,who){
  if(kind!=='vendor'||who!=='partner') return typeof oldVerify==='function'?oldVerify.apply(this,arguments):undefined;
  let v=getVendor(id); if(!v) return toast2('Vendor registration not found.');
  const el=document.getElementById('partnerOtp_vendor_'+id);
  const code=String(el?.value||'').trim();
  if(!/^\d{6}$/.test(code)) return toast2('Please enter the 6-digit OTP sent to your email.');
  const btn=document.activeElement instanceof HTMLButtonElement?document.activeElement:null;
  if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent||'';btn.textContent='Verifying…'}
  try{
    v=await hydrateVendor(id)||v;
    if(!v.email) throw new Error('vendor_email_missing');
    const d=await post(OTP_API,'verify',{vendorId:v.id,email:v.email,code,version:currentVersion()});
    v.agreement=v.agreement||{version:currentVersion()};
    v.agreement.partnerSigned=true;
    v.agreement.partnerSignedAt=d.signedAt||new Date().toISOString();
    v.agreement.partnerChannel='email';
    v.agreement.status=v.agreement.ownerSigned?'Fully Signed':'Partially Signed';
    try{typeof save==='function'&&save()}catch(e){}
    setState(v.id,null);
    toast2('Vendor agreement signed successfully with email OTP.');
    window.vendorAgreementScreen(v.id);
  }catch(e){console.warn('DBest vendor agreement OTP verify',e);toast2(friendly(e))}
  finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Verify & Sign Agreement'}}
};

try{const existingId=window.vendorSession?.vendorId;if(existingId)decorateScreen(existingId)}catch(e){}
window.DBEST_VENDOR_AGREEMENT_EMAIL_OTP={version:VERSION,send:window.sendPartnerOtp,verify:window.verifyPartnerOtp,hydrateVendor,decorateScreen};
})();