(function(){
'use strict';
const UPI_ID='7004630311@icici';
const SNAP='dbest_screen_snapshot_v1';
const STACK='dbest_screen_stack_v1';
let restoring=false;

function injectResponsive(){
  if(document.getElementById('dbestDeviceCompatV1'))return;
  const s=document.createElement('style');s.id='dbestDeviceCompatV1';s.textContent=`
html,body{max-width:100%;overflow-x:hidden}img,video,canvas,iframe{max-width:100%}.sectionPage,.modal,.payCard,.registrationForm{max-width:100%;min-width:0}.form,.serviceFormGrid,.ownerControlGrid,.cards,.subs{min-width:0}.f,.sf,.card,.sub{min-width:0}input,select,textarea,button{max-width:100%}
@media(max-width:900px){.w{width:100%;padding-left:12px!important;padding-right:12px!important}.sectionPage{width:100%!important;border-radius:0!important}.sectionOverlay{padding:0!important}.form,.serviceFormGrid{grid-template-columns:1fr 1fr!important}.full{grid-column:1/-1!important}}
@media(max-width:620px){.form,.serviceFormGrid,.paymentSummary,.ownerPayuGrid{grid-template-columns:1fr!important}.full{grid-column:1!important}.sectionTop{gap:6px!important}.sectionTitle{min-width:0}.sectionTitle b,.sectionTitle small{white-space:normal!important}.sectionBack,.sectionHome{padding:8px!important}.btn,.mini,button{min-height:40px}.registrationPage .paymentPanel{padding:14px!important}.productGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:380px){.productGrid,.grid{grid-template-columns:1fr!important}.navin{gap:7px!important}.dbestTopLogo{max-width:125px!important}}
.dbestCameraRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px}.dbestCameraBtn{border:0;border-radius:10px;padding:8px 10px;background:#eef4ff;color:#175cff;font-weight:800}.dbestUpiBox{margin:12px 0;padding:14px;border:1px solid #cbdcf8;border-radius:16px;background:#f5f9ff}.dbestUpiBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:13px;padding:13px;background:#175cff;color:white;font-weight:900}
.dbestVerifyBackdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(9,19,39,.62);display:flex;align-items:center;justify-content:center;padding:18px}.dbestVerifyDialog{width:min(460px,100%);background:#fff;border-radius:22px;padding:24px;box-shadow:0 24px 70px #0005;text-align:center}.dbestVerifyDialog .ico{font-size:44px}.dbestVerifyDialog h3{margin:8px 0 8px;font-size:22px}.dbestVerifyDialog p{margin:0;color:#59677c;line-height:1.55}.dbestVerifyDialog button{margin-top:18px;width:100%;border:0;border-radius:12px;padding:12px;background:#175cff;color:#fff;font-weight:900}
`;document.head.appendChild(s);
}
function snap(){try{const m=document.getElementById('m');if(!m||!m.innerHTML)return null;const x={html:m.innerHTML,sectionOpen:document.body.classList.contains('sectionOpen'),scroll:(m.querySelector('.sectionOverlay')||{}).scrollTop||0,at:Date.now()};sessionStorage.setItem(SNAP,JSON.stringify(x));return x}catch(e){return null}}
function stack(){try{return JSON.parse(sessionStorage.getItem(STACK)||'[]')}catch(e){return[]}}
function saveStack(a){try{sessionStorage.setItem(STACK,JSON.stringify(a.slice(-25)))}catch(e){}}
function restore(x){if(!x||!x.html)return false;const m=document.getElementById('m');if(!m)return false;restoring=true;m.innerHTML=x.html;document.body.classList.toggle('sectionOpen',!!x.sectionOpen);requestAnimationFrame(()=>{const ov=m.querySelector('.sectionOverlay');if(ov)ov.scrollTop=Number(x.scroll||0);enhanceFiles();enhanceRegistration();restoring=false;});return true}
function installNavigation(){
  if(window.__DBEST_NAV_V1)return;window.__DBEST_NAV_V1=true;
  const base=window.sectionScreen;
  if(typeof base==='function')window.sectionScreen=function(content){if(!restoring){const cur=snap();if(cur){const a=stack();a.push(cur);saveStack(a)}try{history.pushState({dbestScreen:true},'',location.href)}catch(e){}}const r=base.apply(this,arguments);setTimeout(()=>{snap();enhanceFiles();enhanceRegistration()},30);return r};
  const baseClose=window.closeM;if(typeof baseClose==='function')window.closeM=function(){const r=baseClose.apply(this,arguments);try{sessionStorage.removeItem(SNAP)}catch(e){}return r};
  window.addEventListener('popstate',()=>{const a=stack();const prev=a.pop();saveStack(a);if(prev&&restore(prev))return;try{baseClose&&baseClose()}catch(e){}});
  setTimeout(()=>{try{const x=JSON.parse(sessionStorage.getItem(SNAP)||'null');if(x&&Date.now()-Number(x.at||0)<12*60*60*1000&&!document.getElementById('m')?.innerHTML)restore(x)}catch(e){}},250);
  window.addEventListener('beforeunload',snap);
}
function cameraFor(input){
  if(input.dataset.dbestCamera==='1')return;input.dataset.dbestCamera='1';
  const accept=String(input.getAttribute('accept')||'');if(!accept.includes('image'))return;
  if(accept==='image/*'||(accept.includes('image')&&!accept.includes('pdf')))input.setAttribute('capture','environment');
  const row=document.createElement('div');row.className='dbestCameraRow';
  const cam=document.createElement('input');cam.type='file';cam.accept='image/*';cam.capture='environment';cam.style.display='none';
  const b=document.createElement('button');b.type='button';b.className='dbestCameraBtn';b.textContent='📷 Use Camera';
  b.onclick=()=>cam.click();cam.onchange=()=>{if(!cam.files?.length)return;try{const dt=new DataTransfer();dt.items.add(cam.files[0]);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}};
  row.append(cam,b);input.insertAdjacentElement('afterend',row);
}
function enhanceFiles(){document.querySelectorAll('input[type="file"]').forEach(cameraFor)}
function upiUri(amount,tier){const q=new URLSearchParams({pa:UPI_ID,pn:'DBest',am:Number(amount||0).toFixed(2),cu:'INR',tn:'DBest '+String(tier||'Membership')+' Membership'});return 'upi://pay?'+q.toString()}
window.dbestStartMembershipUPI=function(tier){const t=(window.tiers||{})[tier]||{};const amt=Number(t.price||0);if(!amt)return;location.href=upiUri(amt,t.name||tier)};
function enhanceRegistration(){
  try{if(window.paymentSettings){window.paymentSettings.upiId=UPI_ID;window.paymentSettings.mobile='7004630311';window.paymentSettings.instructions='Pay securely from any UPI app. Payment will be verified by DBest before activation.';localStorage.setItem('d2_payment_settings',JSON.stringify(window.paymentSettings))}}catch(e){}
  const page=document.querySelector('.registrationPage');if(!page||page.dataset.dbestUpi==='1')return;page.dataset.dbestUpi='1';
  const form=page.querySelector('form');if(!form)return;let tier='guest';const on=String(form.getAttribute('onsubmit')||'');const m=on.match(/regGo\(event,'([^']+)'\)/);if(m)tier=m[1];const t=(window.tiers||{})[tier]||{};
  const box=document.createElement('div');box.className='dbestUpiBox';box.innerHTML=`<b>Direct UPI Payment</b><div style="margin:6px 0;color:#687386">Pay ₹${Number(t.price||0)} to <b>${UPI_ID}</b> using PhonePe, Google Pay, Paytm or any UPI app.</div><button type="button" class="dbestUpiBtn">📲 Pay ₹${Number(t.price||0)} with UPI App</button><small style="display:block;margin-top:8px;color:#687386">After submitting your payment details, DBest will verify the payment and confirm your membership within 24 hours.</small>`;
  box.querySelector('button').onclick=()=>window.dbestStartMembershipUPI(tier);
  const panel=page.querySelector('.paymentPanel');(panel?.parentElement||form).insertAdjacentElement('beforebegin',box);
  enhanceFiles();
}
function showVerifyDialog(){
  document.getElementById('dbestVerifyBackdrop')?.remove();
  const d=document.createElement('div');d.id='dbestVerifyBackdrop';d.className='dbestVerifyBackdrop';d.innerHTML=`<div class="dbestVerifyDialog"><div class="ico">✅</div><h3>Payment Submitted</h3><p><b>We are verifying your payment and will Confirm your membership within 24 Hrs.</b></p><p style="margin-top:8px">You do not need to make another payment while verification is in progress.</p><button type="button">OK</button></div>`;d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}
async function sendPendingEmail(info){
  try{
    const cfg=window.DBEST_RUNTIME_CONFIG||{};if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!info.email)return;
    await fetch(cfg.supabaseUrl+'/functions/v1/membership-payment-pending-email',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.supabasePublishableKey,'Authorization':'Bearer '+cfg.supabasePublishableKey},body:JSON.stringify(info)});
  }catch(e){console.warn('DBest pending payment email',e)}
}
function installRegistrationNotice(){
  if(window.__DBEST_REG_NOTICE_V1)return;
  const base=window.regGo;if(typeof base!=='function')return;
  window.__DBEST_REG_NOTICE_V1=true;
  window.regGo=async function(e,tier){
    let info={};
    try{const f=new FormData(e.target);info={email:String(f.get('email')||'').trim().toLowerCase(),name:String(f.get('name')||'Member').trim(),plan:String((window.tiers||{})[tier]?.name||tier||'DBest Membership'),amount:Number(f.get('paidAmount')||((window.tiers||{})[tier]?.price)||0),paymentRef:String(f.get('paymentRef')||'').trim()}}catch(_){ }
    const r=await base.apply(this,arguments);
    try{const s=window.session||{};const list=window.users||[];const u=list.find?.(x=>x.id===s.id);if(u){info.memberId=u.id;info.email=info.email||u.email;info.name=info.name||u.name;info.paymentRef=info.paymentRef||u.paymentRef;info.amount=info.amount||u.paidAmount;info.plan=info.plan||((window.tiers||{})[u.tier]?.name||u.tier)}}catch(_){ }
    setTimeout(showVerifyDialog,120);
    sendPendingEmail(info);
    return r;
  };
}
function boot(){injectResponsive();installNavigation();enhanceFiles();enhanceRegistration();installRegistrationNotice()}
boot();setTimeout(boot,500);setInterval(()=>{enhanceFiles();enhanceRegistration();installRegistrationNotice()},1800);
window.DBEST_PLATFORM_UX_V1={upiId:UPI_ID,restoreCurrentScreen:()=>{try{return restore(JSON.parse(sessionStorage.getItem(SNAP)||'null'))}catch(e){return false}},enhanceFiles,showVerifyDialog};
})();