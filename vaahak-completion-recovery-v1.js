(function(){
'use strict';
if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;
if(window.DBEST_VAAHAK_COMPLETION_RECOVERY)return;
async function robustComplete(jobId){
  const j=(typeof currentJob!=='undefined'?currentJob:null);
  if(!j||String(j.id)!==String(jobId))return;
  if(String(j.status)!=='Trip Started')return;
  if(!['Received','Prepaid','Legacy Completed'].includes(String(j.payment_status||''))){try{note('Confirm payment first.',false)}catch(_){}return}
  try{
    if(typeof busy!=='undefined'&&busy)return;
    if(typeof busy!=='undefined')busy=true;
    const run=async()=>j.kind==='delivery'?comCall('complete_delivery',{jobId},true):call('complete',{jobId},true);
    let out;
    try{out=await run()}catch(e){await new Promise(r=>setTimeout(r,1200));out=await run()}
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
setInterval(()=>{try{if(typeof window.completeJob!=='function'||window.completeJob===robustComplete)return;window.completeJob=robustComplete}catch(_){}},1000);
window.DBEST_VAAHAK_COMPLETION_RECOVERY={version:'1.0.0'};
})();