(function(){
'use strict';
const VERSION='20260922-leader-assisted-onboarding-v1';
if(window.DBEST_LEADER_PARTNER_ONBOARDING?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||''),TK='dbest_member_live_token';
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/leader-partner-onboarding-live';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>{try{return localStorage.getItem(TK)||''}catch(_){return''}};
function isLeader(){try{const s=window.DBEST_SESSION_COMPAT?.read?.()||window.session||JSON.parse(localStorage.getItem('d2_session')||'{}');return String(s?.role||'').toLowerCase()==='leader'&&!!s?.id}catch(_){return false}}
async function call(body){const t=token();if(!t)throw new Error('Leader login session required.');const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-member-token':t},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));return d}
function css(){if(document.getElementById('dbestLeaderOnboardCss'))return;const s=document.createElement('style');s.id='dbestLeaderOnboardCss';s.textContent=`
#dbestLeaderOnboarding{margin:16px 0;background:#fff;border:1px solid #dfe7f2;border-radius:20px;padding:15px;box-shadow:0 8px 24px rgba(20,50,100,.06)}
#dbestLeaderOnboarding .loHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
#dbestLeaderOnboarding h3{margin:0 0 3px;font-size:19px}#dbestLeaderOnboarding .loMeta{font-size:11px;color:#6b778b;line-height:1.45}
#dbestLeaderOnboarding .loGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}
#dbestLeaderOnboarding .loBtn{border:0;border-radius:16px;padding:14px 10px;color:#fff;font-weight:900;text-align:left;min-height:92px;box-shadow:0 8px 18px rgba(20,50,100,.12)}
#dbestLeaderOnboarding .loBtn b{display:block;font-size:15px}.loBtn small{display:block;margin-top:5px;color:#eef4ff;font-size:10px;line-height:1.3}
#dbestLeaderOnboarding .vendor{background:linear-gradient(135deg,#087f72,#21aa93)}#dbestLeaderOnboarding .vaahak{background:linear-gradient(135deg,#1765ff,#654bff)}#dbestLeaderOnboarding .service{background:linear-gradient(135deg,#c44a7f,#ef6aa4)}
#dbestLeaderOnboarding .loStats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.loStat{background:#f7f9fc;border:1px solid #e6ebf2;border-radius:12px;padding:9px}.loStat small{display:block;color:#718096;font-size:9px}.loStat b{display:block;margin-top:2px;font-size:14px}
#dbestLeaderOnboarding .loNote{margin-top:10px;padding:10px;border-radius:12px;background:#fff8e8;border:1px solid #f1dfad;color:#765719;font-size:10px;line-height:1.45}
@media(max-width:560px){#dbestLeaderOnboarding .loGrid{grid-template-columns:1fr}.loStats{grid-template-columns:1fr 1fr!important}.loBtn{min-height:72px!important}}
`;document.head.appendChild(s)}
async function launch(type,btn){if(btn)btn.disabled=true;try{const d=await call({action:'launch',partnerType:type});if(!d.url)throw new Error('Onboarding link unavailable.');location.href=d.url}catch(e){alert('Could not start onboarding: '+(e.message||e));if(btn)btn.disabled=false}}
async function refresh(){if(!isLeader())return;try{const d=await call({action:'list'}),s=d.summary||{};const map={loStarted:s.started||0,loPending:s.pending||0,loActivated:s.activated||0,loEarned:'₹'+Number(s.earned||0).toLocaleString('en-IN')};for(const [id,v] of Object.entries(map)){const e=document.getElementById(id);if(e)e.textContent=String(v)}}catch(_){}}
function mount(){
 if(!isLeader()){document.getElementById('dbestLeaderOnboarding')?.remove();return}
 css();const root=document.querySelector('.classicDash');if(!root||document.getElementById('dbestLeaderOnboarding'))return;
 const host=document.createElement('section');host.id='dbestLeaderOnboarding';host.innerHTML=`
 <div class="loHead"><div><h3>⭐ Leader Exclusive • Partner Onboarding</h3><div class="loMeta">Complete assisted onboarding for Vendor, Vaahak or Service Partner. ₹100 is credited only after verified activation.</div></div><span style="padding:5px 8px;border-radius:999px;background:#eaf1ff;color:#175cff;font-size:10px;font-weight:900">LEADER ONLY</span></div>
 <div class="loGrid">
  <button class="loBtn vendor" type="button" data-kind="Vendor"><b>🏪 Onboard Vendor</b><small>Complete registration, documents & agreement • Earn ₹100 after activation</small></button>
  <button class="loBtn vaahak" type="button" data-kind="Vaahak"><b>🛵 Onboard Vaahak</b><small>Complete driver/vehicle onboarding • Earn ₹100 after activation</small></button>
  <button class="loBtn service" type="button" data-kind="Service Partner"><b>🧰 Onboard Service Partner</b><small>Complete KYC/service onboarding • Earn ₹100 after activation</small></button>
 </div>
 <div class="loStats"><div class="loStat"><small>Started</small><b id="loStarted">—</b></div><div class="loStat"><small>Pending</small><b id="loPending">—</b></div><div class="loStat"><small>Activated</small><b id="loActivated">—</b></div><div class="loStat"><small>Incentive Earned</small><b id="loEarned">—</b></div></div>
 <div class="loNote"><b>Security:</b> The Leader may fill and upload the onboarding details, but the applicant must provide their own OTP/agreement consent and company payment where applicable. No personal collection of company payments is allowed.</div>`;
 const walletBtn=[...root.querySelectorAll('button')].find(x=>/My Wallet/i.test(x.textContent||''));if(walletBtn?.parentElement)walletBtn.parentElement.insertAdjacentElement('afterend',host);else root.prepend(host);
 host.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>launch(b.dataset.kind,b)));
 refresh();
 try{window.DBEST_I18N?.apply?.();window.DBEST_USER_I18N?.apply?.()}catch(_){}
}
const raw=window.memberDash;if(typeof raw==='function'&&!raw.__dbestLeaderOnboard){const w=function(){const out=raw.apply(this,arguments);setTimeout(mount,80);return out};w.__dbestLeaderOnboard=true;window.memberDash=w;try{memberDash=w}catch(_){}}
new MutationObserver(()=>setTimeout(mount,60)).observe(document.documentElement,{childList:true,subtree:true});
[100,500,1200,2500].forEach(ms=>setTimeout(mount,ms));
window.DBEST_LEADER_PARTNER_ONBOARDING={version:VERSION,mount,refresh,launch};
})();