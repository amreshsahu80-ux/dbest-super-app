(function(){
'use strict';
const V='20260906-member-registration-authority-v3-direct';
if(window.DBEST_MEMBER_REG_AUTHORITY?.version===V)return;
let corePromise=null,bankPromise=null;
function load(src,id){return new Promise((resolve,reject)=>{let s=document.getElementById(id);if(s){if(s.dataset.loaded==='1')return resolve();s.addEventListener('load',resolve,{once:true});s.addEventListener('error',reject,{once:true});return}s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;(document.body||document.documentElement).appendChild(s)})}
async function core(){if(window.DBEST_MEMBER_REG_STREAMLINE?.open)return window.DBEST_MEMBER_REG_STREAMLINE;if(!corePromise)corePromise=load('/member-registration-streamline-v1.js?v=20260906-registration-core-v3','dbest-member-registration-core-v3').then(()=>window.DBEST_MEMBER_REG_STREAMLINE).finally(()=>{corePromise=null});const api=await corePromise;if(!api?.open)throw new Error('Registration unavailable');return api}
async function bank(){if(window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG?.scan)return window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG;if(!bankPromise)bankPromise=load('/member-payout-account-registration-v1.js?v=20260906-bank-direct-v2','dbest-member-bank-direct-v2').then(()=>window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG).finally(()=>{bankPromise=null});return await bankPromise}
async function open(tier){try{const api=await core();api.open(String(tier||'').toLowerCase());const b=await bank();requestAnimationFrame(()=>{try{b?.scan?.()}catch(e){}})}catch(e){console.error('DBest registration',e);try{typeof toast==='function'?toast('Registration could not open. Please retry.'):alert('Registration could not open. Please retry.')}catch(_){}}}
async function ownerAdd(){try{const api=await core();api.ownerAdd();const b=await bank();requestAnimationFrame(()=>{try{b?.scan?.()}catch(e){}})}catch(e){console.error('DBest owner onboarding',e)}}
function install(){try{window.reg=open}catch(e){}try{window.ownerQuickAddUser=ownerAdd}catch(e){}}
install();setTimeout(install,600);setTimeout(install,1800);setTimeout(install,3200);
window.DBEST_MEMBER_REG_AUTHORITY={version:V,open,ownerAdd,ensure:core,ensureBank:bank};
})();