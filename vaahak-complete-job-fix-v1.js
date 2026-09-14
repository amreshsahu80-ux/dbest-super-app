(function(){
'use strict';
if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;
if(window.DBEST_VAAHAK_COMPLETE_FIX)return;
let locked=false;
window.completeJob=async function(id){
  if(locked)return;
  locked=true;
  try{
    const j=(typeof currentJob!=='undefined'&&currentJob&&String(currentJob.id)===String(id))?currentJob:null;
    if(!j)throw new Error('active_job_missing');
    if(j.kind==='delivery'){
      await comCall('complete_delivery',{jobId:id},true);
    }else{
      await call('complete',{jobId:id},true);
    }
    try{renderJob(null)}catch(_){ }
    try{note((j.kind==='delivery'?'Delivery':'Ride')+' completed.')}catch(_){ }
    try{stopGps()}catch(_){ }
    setTimeout(()=>{try{loadStatus(true)}catch(_){ }},150);
  }catch(e){
    try{note('Could not complete job: '+String(e&&e.message||e),false)}catch(_){ }
  }finally{locked=false}
};
window.DBEST_VAAHAK_COMPLETE_FIX={version:'1.0.0'};
})();