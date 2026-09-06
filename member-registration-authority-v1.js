(function(){
'use strict';
if(window.DBEST_MEMBER_REG_AUTHORITY?.version==='20260906-member-registration-authority-v2')return;
const V='20260906-member-registration-authority-v2';
let loading=null,bankLoading=null;
const $=s=>document.querySelector(s);
function waitFor(check,ms=2600){return new Promise((resolve,reject)=>{const end=Date.now()+ms;(function tick(){let v=null;try{v=check()}catch(e){}if(v)return resolve(v);if(Date.now()>=end)return reject(new Error('timeout'));setTimeout(tick,60)})()})}
function inject(src,id){return new Promise((resolve,reject)=>{try{document.getElementById(id)?.remove()}catch(e){}const s=document.createElement('script');s.id=id;s.src=src+(src.includes('?')?'&':'?')+'authorityTs='+Date.now();s.async=true;let done=false;const finish=(ok)=>{if(done)return;done=true;ok?resolve():reject(new Error('script_load_failed'))};s.onload=()=>finish(true);s.onerror=()=>finish(false);(document.body||document.documentElement).appendChild(s);setTimeout(()=>finish(false),4500)})}
async function ensure(){
  if(window.DBEST_MEMBER_REG_STREAMLINE?.open)return window.DBEST_MEMBER_REG_STREAMLINE;
  if(loading)return loading;
  loading=(async()=>{
    try{return await waitFor(()=>window.DBEST_MEMBER_REG_STREAMLINE?.open&&window.DBEST_MEMBER_REG_STREAMLINE,700)}catch(e){}
    await inject('/member-registration-streamline-v1.js?v=20260906-streamlined-registration-v2-aadhaar','dbest-member-registration-authority-core-v2');
    return await waitFor(()=>window.DBEST_MEMBER_REG_STREAMLINE?.open&&window.DBEST_MEMBER_REG_STREAMLINE,2400);
  })().finally(()=>{loading=null});
  return loading;
}
async function ensureBank(){
  if(window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG?.scan){try{window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG.scan()}catch(e){}return window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG}
  if(bankLoading)return bankLoading;
  bankLoading=(async()=>{
    try{return await waitFor(()=>window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG?.scan&&window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG,500)}catch(e){}
    await inject('/member-payout-account-registration-v1.js?v=20260906-member-payout-account-v1.1','dbest-member-payout-account-authority-v2');
    const api=await waitFor(()=>window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG?.scan&&window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG,2200);try{api.scan()}catch(e){}return api;
  })().finally(()=>{bankLoading=null});
  return bankLoading;
}
async function open(tier){
  tier=String(tier||'').toLowerCase();
  try{const api=await ensure();if(!api?.open)throw new Error('Registration unavailable');api.open(tier);setTimeout(()=>ensureBank().catch(()=>{}),0);setTimeout(()=>ensureBank().catch(()=>{}),180);setTimeout(()=>ensureBank().catch(()=>{}),520)}catch(e){console.error('DBest member registration open',e);try{typeof toast==='function'?toast('Registration could not open. Please tap Register again.'):alert('Registration could not open. Please tap Register again.')}catch(_){}}
}
async function ownerAdd(){try{const api=await ensure();if(!api?.ownerAdd)throw new Error('Owner onboarding unavailable');api.ownerAdd();setTimeout(()=>ensureBank().catch(()=>{}),0);setTimeout(()=>ensureBank().catch(()=>{}),180)}catch(e){console.error('DBest owner member onboarding',e)}}
function lock(){
  try{const d=Object.getOwnPropertyDescriptor(window,'reg');if(!d||d.configurable!==false)Object.defineProperty(window,'reg',{configurable:false,enumerable:true,get(){return open},set(){}})}catch(e){try{window.reg=open}catch(_){}}
  try{const d=Object.getOwnPropertyDescriptor(window,'ownerQuickAddUser');if(!d||d.configurable!==false)Object.defineProperty(window,'ownerQuickAddUser',{configurable:false,enumerable:true,get(){return ownerAdd},set(){}})}catch(e){try{window.ownerQuickAddUser=ownerAdd}catch(_){}}
}
function heal(){lock();if($('#dbestSimpleMemberForm')||$('#dbestOwnerSimpleMemberForm'))ensureBank().catch(()=>{})}
lock();const mo=new MutationObserver(()=>heal());if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});[0,80,220,500,1000,1800,3200,6000].forEach(ms=>setTimeout(heal,ms));window.addEventListener('pageshow',heal);window.DBEST_MEMBER_REG_AUTHORITY={version:V,open,ownerAdd,heal,ensure,ensureBank};
})();