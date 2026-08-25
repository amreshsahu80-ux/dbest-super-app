(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const OTP_API=BASE+'/functions/v1/vaahak-agreement-otp';
const LIVE_API=BASE+'/functions/v1/vaahak-live';
const STORE='dbest_vaahak_agreement_pending_v1';
const OTP_STORE='dbest_vaahak_agreement_otp_';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
function getPending(){try{return JSON.parse(sessionStorage.getItem(STORE)||'null')}catch(e){return null}}
function setPending(v){try{v?sessionStorage.setItem(STORE,JSON.stringify(v)):sessionStorage.removeItem(STORE)}catch(e){}}
function getOtpState(id){try{return JSON.parse(sessionStorage.getItem(OTP_STORE+id)||'null')}catch(e){return null}}
function setOtpState(id,v){try{v?sessionStorage.setItem(OTP_STORE+id,JSON.stringify(v)):sessionStorage.removeItem(OTP_STORE+id)}catch(e){}}
async function post(url,action,body={}){
  if(!BASE||!KEY) throw new Error('email_service_unavailable');
  const r=await fetch(url,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({action,...body})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(String(d.error||'request_failed'));e.data=d;e.status=r.status;throw e}return d;
}
function friendly(e){const k=String(e?.message||e||'');return ({
  otp_rate_limited:'OTP was just sent. Please wait a few seconds before requesting another.',
  email_send_failed:'OTP email could not be sent. Please try again.',
  email_service_unavailable:'Email service is temporarily unavailable. Please try again shortly.',
  vaahak_email_missing:'A valid email is required for Vaahak agreement signing.',
  vaahak_email_mismatch:'The email does not match the registered Vaahak email.',
  incorrect_otp:'Incorrect OTP. Please check your email and try again.',
  otp_expired:'This OTP has expired. Please request a new OTP.',
  otp_not_requested:'Please send an OTP first.',
  otp_attempts_exceeded:'Too many incorrect attempts. Please request a new OTP.',
  invalid_otp_format:'Please enter the 6-digit OTP sent to your email.',
  vaahak_not_found:'Vaahak registration could not be found. Please register again.',
  mobile_already_registered:'This mobile number is already registered as a Vaahak.'
})[k]||('Vaahak agreement OTP failed: '+k)}
function agreementBody(p){return `<div style="line-height:1.55;color:#23344f">
<h2 style="margin:0 0 5px">DBest Vaahak Ride & Delivery Partner Agreement</h2>
<p style="margin:0 0 14px;color:#66758a"><b>Vaahak:</b> ${esc(p.name||'Partner')} &nbsp; <b>ID:</b> ${esc(p.id||'')}</p>
<h3>1. Services</h3><p>Vaahak may accept authorised ride and/or delivery jobs through the DBest platform based on eligibility, availability and document verification.</p>
<h3>2. Earnings & Settlement</h3><p>Earnings, payout percentages/amounts and settlement cycles are governed by the terms configured by DBest for eligible completed jobs.</p>
<h3>3. Vehicle & Licence Compliance</h3><p>Vaahak must maintain valid driving licence, RC, insurance, PUC, fitness/permit where applicable, and genuine current documents.</p>
<h3>4. Safety & Conduct</h3><p>Vaahak must follow traffic and safety laws, customer-conduct standards, OTP completion controls and must not engage in fraud, harassment or unauthorised collection.</p>
<h3>5. Location & Job Data</h3><p>While available or on a job, location and job-status information may be processed for dispatch, navigation, safety and audit purposes.</p>
<h3>6. Payment Handling</h3><p>Cash/UPI collected for authorised jobs must be handled and reconciled under DBest payment conditions. Vaahak must not alter customer pricing.</p>
<h3>7. Cancellations & Complaints</h3><p>Repeated avoidable cancellations, false completion, complaints or safety breaches may lead to suspension, investigation or payout hold.</p>
<h3>8. Relationship</h3><p>This agreement records platform service terms and does not by itself determine employment status; applicable law and the actual relationship prevail.</p>
<h3>9. Electronic Acceptance</h3><p>By verifying the email OTP, the Vaahak consents to electronic records, OTP acceptance logs, timestamps and audit trails for this agreement.</p>
<h3>10. Governing Law</h3><p>Indian law applies, subject to mandatory applicable law and the jurisdiction terms configured by DBest.</p></div>`}
function signedBlock(p){return `<div style="padding:14px;border-radius:14px;background:#e9f8ef;border:1px solid #bfe6cd;color:#17613b"><b>✓ Vaahak Agreement Signed</b><div style="margin-top:5px;font-size:12px">Email verified successfully. Owner approval/KYC can now continue.</div></div><button class="btn" style="margin-top:12px" onclick="DBEST_VAAHAK_AGREEMENT_EMAIL_OTP.continueLogin()">Continue to Vaahak Login</button>`}
function controls(p){const state=getOtpState(p.id);if(p.signed)return signedBlock(p);return `<div style="margin-top:16px;padding:14px;border:1px solid #dbe5f3;border-radius:14px;background:#f8fbff"><b>Email OTP Signature</b><div style="margin:5px 0 10px;color:#66758a;font-size:12px">OTP will be sent only to the registered email: <b>${esc(p.email||'')}</b></div>${state?`<div style="padding:9px 10px;border-radius:10px;background:#edf5ff;color:#24507c;font-size:12px">✉️ OTP sent to <b>${esc(state.maskedEmail||p.email||'registered email')}</b>. Valid for 10 minutes.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input id="dbestVaahakAgreementOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Enter 6-digit OTP" style="flex:1;min-width:180px;padding:12px;border:1px solid #cdd9e9;border-radius:11px;font-size:18px"><button class="btn" onclick="DBEST_VAAHAK_AGREEMENT_EMAIL_OTP.verifyPending()">Verify & Sign Agreement</button></div><button class="mini" style="margin-top:9px" onclick="DBEST_VAAHAK_AGREEMENT_EMAIL_OTP.sendPending()">Resend OTP</button>`:`<button class="btn" onclick="DBEST_VAAHAK_AGREEMENT_EMAIL_OTP.sendPending()">Send Email OTP</button>`}</div>`}
function openMain(p){setPending(p);if(typeof sectionScreen==='function'){
  const top=typeof sectionTopBar==='function'?sectionTopBar('📄 Vaahak Agreement',`${esc(p.id)} • ${esc(p.name)}`,'openVaahakPortal()'):'';
  sectionScreen(`${top}<div class="sectionContent"><div class="ownerPanelCard" style="max-width:820px;margin:auto">${agreementBody(p)}${controls(p)}</div></div>`);return;
 }
 openStandalone(p);
}
function ensureStandaloneHost(){let h=document.getElementById('dbestVaahakAgreementSection');if(h)return h;const main=document.querySelector('main.wrap')||document.querySelector('main')||document.body;h=document.createElement('section');h.id='dbestVaahakAgreementSection';h.className='card hidden';main.appendChild(h);return h}
function openStandalone(p){setPending(p);['home','register','login','dash'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));const h=ensureStandaloneHost();h.classList.remove('hidden');h.innerHTML=agreementBody(p)+controls(p);window.scrollTo({top:0,behavior:'smooth'});}
async function sendPending(){const p=getPending();if(!p?.id||!p?.email)return notify('Registered Vaahak email is required.');try{const d=await post(OTP_API,'send',{partnerId:p.id,email:p.email});setOtpState(p.id,{sentAt:Date.now(),maskedEmail:d.maskedEmail||p.email});notify('OTP sent to the registered Vaahak email.');location.pathname.match(/\/vaahak(?:\.html)?\/?$/i)?openStandalone(p):openMain(p)}catch(e){notify(friendly(e))}}
async function verifyPending(){const p=getPending();if(!p?.id)return notify('Vaahak registration not found.');const code=String(document.getElementById('dbestVaahakAgreementOtp')?.value||'').trim();if(!/^\d{6}$/.test(code))return notify('Please enter the 6-digit OTP sent to your email.');try{const d=await post(OTP_API,'verify',{partnerId:p.id,email:p.email,code});p.signed=true;p.signedAt=d.signedAt||new Date().toISOString();setPending(p);setOtpState(p.id,null);syncLocalSigned(p);notify('Vaahak agreement signed successfully with email OTP.');location.pathname.match(/\/vaahak(?:\.html)?\/?$/i)?openStandalone(p):openMain(p)}catch(e){notify(friendly(e))}}
function syncLocalSigned(p){try{const v=(typeof vaahakPartners!=='undefined'&&Array.isArray(vaahakPartners))?vaahakPartners.find(x=>String(x.id)===String(p.id)):null;if(v){v.agreement=v.agreement||{};v.agreement.partnerSigned=true;v.agreement.partnerSignedAt=p.signedAt;v.agreement.partnerChannel='email';v.agreement.status=v.agreement.ownerSigned?'Fully Signed':'Partially Signed';if(typeof save==='function')save()}}catch(e){}}
function continueLogin(){const p=getPending();if(document.getElementById('dbestVaahakAgreementSection')){document.getElementById('dbestVaahakAgreementSection').classList.add('hidden');const login=document.getElementById('login');if(login){login.classList.remove('hidden');const idInput=login.querySelector('input[name="id"]');if(idInput&&p?.id)idInput.value=p.id;return}}if(typeof window.vaahakLoginScreen==='function'){window.vaahakLoginScreen();return}if(typeof window.openVaahakPortal==='function')window.openVaahakPortal()}
async function liveRegisterFromForm(e){e.preventDefault();const f=new FormData(e.target),payload={name:String(f.get('name')||''),mobile:String(f.get('mobile')||''),email:String(f.get('email')||'').trim(),pin:String(f.get('pin')||''),vehicle:String(f.get('vehicle')||''),vehicleNo:String(f.get('vehicleNo')||''),canRide:f.get('ride')==='on',canDeliver:(f.get('delivery')==='on'||f.get('deliveryJob')==='on')};if(!payload.email.includes('@'))return notify('Email is mandatory for agreement OTP signing.');try{const d=await post(LIVE_API,'register',payload);const p={id:d.id,name:payload.name,email:payload.email,mobile:payload.mobile,vehicle:payload.vehicle,vehicleNo:payload.vehicleNo,signed:false};setPending(p);notify('Registration submitted. Vaahak ID: '+d.id+'. Please sign the agreement with email OTP.');location.pathname.match(/\/vaahak(?:\.html)?\/?$/i)?openStandalone(p):openMain(p)}catch(e){notify(friendly(e))}}
function installLiveRegistration(){if(typeof window.registerVaahakPortal==='function')window.registerVaahakPortal=liveRegisterFromForm;const form=document.getElementById('regForm');if(form&&!form.dataset.dbestAgreementOtp){form.dataset.dbestAgreementOtp='1';form.onsubmit=liveRegisterFromForm}}
function coreVaahak(id){try{return (typeof vaahakPartners!=='undefined'&&Array.isArray(vaahakPartners))?vaahakPartners.find(v=>String(v.id)===String(id)):null}catch(e){return null}}
function decorateCore(id){setTimeout(()=>{const v=coreVaahak(id);if(!v)return;const sel=document.getElementById('vaahakPartnerChannel');if(sel){sel.innerHTML=`<option value="email">Email ${esc(v.email||'Not set')}</option>`;sel.value='email'}document.querySelectorAll('.demoOtp').forEach(x=>x.remove());const state=getOtpState(id),input=document.getElementById('partnerOtp_vaahak_'+id),card=sel?.closest?.('.signCard')||document.querySelector('.signGrid .signCard');if(state&&card&&!input&&!v.agreement?.partnerSigned){const box=document.createElement('div');box.innerHTML=`<div class="notice" style="margin-top:10px">✉️ OTP sent to <b>${esc(state.maskedEmail||v.email||'registered email')}</b>. Valid for 10 minutes.</div><div class="otpBox2"><input id="partnerOtp_vaahak_${esc(id)}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Enter 6-digit email OTP"><button class="btn" onclick="verifyPartnerOtp('vaahak','${esc(id)}','partner')">Verify & Sign Agreement</button></div>`;card.appendChild(box)}},30)}
function installCoreAgreement(){const oldSend=window.sendPartnerOtp,oldVerify=window.verifyPartnerOtp,oldScreen=window.vaahakAgreementScreen;if(typeof oldScreen==='function'&&!oldScreen.__dbestEmailOtp){const wrap=function(id){const r=oldScreen.apply(this,arguments);decorateCore(id);return r};wrap.__dbestEmailOtp=true;window.vaahakAgreementScreen=wrap}
 if(typeof oldSend==='function'&&!oldSend.__dbestVaahakEmailOtp){const wrap=async function(kind,id,who,channel){if(kind!=='vaahak'||who!=='partner')return oldSend.apply(this,arguments);const v=coreVaahak(id);if(!v?.email)return notify('A valid Vaahak email is required before signing the agreement.');try{const d=await post(OTP_API,'send',{partnerId:v.id,email:v.email});setOtpState(v.id,{sentAt:Date.now(),maskedEmail:d.maskedEmail||v.email});notify('OTP sent to the registered Vaahak email.');window.vaahakAgreementScreen(v.id)}catch(e){notify(friendly(e))}};wrap.__dbestVaahakEmailOtp=true;window.sendPartnerOtp=wrap}
 if(typeof oldVerify==='function'&&!oldVerify.__dbestVaahakEmailOtp){const wrap=async function(kind,id,who){if(kind!=='vaahak'||who!=='partner')return oldVerify.apply(this,arguments);const v=coreVaahak(id),el=document.getElementById('partnerOtp_vaahak_'+id),code=String(el?.value||'').trim();if(!v?.email)return notify('Registered Vaahak email is required.');if(!/^\d{6}$/.test(code))return notify('Please enter the 6-digit OTP sent to your email.');try{const d=await post(OTP_API,'verify',{partnerId:v.id,email:v.email,code});v.agreement=v.agreement||{};v.agreement.partnerSigned=true;v.agreement.partnerSignedAt=d.signedAt||new Date().toISOString();v.agreement.partnerChannel='email';v.agreement.status=v.agreement.ownerSigned?'Fully Signed':'Partially Signed';if(typeof save==='function')save();setOtpState(v.id,null);notify('Vaahak agreement signed successfully with email OTP.');window.vaahakAgreementScreen(v.id)}catch(e){notify(friendly(e))}};wrap.__dbestVaahakEmailOtp=true;window.verifyPartnerOtp=wrap}}
function install(){installLiveRegistration();installCoreAgreement();const p=getPending();if(p&&!p.signed&&location.pathname.match(/\/vaahak(?:\.html)?\/?$/i)&&document.getElementById('home')){ /* keep home visible until user explicitly resumes */ }}
install();setTimeout(install,150);setTimeout(install,700);setTimeout(install,1500);
window.DBEST_VAAHAK_AGREEMENT_EMAIL_OTP={version:VERSION,openLive:openMain,sendPending,verifyPending,continueLogin,install};
})();