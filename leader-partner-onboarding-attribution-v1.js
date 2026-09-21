(function(){
'use strict';
const VERSION='20260922-leader-onboarding-attribution-v1';
if(window.DBEST_LEADER_ONBOARDING_ATTR?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/leader-partner-onboarding-live',STORE='dbest_leader_onboard_token_v1';
const params=new URLSearchParams(location.search),incoming=params.get('leader_onboard');
function tok(){try{return incoming||sessionStorage.getItem(STORE)||''}catch(_){return incoming||''}}
function save(v){try{sessionStorage.setItem(STORE,v)}catch(_){}}
async function call(body){const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok&&r.status!==202)throw new Error(d.error||d.detail||('HTTP '+r.status));return {status:r.status,data:d}}
function pageType(){const p=location.pathname.toLowerCase(),t=(document.title||'').toLowerCase();if(p.includes('vendor')||t.includes('vendor'))return'Vendor';if(p.includes('vaahak')||t.includes('vaahak'))return'Vaahak';if(p.includes('servicepartner')||p.includes('service-partner')||t.includes('service partner'))return'Service Partner';return''}
function banner(type,name){let d=document.getElementById('leaderOnboardBanner');if(!d){d=document.createElement('div');d.id='leaderOnboardBanner';d.style.cssText='position:sticky;top:0;z-index:99999;background:#eaf7ef;color:#175b39;border-bottom:1px solid #bfe6cf;padding:9px 12px;text-align:center;font:800 12px system-ui';document.body.prepend(d)}d.textContent='✓ Leader-assisted '+type+' onboarding • Source: '+name+' • ₹100 incentive after verified activation'}
async function validate(){const t=tok();if(!t)return null;try{const {data}=await call({action:'validate',token:t});const s=data?.source;if(!s)return null;const pt=pageType();if(pt&&s.partnerType!==pt)return null;save(t);banner(s.partnerType,s.leaderName||s.leaderId);return s}catch(_){return null}}
function extract(form){const els=[...form.querySelectorAll('input,select,textarea')];let email='',mobile='',partnerId='';for(const e of els){const n=String(e.name||e.id||'').toLowerCase(),v=String(e.value||'').trim();if(!email&&(e.type==='email'||n.includes('email')))email=v;if(!mobile&&(n.includes('mobile')||n.includes('phone')))mobile=v;if(!partnerId&&(n==='id'||n.includes('partner_id')||n.includes('vendor_id')||n.includes('vaahak_id')))partnerId=v}return{email,mobile,partnerId}}
let payload=null,start=0,timer=null,claimed=false;
async function tryClaim(){if(claimed||!payload||!tok())return;try{const {data}=await call({action:'claim',token:tok(),...payload});if(data?.claimed){claimed=true;clearInterval(timer);banner(pageType(),'Linked to Leader')}}catch(e){if(/already_attributed|source_conflict/i.test(String(e.message||'')))clearInterval(timer)}if(Date.now()-start>180000)clearInterval(timer)}
function startClaim(p){if(!p.email&&!p.mobile&&!p.partnerId)return;payload=p;start=Date.now();setTimeout(tryClaim,900);clearInterval(timer);timer=setInterval(tryClaim,3000)}
function wire(){document.querySelectorAll('form').forEach(f=>{if(f.dataset.leaderAttrWired)return;f.dataset.leaderAttrWired='1';f.addEventListener('submit',()=>{const p=extract(f);if(p.email||p.mobile||p.partnerId)startClaim(p)},true)})}
function preserve(){const t=tok();if(!t)return;document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href')||'';if(!h||h.startsWith('#')||h.startsWith('javascript:')||h.startsWith('mailto:')||h.startsWith('tel:'))return;try{const u=new URL(h,location.origin);if(u.origin!==location.origin)return;const target=u.pathname.toLowerCase();if(/vendor|vaahak|servicepartner|service-partner/.test(target)){u.searchParams.set('leader_onboard',t);a.setAttribute('href',u.pathname+u.search+u.hash)}}catch(_){}})}
validate().then(s=>{if(!s)return;wire();preserve();const obs=new MutationObserver(()=>{wire();preserve()});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{try{if(s.partnerType==='Vendor'&&typeof window.show==='function')window.show('register');else if(s.partnerType==='Vaahak')document.getElementById('goRegister')?.click()}catch(_){}},250)});
window.DBEST_LEADER_ONBOARDING_ATTR={version:VERSION};
})();