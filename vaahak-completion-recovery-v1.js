(function(){
'use strict';
if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;
if(window.DBEST_VAAHAK_COMPLETION_RECOVERY?.version==='1.1.0')return;
const C=window.DBEST_RUNTIME_CONFIG||{},B=String(C.supabaseUrl||'').replace(/\/$/,''),K=C.supabasePublishableKey||'',TOK='dbest_vaahak_live_token',DONE=B+'/functions/v1/vaahak-complete-live';
const tok=()=>{try{return localStorage.getItem(TOK)||''}catch(_){return''}};
async function completeRide(jobId){
 const h={'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'};if(tok())h['x-vaahak-token']=tok();
 const r=await fetch(DONE,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({jobId:String(jobId||'')})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(d.detail||d.error||'completion_failed');e.data=d;throw e}
 return d;
}
async function robustComplete(jobId){
 const j=(typeof currentJob!=='undefined'?currentJob:null);
 if(!j||String(j.id)!==String(jobId))return;
 if(String(j.status)!=='Trip Started')return;
 if(!['Received','Prepaid','Legacy Completed'].includes(String(j.payment_status||''))){try{note('Confirm payment first.',false)}catch(_){}return}
 try{
  if(typeof busy!=='undefined'&&busy)return;
  if(typeof busy!=='undefined')busy=true;
  const out=j.kind==='delivery'?await comCall('complete_delivery',{jobId},true):await completeRide(jobId);
  try{renderJob(null)}catch(_){}
  try{currentJob=null}catch(_){}
  try{note((j.kind==='delivery'?'Delivery':'Ride')+' completed.')}catch(_){}
  try{stopGps()}catch(_){}
  try{await loadStatus(true)}catch(_){}
  return out;
 }catch(e){try{note('Could not complete job: '+(e?.message||e),false)}catch(_){}throw e}
 finally{try{if(typeof busy!=='undefined')busy=false}catch(_){}}
}
window.completeJob=robustComplete;
setInterval(()=>{try{if(window.completeJob!==robustComplete)window.completeJob=robustComplete}catch(_){}},1000);
window.DBEST_VAAHAK_COMPLETION_RECOVERY={version:'1.1.0'};
})();