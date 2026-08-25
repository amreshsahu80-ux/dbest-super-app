(function(){
'use strict';
const VERSION='1.0.0';
const VALIDITY={
  leader:{short:'Lifetime',label:'LIFETIME VALIDITY',years:0},
  prime:{short:'Lifetime',label:'LIFETIME VALIDITY',years:0},
  promoter:{short:'3 Years',label:'3 YEAR VALIDITY',years:3},
  guest:{short:'1 Year',label:'1 YEAR VALIDITY',years:1}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  @media(max-width:620px){.dbestMemberCardV2{border-radius:20px}.dbestCardHead{padding:14px}.dbestCardLogoWrap{max-width:145px}.dbestCardLogo{width:125px}.dbestCardType b{font-size:14px}.dbestCardMain{grid-template-columns:88px 1fr;gap:12px;padding:14px}.dbestCardPhoto{width:84px;height:104px;border-radius:14px}.dbestCardName{font-size:19px}.dbestCardQrBlock{grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:9px}.dbestCardQr{width:72px;height:72px}.dbestCardGrid{gap:6px}.dbestCardCell{padding:7px}.dbestValidityBand{padding:10px 14px;align-items:flex-start;flex-direction:column;gap:2px}.dbestValidityBand strong{font-size:14px}}
  @media print{body *{visibility:hidden!important}.dbestMemberCardV2,.dbestMemberCardV2 *{visibility:visible!important}.dbestMemberCardV2{position:absolute;left:0;top:0;width:100%;max-width:760px;box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
  const photo=u.photo?`<img src="${esc(u.photo)}" alt="${esc(u.name)}" onerror="this.remove();this.parentElement.textContent='${initial}'">`:initial;
  const html=`${typeof sectionTopBar==='function'?sectionTopBar('🪪 DBest Photo ID Card',`${esc(u.name)} • ${esc(u.id)}`,'returnToRoleScreen()'):''}<div class="sectionContent fullPageBody"><div id="dbestMemberIdCard" class="dbestMemberCardV2"><div class="dbestCardHead">${logoHtml()}<div class="dbestCardType"><b>${esc(t.badge||'')} ${esc(t.name||'Member')}</b><small>Official Membership ID</small></div></div><div class="dbestCardMain"><div class="dbestCardPhoto">${photo}</div><div><div class="dbestCardName">${esc(u.name||'Member')}</div><div class="dbestCardContact">${esc(u.city||'')} ${u.city&&u.mobile?'•':''} ${esc(u.mobile||'')}</div><div class="dbestCardGrid"><div class="dbestCardCell"><small>Member ID</small><b>${esc(u.id)}</b></div><div class="dbestCardCell"><small>Referral Code</small><b>${esc(u.ref||'N/A')}</b></div><div class="dbestCardCell"><small>KYC</small><b>${esc(u.kyc||'—')}</b></div><div class="dbestCardCell"><small>Membership Status</small><b>${esc(u.status||'—')}</b></div><div class="dbestCardCell" style="grid-column:1/-1"><small>Membership Validity</small><b>${esc(v.label)}</b></div></div></div><div class="dbestCardQrBlock"><div><div class="dbestCardQr"><img src="${qr}" alt="Member QR"></div><div class="dbestCardQrText">Scan Member ID</div></div></div></div><div class="dbestValidityBand"><strong>✓ ${esc(v.label)}</strong><span>${esc(expiryText(u))}</span></div><div class="dbestCardCompany">DBest • Sarwashresth Services OPC Pvt. Ltd.</div></div><button class="btn" style="margin:12px auto 0;display:block" onclick="window.print()">Print / Save Card</button></div>`;
  if(typeof sectionScreen==='function')sectionScreen(html);else document.body.innerHTML=html;
}
function install(){applyValidityConfig();styles();window.card=renderCard}
install();setTimeout(install,250);setTimeout(install,1000);
window.DBEST_MEMBER_ID_CARD={version:VERSION,validity:VALIDITY,open:renderCard};
})();