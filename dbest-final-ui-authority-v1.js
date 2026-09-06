(function(){
'use strict';
const VERSION='20260906-final-ui-authority-v1';
if(window.DBEST_FINAL_UI_AUTHORITY?.version===VERSION)return;

/* Final Cab entry: keep the approved cab6/V16 experience authoritative even when
   legacy logistics modules are still present for booking/tracking compatibility. */
const CAB_BASE='20260905-selected-realmap-v6';
let cabLoad=null;
function selectedCab(){const u=window.DBEST_CAB_SELECTED_UI;return u&&typeof u.open==='function'?u:null}
function ensureSelected(){
  const ready=selectedCab();if(ready)return Promise.resolve(ready);
  if(cabLoad)return cabLoad;
  cabLoad=new Promise(resolve=>{
    const finish=()=>resolve(selectedCab());
    let s=Array.from(document.scripts||[]).find(x=>/cab-selected-ui-v3\.js/i.test(String(x.src||'')));
    if(s){setTimeout(finish,180);setTimeout(finish,650);return}
    s=document.createElement('script');s.src='/cab-selected-ui-v3.js?v='+CAB_BASE+'&finalAuthority=1';s.async=false;s.onload=finish;s.onerror=()=>resolve(null);(document.body||document.documentElement).appendChild(s);
  }).finally(()=>{cabLoad=null});
  return cabLoad;
}
async function openApprovedCab(){
  let u=selectedCab();if(!u)u=await ensureSelected();
  if(u&&typeof u.open==='function'){u.open();return}
  try{typeof toast==='function'?toast('Cab booking is loading. Please tap Cab once more.'):alert('Cab booking is loading. Please tap Cab once more.')}catch(e){}
}
const cabProxy={version:'SELECTED_REALMAP_V16_FINAL',open:openApprovedCab,vehicles(){const u=selectedCab();return u?.vehicles?.()||openApprovedCab()},confirmRide(id){const u=selectedCab(),f=u&&(u.confirmRide||u.confirm);return typeof f==='function'?f.call(u,id):openApprovedCab()},confirm(id){return this.confirmRide(id)}};
function lockCab(){
  try{Object.defineProperty(window,'openRidePlatform',{configurable:false,enumerable:true,get(){return openApprovedCab},set(){}})}catch(e){try{window.openRidePlatform=openApprovedCab}catch(_){}}
  try{Object.defineProperty(window,'DBEST_ACTIVE_CAB_VERSION',{configurable:false,enumerable:true,get(){return'SELECTED_REALMAP_V16_FINAL'},set(){}})}catch(e){try{window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V16_FINAL'}catch(_){}}
  /* Legacy globals remain readable through the approved proxy, so late legacy
     scripts cannot reopen their old customer-facing search screens. */
  ['DBEST_CAB_GOOGLE','DBEST_CAB_MAPPLS_RENTAL'].forEach(name=>{try{Object.defineProperty(window,name,{configurable:false,enumerable:true,get(){return cabProxy},set(){}})}catch(e){}});
}

/* Safe explanatory membership card. It only intercepts plan-choice clicks and
   never touches active registration forms, camera/file inputs, UPI or submit. */
const PLANS={
 leader:{name:'Leader',price:'₹999',icon:'👑',tone:'#d89b00',benefits:['Highest DBest payout tier','Leader team & earnings dashboard','No upline payout above Leader','Eligible same-level referral income','Best for building a larger DBest network']},
 prime:{name:'Prime',price:'₹599',icon:'💎',tone:'#1769e8',benefits:['Higher payout than Promoter','Team hierarchy & transaction visibility','Eligible hierarchy earnings','Access across eligible services','Strong balance of cost and earning']},
 promoter:{name:'Promoter',price:'₹299',icon:'🛡️',tone:'#18a447',benefits:['Earn on eligible services & products','Build customer/member network','Track eligible transactions & earnings','Low entry cost for active promoters','Upgrade as your network grows']},
 guest:{name:'Guest',price:'₹49',icon:'👤',tone:'#9828c9',benefits:['Lowest-cost DBest membership','Cashback on eligible DBest services','Browse & transact across platform','No need to start as Promoter','Easy upgrade when required']}
};
function planFrom(el){
  if(!el||el.closest?.('#dbestMembershipSafeModal'))return'';
  if(document.querySelector('#dbestSimpleMemberForm,#dbestOwnerSimpleMemberForm'))return'';
  if(el.closest?.('#dbestSimpleMemberForm,#dbestOwnerSimpleMemberForm,.dbestSimpleReg,.dbestOwnerOnboard,.registrationPage'))return'';
  let n=el.closest?.('button,a,[role="button"],.tile,.card,.plan')||el;
  for(let i=0;n&&n!==document.body&&i<4;i++,n=n.parentElement){
    const oc=String(n.getAttribute?.('onclick')||'');const m=oc.match(/reg\(\s*['"](leader|prime|promoter|guest)['"]\s*\)/i);if(m)return m[1].toLowerCase();
    const t=String(n.innerText||n.textContent||'').toLowerCase();
    if(t.length<650){if(t.includes('leader')&&t.includes('999'))return'leader';if(t.includes('prime')&&t.includes('599'))return'prime';if(t.includes('promoter')&&t.includes('299'))return'promoter';if(t.includes('guest')&&(/\b49\b/.test(t)||t.includes('₹49')))return'guest'}
  }
  return'';
}
function style(){if(document.getElementById('dbestMembershipSafeCss'))return;const s=document.createElement('style');s.id='dbestMembershipSafeCss';s.textContent=`
#dbestMembershipSafeModal{position:fixed;inset:0;z-index:2147483000;background:rgba(3,10,25,.68);display:flex;align-items:center;justify-content:center;padding:10px;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;box-sizing:border-box}
.dbsafeShell{width:min(1040px,97vw);max-height:94dvh;overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 26px 80px rgba(0,0,0,.38)}
.dbsafeHead{display:flex;gap:10px;align-items:center;margin-bottom:13px}.dbsafeLogo{width:126px;height:42px;object-fit:contain}.dbsafeTitle{flex:1;min-width:0}.dbsafeTitle b{display:block;color:#10234a;font-size:clamp(18px,2.3vw,27px);font-weight:950}.dbsafeTitle small{display:block;color:#758097;margin-top:3px}.dbsafeClose{width:38px;height:38px;border:1px solid #e3e8f0;border-radius:50%;background:#fff;font-size:24px;cursor:pointer}
.dbsafeGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.dbsafePlan{border:1px solid #e3e8f0;border-radius:15px;padding:13px 11px;background:#fff;display:flex;flex-direction:column;min-width:0}.dbsafePlan.on{outline:3px solid var(--tone);outline-offset:-2px;background:color-mix(in srgb,var(--tone) 6%,#fff)}.dbsafeIcon{font-size:27px;text-align:center}.dbsafePlan h3{margin:4px 0 0;text-align:center;color:var(--tone);font-size:18px}.dbsafePrice{text-align:center;font-size:25px;font-weight:950;color:#172033;margin:3px 0 10px}.dbsafePrice small{font-size:10px;color:#667085}.dbsafePlan ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:7px;flex:1}.dbsafePlan li{font-size:11px;color:#485166;line-height:1.3;padding-left:15px;position:relative}.dbsafePlan li:before{content:'◆';position:absolute;left:0;color:var(--tone);font-size:7px;top:2px}.dbsafeSelect{border:0;border-radius:9px;min-height:38px;background:var(--tone);color:#fff;font-weight:900;cursor:pointer}.dbsafeFoot{margin-top:12px;padding:10px;border-radius:12px;background:#f5f8fd;color:#526075;font-size:11px;text-align:center}
@media(max-width:720px){.dbsafeShell{padding:11px}.dbsafeHead{margin-bottom:9px}.dbsafeLogo{width:90px;height:34px}.dbsafeTitle b{font-size:16px}.dbsafeTitle small{font-size:9px}.dbsafeGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.dbsafePlan{padding:9px 7px}.dbsafePlan h3{font-size:14px}.dbsafePrice{font-size:18px}.dbsafePlan li{font-size:9px}.dbsafeSelect{min-height:34px;font-size:11px}}
`;document.head.appendChild(s)}
function closeCard(){document.getElementById('dbestMembershipSafeModal')?.remove()}
function openCard(selected){style();closeCard();const m=document.createElement('div');m.id='dbestMembershipSafeModal';m.innerHTML=`<div class="dbsafeShell" role="dialog" aria-modal="true"><div class="dbsafeHead"><img class="dbsafeLogo" src="/dbest-logo.png" alt="DBest"><div class="dbsafeTitle"><b>Choose the Membership that suits you</b><small>Compare benefits before continuing registration</small></div><button type="button" class="dbsafeClose" aria-label="Close">×</button></div><div class="dbsafeGrid">${Object.entries(PLANS).map(([k,p])=>`<section class="dbsafePlan ${selected===k?'on':''}" style="--tone:${p.tone}"><div class="dbsafeIcon">${p.icon}</div><h3>${p.name}</h3><div class="dbsafePrice">${p.price} <small>/ year</small></div><ul>${p.benefits.map(x=>`<li>${x}</li>`).join('')}</ul><button type="button" class="dbsafeSelect" data-plan="${k}">Select ${p.name}</button></section>`).join('')}</div><div class="dbsafeFoot">Secure registration • Aadhaar KYC • Payout bank account • DBest support</div></div>`;document.body.appendChild(m)}
async function choose(plan){closeCard();const a=window.DBEST_MEMBER_REG_AUTHORITY;if(a&&typeof a.open==='function')return a.open(plan);if(typeof window.reg==='function')return window.reg(plan)}
document.addEventListener('click',e=>{
  const modal=document.getElementById('dbestMembershipSafeModal');
  if(modal){const c=e.target.closest?.('.dbsafeClose');if(c||e.target===modal){e.preventDefault();e.stopImmediatePropagation();closeCard();return}const b=e.target.closest?.('.dbsafeSelect');if(b){e.preventDefault();e.stopImmediatePropagation();choose(b.dataset.plan);return}return}
  const p=planFrom(e.target);if(!p)return;e.preventDefault();e.stopImmediatePropagation();openCard(p);
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCard()},true);
window.addEventListener('popstate',closeCard);
lockCab();
window.DBEST_FINAL_UI_AUTHORITY={version:VERSION,openCab:openApprovedCab,openMembershipCard:openCard,closeMembershipCard:closeCard};
})();