const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('vaahak-completion-recovery-v1.js','utf8');
async function main(){
 const calls=[],messages=[],storage=new Map([['dbest_vaahak_live_token','MOCK-PARTNER-TOKEN']]);
 let apiReply={ok:true,status:200,body:{ok:true,job:{id:'FAKE-JOB',status:'Completed'}}};
 const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://never-execute.example.invalid',supabasePublishableKey:'mock-publishable-key'}};
 const ctx={window,location:{pathname:'/vaahak-standalone-v2.html'},localStorage:{getItem:k=>storage.get(k)||null},
  currentJob:{id:'FAKE-JOB',kind:'ride',status:'Trip Started',payment_status:'Received'},
  busy:false,renderJob(){},stopGps(){},loadStatus:async()=>{},note:(m,ok)=>messages.push({m,ok}),
  setInterval(){return 1},console:{error(){},warn(){}},
  fetch:async(url,opts)=>{
   const body=JSON.parse(opts.body||'{}');calls.push({url:String(url),body,headers:opts.headers});
   return {ok:apiReply.ok,status:apiReply.status,json:async()=>apiReply.body};
  }
 };
 vm.runInNewContext(source,ctx,{filename:'vaahak-completion-recovery-v1.js'});
 assert.equal(typeof window.completeJob,'function');
 await window.completeJob('FAKE-JOB');
 assert.equal(calls.length,1,'exactly one completion request');
 assert.ok(calls[0].url.endsWith('/functions/v1/vaahak-live'),'must call authoritative Vaahak service');
 assert.equal(calls[0].body.action,'complete');
 assert.equal(calls[0].body.jobId,'FAKE-JOB');
 assert.equal(calls[0].headers['x-vaahak-token'],'MOCK-PARTNER-TOKEN');
 assert.equal(ctx.currentJob,null,'successful completion clears active job');
 ctx.currentJob={id:'FAKE-JOB2',kind:'ride',status:'Trip Started',payment_status:'Pending'};
 const before=calls.length;await window.completeJob('FAKE-JOB2');
 assert.equal(calls.length,before,'unpaid rides must not send completion');
 ctx.currentJob={id:'FAKE-RETURN',kind:'ride',status:'Trip Started',payment_status:'Received'};
 apiReply={ok:false,status:409,body:{error:'return_leg_not_started'}};
 await assert.rejects(window.completeJob('FAKE-RETURN'),/return_leg_not_started/);
 assert.equal(calls.length,before+1);
 assert.ok(calls.at(-1).url.endsWith('/functions/v1/vaahak-live'));
 assert.equal(ctx.currentJob.id,'FAKE-RETURN','failed completion must preserve pending job');
 assert.equal(window.DBEST_VAAHAK_COMPLETION_RECOVERY.completionEndpoint,'vaahak-live');
 console.log('PASS: isolated Vaahak completion uses authoritative settlement endpoint, rejects unpaid and preserves return-leg failures.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
