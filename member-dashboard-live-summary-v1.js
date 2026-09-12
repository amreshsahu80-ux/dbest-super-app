(function(){
'use strict';
const VERSION='20260912-live-wallet-dashboard-v1';
if(window.DBEST_MEMBER_DASHBOARD_LIVE?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const TOKEN_KEY='dbest_member_live_token';
let cache=null,cacheAt=0,pending=null;
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function token(){try{return localStorage.getItem(TOKEN_KEY)||''}catch(_){return''}}
function normalizeTx(t){return {id:String(t.transaction_id||t.id||''),userId:String(t.actor_ref||''),user:String(t.actor_name||''),section:String(t.section||''),sub:String(t.subsection||''),amount:Number(t.amount||0),status:String(t.payment_status||''),partner:String(t.counterparty_name||''),createdISO:String(t.transaction_date||t.created_at||''),created:String(t.transaction_date||t.created_at||''),details:String(t.reference||''),payoutAmount:Number(t.payout_amount||0),meta:t.metadata||{}}}
function mergeTx(list){try{if(!Array.isArray(list)||!Array.isArray(window.txs))return;const by=new Map(window.txs.map(x=>[String(x.id||''),x]));for(const raw of list){const t=normalizeTx(raw),id=t.id;if(!id)continue;if(by.has(id))Object.assign(by.get(id),t);else{window.txs.push(t);by.set(id,t)}}window.txs.sort((a,b)=>new Date(b.createdISO||0)-new Date(a.createdISO||0))}catch(_){}}
async function load(force=false){
 if(!BASE||!KEY||!token())return null;
 if(!force&&cache&&Date.now()-cacheAt<10000)return cache;
 if(pending)return pending;
 pending=(async()=>{const r=await fetch(BASE+'/functions/v1/member-network-live',{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-member-token':token()},body:'{}'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'dashboard_summary_failed');cache=d;cacheAt=Date.now();mergeTx(d.transactions||[]);return d})().finally(()=>pending=null);
 return pending;
}
function setByLabel(root,label,value){for(const card of root.querySelectorAll('.earnCard,.kpi')){const s=card.querySelector('small');if(String(s?.textContent||'').trim()===label){const b=card.querySelector('b');if(b)b.textContent=String(value);return true}}return false}
function paint(d,id){const s=d?.summary;if(!s||String(d.viewerId||'')!==String(id||''))return;const root=document.querySelector('.classicDash');if(!root)return;
 setByLabel(root,'Your Earnings Today',money(s.earnings?.today));
 setByLabel(root,'This Month Till Now',money(s.earnings?.month));
 setByLabel(root,'This Year',money(s.earnings?.year));
 setByLabel(root,'Since Joining',money(s.earnings?.all));
 setByLabel(root,'My Direct Txns',Number(s.direct?.transactions||0).toLocaleString('en-IN'));
 setByLabel(root,'My Direct Business',money(s.direct?.business));
 setByLabel(root,'My Direct Earnings',money(s.direct?.earnings));
 setByLabel(root,'Direct Branches',Number(s.network?.directBranches||0).toLocaleString('en-IN'));
 setByLabel(root,'Total Team',Number(s.network?.totalTeam||0).toLocaleString('en-IN'));
 setByLabel(root,'Team Transactions',Number(s.network?.transactions||0).toLocaleString('en-IN'));
 setByLabel(root,'Team Business',money(s.network?.business));
 setByLabel(root,'Downline Earnings',money(s.network?.earnings));
}
function install(){
 if(typeof window.qualifyingTx==='function'&&!window.qualifyingTx.__dbestVerifiedPatched){const old=window.qualifyingTx;const patched=function(x){return old(x)||(String(x?.section||'')!=='Membership'&&/Verified/i.test(String(x?.status||''))&&!/(Failed|Rejected|Cancelled|Pending)/i.test(String(x?.status||'')))};patched.__dbestVerifiedPatched=true;window.qualifyingTx=patched}
 if(typeof window.memberDash!=='function'||window.memberDash.__dbestLiveWrapped)return false;
 const original=window.memberDash;
 const wrapped=function(id){const r=original.apply(this,arguments);load(true).then(d=>paint(d,id)).catch(e=>console.warn('DBest live dashboard summary',e));return r};wrapped.__dbestLiveWrapped=true;window.memberDash=wrapped;return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},100);
window.DBEST_MEMBER_DASHBOARD_LIVE={version:VERSION,refresh:async()=>{const d=await load(true);const id=window.session?.id;paint(d,id);return d}};
})();