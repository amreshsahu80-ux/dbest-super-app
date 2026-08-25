(function(){
'use strict';
const VERSION='1.1.0';
const VALIDITY={
  leader:{short:'Lifetime',label:'LIFETIME VALIDITY',years:0},
  prime:{short:'Lifetime',label:'LIFETIME VALIDITY',years:0},
  promoter:{short:'3 Years',label:'3 YEAR VALIDITY',years:3},
  guest:{short:'1 Year',label:'1 YEAR VALIDITY',years:1}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoChecked=new Set();
function member(id){try{return (typeof users!=='undefined'&&Array.isArray(users))?users.find(x=>String(x.id||'')===String(id)):null}catch(e){return null}}
function tierInfo(code){try{return (typeof tiers!=='undefined'&&tiers?.[code])?tiers[code]:{name:code||'Member',badge:'👤'}}catch(e){return {name:code||'Member',badge:'👤'}}}
function validity(code){return VALIDITY[String(code||'').toLowerCase()]||VALIDITY.guest}
function parseDate(v){
  if(!v)return null;
  const d=new Date(v);if(!Number.isNaN(d.getTime()))return d;
  const m=String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m){const x=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));if(!Number.isNaN(x.getTime()))return x}
  return null;
}
function activationDate(u){return parseDate(u?.paymentApprovedAt||u?.activatedAt||u?.approvedAt||'')}
function expiryText(u){
  const v=validity(u?.tier);if(!v.years)return 'No Expiry • Lifetime';
  const a=activationDate(u);if(!a)return v.short+' from activation';
  const x=new Date(a);x.setFullYear(x.getFullYear()+v.years);
  return 'Valid Till '+x.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function applyValidityConfig(){
  try{
    if(typeof membershipPlanConfig!=='undefined'&&membershipPlanConfig){
      membershipPlanConfig.leader={...(membershipPlanConfig.leader||{}),validity:'Lifetime'};
      membershipPlanConfig.prime={...(membershipPlanConfig.prime||{}),validity:'Lifetime'};
      membershipPlanConfig.promoter={...(membershipPlanConfig.promoter||{}),validity:'3 Years'};
      membershipPlanConfig.guest={...(membershipPlanConfig.guest||{}),validity:'1 Year'};
      localStorage.setItem('d2_membership_plan_config',JSON.stringify(membershipPlanConfig));
    }
  }catch(e){}
}
function memberToken(){
  try{return window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||''}catch(e){return''}
}
function photoUrl(u){return String(u?.photo||u?.profilePhotoUrl||u?.photoUrl||'').trim()}
async function photoRequest(file){
  const cfg=window.DBEST_RUNTIME_CONFIG||{},base=cfg.supabaseUrl,key=cfg.supabasePublishableKey,token=memberToken();
  if(!base||!key||!token)throw new Error('Please login again to update the photo.');
  const headers={apikey:key,Authorization:'Bearer '+key,'x-dbest-member-token':token};
  let body;
  if(file){body=new FormData();body.append('file',file)}else{headers['Content-Type']='application/json';body=JSON.stringify({action:'get'})}
  const r=await fetch(base+'/functions/v1/member-photo-live',{method:'POST',headers,body});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error==='photo_too_large'?'Photo must be below 5 MB.':d.error==='member_session_invalid'?'Your login session expired. Please login again.':d.error||'Photo could not be saved.');
  return d;
}
async function loadRemotePhoto(id){
  const u=member(id),token=memberToken();if(!u||!token||photoChecked.has(String(id)))return;
  photoChecked.add(String(id));
  if(photoUrl(u))return;
  try{
    const d=await photoRequest(null);
    if(d.photoUrl){u.photo=d.photoUrl;u.profilePhotoUrl=d.photoUrl;try{if(typeof save==='function')save()}catch(e){}renderCard(id)}
  }catch(e){console.warn('DBest member photo lookup',e)}
}
async function uploadPhoto(id,input){
  const u=member(id);if(!u)return;
  const file=input?.files?.[0];if(!file)return;
  if(!String(file.type||'').startsWith('image/')){if(typeof toast==='function')toast('Please select an image file.');input.value='';return}
  if(file.size>5*1024*1024){if(typeof toast==='function')toast('Photo must be below 5 MB.');input.value='';return}
  const btn=document.getElementById('dbestPhotoUploadBtn');if(btn){btn.disabled=true;btn.textContent='Uploading photo…'}
  try{
    const d=await photoRequest(file);
    if(!d.photoUrl)throw new Error('Photo URL was not returned.');
    u.photo=d.photoUrl;u.profilePhotoUrl=d.photoUrl;photoChecked.add(String(id));
    try{if(typeof save==='function')save()}catch(e){}
    if(typeof toast==='function')toast('Profile photo saved successfully.');
    renderCard(id);
  }catch(e){if(typeof toast==='function')toast(e.message||'Photo upload failed.');else alert(e.message||'Photo upload failed.')}
  finally{if(input)input.value=''}
}
function styles(){
  if(document.getElementById('dbestMemberCardEnhancedStyle'))return;
  const s=document.createElement('style');s.id='dbestMemberCardEnhancedStyle';s.textContent=`
  .dbestMemberCardV2{max-width:760px;margin:0 auto;border-radius:26px;overflow:hidden;color:#fff;background:linear-gradient(135deg,#0d2348 0%,#175cff 56%,#745cff 100%);box-shadow:0 18px 45px rgba(16,38,77,.25);border:1px solid rgba(255,255,255,.22);position:relative}
  .dbestMemberCardV2:before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;right:-110px;top:-140px;background:rgba(255,255,255,.09)}
  .dbestCardHead{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.20)}
  .dbestCardLogoWrap{background:#fff;border-radius:13px;padding:5px 10px;display:flex;align-items:center;min-height:48px;max-width:190px}
  .dbestCardLogo{display:block;width:165px;max-height:45px;object-fit:contain}
  .dbestCardType{text-align:right}.dbestCardType b{display:block;font-size:18px}.dbestCardType small{display:block;margin-top:4px;color:#e6edff;font-weight:700}
  .dbestCardMain{position:relative;z-index:1;display:grid;grid-template-columns:120px 1fr 94px;gap:18px;align-items:center;padding:20px}
  .dbestCardPhoto{width:112px;height:132px;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.16);border:3px solid rgba(255,255,255,.72);display:grid;place-items:center;font-size:42px;font-weight:900}
  .dbestCardPhoto img{width:100%;height:100%;object-fit:cover;display:block}
  .dbestCardName{font-size:25px;font-weight:900;line-height:1.08;margin-bottom:5px}.dbestCardContact{font-size:12px;color:#e6edff;margin-bottom:12px}
  .dbestCardGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dbestCardCell{padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.14)}.dbestCardCell small{display:block;font-size:9px;color:#dce6ff;text-transform:uppercase;letter-spacing:.45px}.dbestCardCell b{display:block;margin-top:2px;font-size:13px}
  .dbestCardQr{background:#fff;border-radius:12px;padding:6px;width:90px;height:90px}.dbestCardQr img{width:100%;height:100%;display:block}.dbestCardQrText{text-align:center;font-size:9px;color:#e4ebff;margin-top:5px}
  .dbestValidityBand{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 20px;background:rgba(5,16,42,.27);border-top:1px solid rgba(255,255,255,.17)}.dbestValidityBand strong{font-size:16px;letter-spacing:.35px}.dbestValidityBand span{font-size:12px;color:#edf3ff;font-weight:800}
  .dbestCardCompany{position:relative;z-index:1;padding:9px 20px 13px;text-align:center;font-size:10px;color:#dce6ff}
  .dbestPhotoActions{max-width:760px;margin:11px auto 0;padding:11px 13px;border:1px solid #dbe5f4;border-radius:14px;background:#f8fbff;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.dbestPhotoActions small{color:#66758b}.dbestPhotoBtn{border:0;border-radius:11px;background:#175cff;color:#fff;font-weight:800;padding:10px 14px;cursor:pointer}.dbestPhotoBtn:disabled{opacity:.6}
  @media(max-width:620px){.dbestMemberCardV2{border-radius:20px}.dbestCardHead{padding:14px}.dbestCardLogoWrap{max-width:145px}.dbestCardLogo{width:125px}.dbestCardType b{font-size:14px}.dbestCardMain{grid-template-columns:88px 1fr;gap:12px;padding:14px}.dbestCardPhoto{width:84px;height:104px;border-radius:14px}.dbestCardName{font-size:19px}.dbestCardQrBlock{grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:9px}.dbestCardQr{width:72px;height:72px}.dbestCardGrid{gap:6px}.dbestCardCell{padding:7px}.dbestValidityBand{padding:10px 14px;align-items:flex-start;flex-direction:column;gap:2px}.dbestValidityBand strong{font-size:14px}.dbestPhotoActions{align-items:stretch;flex-direction:column;text-align:center}.dbestPhotoBtn{width:100%}}
  @media print{body *{visibility:hidden!important}.dbestMemberCardV2,.dbestMemberCardV2 *{visibility:visible!important}.dbestMemberCardV2{position:absolute;left:0;top:0;width:100%;max-width:760px;box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}.dbestPhotoActions{display:none!important}}
  `;document.head.appendChild(s);
}
function logoHtml(){return `<div class="dbestCardLogoWrap"><img class="dbestCardLogo" src="/dbest-logo.png" alt="DBest" onerror="this.style.display='none';this.parentElement.innerHTML='<b style=&quot;color:#175cff;font-size:24px&quot;>DBest</b>'"></div>`}
function renderCard(id){
  const u=member(id);if(!u)return;
  if(!u.card){
    if(typeof sectionScreen==='function'&&typeof sectionTopBar==='function')sectionScreen(`${sectionTopBar('🪪 Membership ID Card',`${esc(u.name)} • ${esc(u.id)}`,'returnToRoleScreen()')}<div class="sectionContent fullPageBody"><div class="notice">Final card pending Project Owner approval. KYC: ${esc(u.kyc||'—')} • Status: ${esc(u.status||'—')}</div></div>`);
    return;
  }
  styles();applyValidityConfig();
  const t=tierInfo(u.tier),v=validity(u.tier);
  const qr=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('DBest Member '+u.id)}`;
  const initial=esc(String(u.name||'M').trim().charAt(0).toUpperCase()||'M');
  const src=photoUrl(u);
  const photo=src?`<img src="${esc(src)}" alt="${esc(u.name)}" onerror="this.remove();this.parentElement.textContent='${initial}'">`:initial;
  const canUpload=!!memberToken()&&String(session?.id||'')===String(u.id||'');
  const photoActions=canUpload?`<div class="dbestPhotoActions"><input id="dbestMemberPhotoInput" type="file" accept="image/*" style="display:none" onchange="window.DBEST_MEMBER_ID_CARD.uploadPhoto('${esc(u.id)}',this)"><button id="dbestPhotoUploadBtn" class="dbestPhotoBtn" onclick="document.getElementById('dbestMemberPhotoInput').click()">📷 ${src?'Change Profile Photo':'Upload Profile Photo'}</button><small>${src?'Your saved photo is used on this ID card.':'Add your profile photo to display it on the ID card.'}</small></div>`:'';
  const html=`${typeof sectionTopBar==='function'?sectionTopBar('🪪 DBest Photo ID Card',`${esc(u.name)} • ${esc(u.id)}`,'returnToRoleScreen()'):''}<div class="sectionContent fullPageBody"><div id="dbestMemberIdCard" class="dbestMemberCardV2"><div class="dbestCardHead">${logoHtml()}<div class="dbestCardType"><b>${esc(t.badge||'')} ${esc(t.name||'Member')}</b><small>Official Membership ID</small></div></div><div class="dbestCardMain"><div class="dbestCardPhoto">${photo}</div><div><div class="dbestCardName">${esc(u.name||'Member')}</div><div class="dbestCardContact">${esc(u.city||'')} ${u.city&&u.mobile?'•':''} ${esc(u.mobile||'')}</div><div class="dbestCardGrid"><div class="dbestCardCell"><small>Member ID</small><b>${esc(u.id)}</b></div><div class="dbestCardCell"><small>Referral Code</small><b>${esc(u.ref||'N/A')}</b></div><div class="dbestCardCell"><small>KYC</small><b>${esc(u.kyc||'—')}</b></div><div class="dbestCardCell"><small>Membership Status</small><b>${esc(u.status||'—')}</b></div><div class="dbestCardCell" style="grid-column:1/-1"><small>Membership Validity</small><b>${esc(v.label)}</b></div></div></div><div class="dbestCardQrBlock"><div><div class="dbestCardQr"><img src="${qr}" alt="Member QR"></div><div class="dbestCardQrText">Scan Member ID</div></div></div></div><div class="dbestValidityBand"><strong>✓ ${esc(v.label)}</strong><span>${esc(expiryText(u))}</span></div><div class="dbestCardCompany">DBest • Sarwashresth Services OPC Pvt. Ltd.</div></div>${photoActions}<button class="btn" style="margin:12px auto 0;display:block" onclick="window.print()">Print / Save Card</button></div>`;
  if(typeof sectionScreen==='function')sectionScreen(html);else document.body.innerHTML=html;
  setTimeout(()=>loadRemotePhoto(id),20);
}
function install(){applyValidityConfig();styles();window.card=renderCard}
install();setTimeout(install,250);setTimeout(install,1000);
window.DBEST_MEMBER_ID_CARD={version:VERSION,validity:VALIDITY,open:renderCard,uploadPhoto,loadRemotePhoto};
})();