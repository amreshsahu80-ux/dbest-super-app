(function(){
'use strict';
const VERSION='20260921-wallet-ledger-authority-v4';
if(window.DBEST_MEMBER_DASHBOARD_LIVE?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const TOKEN_KEY='dbest_member_live_token';
const CACHE_MS=10000;
const MERGE_LIMIT=60;
let cache=null,cacheAt=0,pending=null;
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function token(){try{return localStorage.getItem(TOKEN_KEY)||''}catch(_){return''}}
function normalizeTx(t){return {id:String(t.transaction_id||t.id||''),userId:String(t.actor_ref||''),user:String(t.actor_name||''),section:String(t.section||''),sub:String(t.subsection||''),amount:Number(t.amount||0),status:String(t.payment_status||''),partner:String(t.counterparty_name||''),createdISO:String(t.transaction_date||t.created_at||''),created:String(t.transaction_date||t.created_at||''),details:String(t.reference||''),payoutAmount:Number(t.payout_amount||0),meta:t.metadata||{}}}
function mergeTx(list){try{if(!Array.isArray(list)||!Array.isArray(window.txs))return;const recent=list.slice(0,MERGE_LIMIT);const by=new Map(window.txs.map(x=>[String(x.id||''),x]));for(const raw of recent){const t=normalizeTx(raw),id=t.id;if(!id)continue;if(by.has(id))Object.assign(by.get(id),t);else{window.txs.push(t);by.set(id,t)}}window.txs.sort((a,b)=>new Date(b.createdISO||0)-new Date(a.createdISO||0))}catch(_){}}
async function load(force=false){
 if(!BASE||!KEY||!token())return null;
 if(!force&&cache&&Date.now()-cacheAt<CACHE_MS)return cache;
 if(pending)return pending;
 pending=(async()=>{const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-member-token':token()};const [nr,wr]=await Promise.all([fetch(BASE+'/functions/v1/member-network-live',{method:'POST',cache:'no-store',headers,body:'{}'}),fetch(BASE+'/functions/v1/member-wallet-live',{method:'POST',cache:'no-store',headers,body:JSON.stringify({action:'status'})})]);const d=await nr.json().catch(()=>({}));if(!nr.ok)throw new Error(d.error||'dashboard_summary_failed');const wd=await wr.json().catch(()=>({}));if(wr.ok)d.walletStatus=wd;cache=d;cacheAt=Date.now();mergeTx(d.transactions||[]);return d})().finally(()=>pending=null);
 return pending;
}
function setByLabel(root,label,value,selectors='.earnCard,.kpi,.directCard'){
 for(const card of root.querySelectorAll(selectors)){const s=card.querySelector('small');if(String(s?.textContent||'').trim()===label){const b=card.querySelector('b');if(b)b.textContent=String(value);return true}}
 return false;
}
function paintMember(d,id){const s=d?.summary;if(!s||String(d.viewerId||'')!==String(id||''))return;const root=document.querySelector('.classicDash');if(!root)return;
 const we=d?.walletStatus?.wallet?.earnings_summary||null;
 setByLabel(root,'Your Earnings Today',money(we?.today??s.earnings?.today));
 setByLabel(root,'This Month Till Now',money(we?.month??s.earnings?.month));
 setByLabel(root,'This Year',money(we?.year??s.earnings?.year));
 setByLabel(root,'Since Joining',money(we?.all??s.earnings?.all));
 setByLabel(root,'My Direct Txns',Number(s.direct?.transactions||0).toLocaleString('en-IN'));
 setByLabel(root,'My Direct Business',money(s.direct?.business));
 setByLabel(root,'My Direct Earnings',money(we?.directNet??s.direct?.earnings));
 setByLabel(root,'Direct Branches',Number(s.network?.directBranches||0).toLocaleString('en-IN'));
 setByLabel(root,'Total Team',Number(s.network?.totalTeam||0).toLocaleString('en-IN'));
 setByLabel(root,'Team Transactions',Number(s.network?.transactions||0).toLocaleString('en-IN'));
 setByLabel(root,'Team Business',money(s.network?.business));
 setByLabel(root,'Downline Earnings',money(s.network?.earnings));
}
function paintDirect(d,id){
 const s=d?.summary;if(!s||String(d.viewerId||'')!==String(id||''))return;
 const root=document.querySelector('.classicDash');if(!root||!/My Direct Business/i.test(String(document.body.innerText||'')))return;
 const p=s.direct?.periods||{},we=d?.walletStatus?.wallet?.earnings_summary||null;
 setByLabel(root,'Direct Earning Today',money(we?.today??p.today));
 setByLabel(root,'This Month',money(we?.month??p.month));
 setByLabel(root,'This Year',money(we?.year??p.year));
 setByLabel(root,'Since Joining',money(we?.directNet??p.all));
 setByLabel(root,'Total Direct Earning',money(we?.directNet??s.direct?.earnings));
 const breakdown=Array.isArray(s.direct?.breakdown)?s.direct.breakdown:[];
 const byService=new Map(breakdown.map(x=>[String(x.serviceKey||'').toLowerCase(),x]));
 for(const card of root.querySelectorAll('.sectionEarningCard')){
   const label=String(card.querySelector('small')?.textContent||'').trim();
   let key='';
   if(/marketplace/i.test(label))key='marketplace';
   else if(/cab/i.test(label))key='cab';
   else if(/mutual/i.test(label))key='mutual funds';
   else if(/flight|hotel|package|travel/i.test(label))key='travel';
   if(!key)continue;
   let x=byService.get(key);
   if(!x&&key==='cab')x=byService.get('cab booking');
   if(!x&&key==='travel')x=byService.get('flights hotels packages');
   if(!x)continue;
   const b=card.querySelector('b');if(b)b.textContent=money(x.earning);
   const sm=card.querySelectorAll('small')[1];if(sm)sm.textContent=Number(x.count||0)+' payout event'+(Number(x.count||0)===1?'':'s')+' • Payout base '+money(x.business);
 }
}
function install(){
 if(typeof window.qualifyingTx==='function'&&!window.qualifyingTx.__dbestVerifiedPatched){const old=window.qualifyingTx;const patched=function(x){return old(x)||(String(x?.section||'')!=='Membership'&&/Verified/i.test(String(x?.status||''))&&!/(Failed|Rejected|Cancelled|Pending)/i.test(String(x?.status||'')))};patched.__dbestVerifiedPatched=true;window.qualifyingTx=patched}
 let ok=false;
 if(typeof window.memberDash==='function'&&!window.memberDash.__dbestLiveWrapped){const original=window.memberDash;const wrapped=function(id){const r=original.apply(this,arguments);setTimeout(()=>load(true).then(d=>paintMember(d,id)).catch(()=>{}),60);return r};wrapped.__dbestLiveWrapped=true;window.memberDash=wrapped;ok=true}
 if(typeof window.directBusinessDashboard==='function'&&!window.directBusinessDashboard.__dbestWalletWrapped){const original=window.directBusinessDashboard;const wrapped=function(id){const r=original.apply(this,arguments);setTimeout(()=>load(true).then(d=>paintDirect(d,id)).catch(e=>console.warn('DBest direct wallet summary',e)),80);return r};wrapped.__dbestWalletWrapped=true;window.directBusinessDashboard=wrapped;ok=true}
 return ok;
}
let tries=0;const timer=setInterval(()=>{tries++;install();if(tries>120)clearInterval(timer)},100);
document.addEventListener('click',()=>setTimeout(()=>{install();const id=window.session?.id;if(id)load(false).then(d=>{paintMember(d,id);paintDirect(d,id)}).catch(()=>{})},120),true);
window.DBEST_MEMBER_DASHBOARD_LIVE={version:VERSION,refresh:async()=>{const d=await load(true);const id=window.session?.id;paintMember(d,id);paintDirect(d,id);return d}};
})();