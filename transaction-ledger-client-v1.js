(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),
key=String(cfg.supabasePublishableKey||''),TOKEN_KEY='dbest_member_live_token';
function token(){return String(localStorage.getItem(TOKEN_KEY)||'')}
async function call(body){
 const t=token();if(!t||!base||!key)throw new Error('member_session_required');
 const r=await fetch(base+'/functions/v1/transaction-ledger-live',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'x-dbest-member-token':t,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'transaction_ledger_failed');return d;
}
function toLocal(r){
 const m=r.metadata&&typeof r.metadata==='object'?r.metadata:{},dt=r.transaction_date||r.created_at||new Date().toISOString();
 return {id:String(r.transaction_id||''),internalTransactionId:String(r.transaction_id||''),userId:String(r.actor_ref||''),user:String(r.actor_name||''),section:String(r.section||'DBest'),sub:String(r.subsection||''),amount:Number(r.amount||0),status:String(r.payment_status||'Pending'),partner:String(r.counterparty_name||''),created:new Date(dt).toLocaleString('en-IN'),createdISO:dt,details:String(r.reference||''),source:String(m.source||'DBest'),partnerUrl:String(m.partnerUrl||''),payoutAmount:Number(r.payout_amount||0),meta:m};
}
async function record(x){if(!x?.id)return null;return call({action:'record',transaction:x})}
async function syncAll(renderAfter=true){
 const d=await call({action:'mine'}),remote=Array.isArray(d.transactions)?d.transactions.map(toLocal):[];
 let local=[];try{local=JSON.parse(localStorage.getItem('d2_txs')||'[]')}catch(e){}
 if(!Array.isArray(local))local=[];
 const map=new Map(local.map(x=>[String(x?.id||''),x]));
 for(const x of remote)if(x.id)map.set(x.id,{...(map.get(x.id)||{}),...x});
 const merged=[...map.values()].sort((a,b)=>new Date(b.createdISO||0)-new Date(a.createdISO||0));
 localStorage.setItem('d2_txs',JSON.stringify(merged));
 try{if(typeof txs!=='undefined'&&Array.isArray(txs)){txs.splice(0,txs.length,...merged)}}catch(e){}
 if(renderAfter){try{if(typeof render==='function')render()}catch(e){}}
 return merged;
}
window.DBEST_TRANSACTION_LEDGER={version:VERSION,record,syncAll,mine:()=>call({action:'mine'})};
setTimeout(()=>{if(token())syncAll(false).catch(()=>{})},350);
})();