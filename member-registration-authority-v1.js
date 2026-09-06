(function(){
'use strict';
if(window.DBEST_MEMBER_REG_AUTHORITY)return;
const V='20260906-member-registration-authority-v1';
let loading=null;
const $=s=>document.querySelector(s);
function load(src,id){return new Promise((resolve,reject)=>{let s=document.getElementById(id);if(s){if(s.dataset.loaded==='1')return resolve();s.addEventListener('load',resolve,{once:true});s.addEventListener('error',reject,{once:true});return} s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;(document.body||document.documentElement).appendChild(s)})}
async function ensure(){
 if(window.DBEST_MEMBER_REG_STREAMLINE?.open)return window.DBEST_MEMBER_REG_STREAMLINE;
 if(loading)return loading;
 loading=load('/member-registration-streamline-v1.js?v=20260906-streamlined-registration-v2-aadhaar','dbest-member-registration-authority-core').then(()=>window.DBEST_MEMBER_REG_STREAMLINE).finally(()=>{loading=null});
 return loading;
}
async function ensureBank(){
 if(!window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG){try{await load('/member-payout-account-registration-v1.js?v=20260906-member-payout-account-v1.1','dbest-member-payout-account-authority')}catch(e){}}
 try{window.DBEST_MEMBER_PAYOUT_ACCOUNT_REG?.scan?.()}catch(e){}
}
function open(tier){
 tier=String(tier||'').toLowerCase();
 ensure().then(api=>{if(!api?.open)throw new Error('Registration unavailable');api.open(tier);setTimeout(ensureBank,0);setTimeout(ensureBank,180);setTimeout(ensureBank,500)}).catch(e=>{console.error('DBest member registration open',e);try{typeof toast==='function'?toast('Registration is temporarily unavailable. Please retry.'):alert('Registration is temporarily unavailable. Please retry.')}catch(_){}})
}
function ownerAdd(){ensure().then(api=>{if(api?.ownerAdd)api.ownerAdd();setTimeout(ensureBank,0);setTimeout(ensureBank,180)}).catch(()=>{})}
function lock(){
 try{Object.defineProperty(window,'reg',{configurable:true,get(){return open},set(){}})}catch(e){window.reg=open}
 try{Object.defineProperty(window,'ownerQuickAddUser',{configurable:true,get(){return ownerAdd},set(){}})}catch(e){window.ownerQuickAddUser=ownerAdd}
}
function heal(){lock();if($('#dbestSimpleMemberForm')||$('#dbestOwnerSimpleMemberForm'))ensureBank()}
const mo=new MutationObserver(()=>heal());
if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,400,900,1800,3500,7000].forEach(ms=>setTimeout(heal,ms));
window.addEventListener('pageshow',heal);
window.DBEST_MEMBER_REG_AUTHORITY={version:V,open,ownerAdd,heal};
})();