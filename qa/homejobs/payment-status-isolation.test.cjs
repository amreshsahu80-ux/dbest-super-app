'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {transformSync}=require('esbuild');
const original=fs.readFileSync('qa/homejobs/hyperlocal-job-execution-v9-baseline.ts','utf8');
const upgraded=fs.readFileSync('qa/homejobs/hyperlocal-job-execution-payment-status-v10.ts','utf8');
const change="payment_status:txStatus,";
test('The ONLY production code change removes the payment_status overwrite',()=>{
 assert.equal((original.match(/payment_status:txStatus,/g)||[]).length,1);
 assert(!upgraded.includes(change));
 assert.equal(original.replace(change,''),upgraded);
 assert(upgraded.includes('hyperlocalExecution:{status:updated.status'));
});
const token='QA-SYNTHETIC-SERVICE-TOKEN',member='QA-PARTNER',hash=crypto.createHash('sha256').update(token).digest('hex');
function simulatedServer(init={}){
 const tables={
  member_sessions_live:[{member_id:member,token_hash:hash,expires_at:'2099-12-01'}],
  onboarding_records:[{external_id:member,kind:'member',status:'Active',deleted_at:null}],
  service_partner_profiles_live:[{member_id:member,approval_status:init.approved===false?'Pending':'Approved',active:init.approved!==false,operational_hold:false}],
  hyperlocal_jobs_live:[{transaction_id:'TX-HOME-SAFE-01',member_id:'QA-CUSTOMER',assigned_partner_member_id:member,status:init.jobStatus||'Assigned',offer_expires_at:'2099-12-01T00:00:00Z',accepted_at:null,started_at:null,completed_at:null}],
  service_requests_live:[{transaction_id:'TX-HOME-SAFE-01',status:'New',owner_note:''}],
  transactions:[{transaction_id:'TX-HOME-SAFE-01',payment_status:init.paymentStatus||'Verified',metadata:{paymentEvidence:'must-stay'},amount:350,payment_mode:'Razorpay'}]
 };
 let onRequest;
 const writes=[];
 function from(table){
  const filters=[];let operation='read',value=null,sort,limit=9999;
  const q={
   select(){return q},eq(k,v){filters.push(row=>row[k]===v);return q},gt(k,v){filters.push(row=>String(row[k])>String(v));return q},
   lt(k,v){filters.push(row=>String(row[k])<String(v));return q},is(k,v){filters.push(row=>row[k]===v);return q},
   order(){return q},limit(n){limit=n;return q},
   update(v){operation='update';value=v;return q},
   async maybeSingle(){const {data,error}=await perform();return {data:data[0]||null,error}},
   then(resolve,reject){return perform().then(resolve,reject)}
  };
  async function perform(){
   const selected=(tables[table]||[]).filter(row=>filters.every(p=>p(row))).slice(0,limit);
   if(operation==='update'){
    writes.push({table,payload:JSON.parse(JSON.stringify(value))});
    for(const row of selected)Object.assign(row,value);
   }
   return {data:selected,error:null};
  }
  return q;
 }
 const db={from};
 const sandbox={
  module:{exports:{}},exports:{},crypto:crypto.webcrypto,TextEncoder,Response,Request,URL,console:{...console,error(){}},Promise,
  Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://synthetic.invalid':k==='SUPABASE_SERVICE_ROLE_KEY'?'DUMMY_SERVICE_KEY':''},serve(fn){onRequest=fn}},
  fetch:async()=>({ok:true,json:async()=>({ok:true})}),
  require(id){if(id.includes('supabase-js'))return {createClient:()=>db};if(id.includes('functions-js'))return {};throw Error('Unexpected module '+id)}
 };
 vm.runInNewContext(transformSync(upgraded,{loader:'ts',format:'cjs',target:'es2022'}).code,sandbox,{timeout:2000});
 return {tables,writes,call:async(step,{auth=true,txid='TX-HOME-SAFE-01'}={})=>{
  const headers={'content-type':'application/json'};
  if(auth)headers['x-dbest-member-token']=token;
  const req=new Request('https://synthetic.invalid/functions/v1/hyperlocal-job-execution-live',{
   method:'POST',headers,body:JSON.stringify({action:'job_action',transactionId:txid,step})
  });
  const res=await onRequest(req);return {status:res.status,data:await res.json()};
 }};
}
test('Accept, start, complete preserve Verified payment state at every step',async()=>{
 const app=simulatedServer();
 const cycle=[['accept','Accepted'],['start','In Progress'],['complete','Completed']];
 for(const [action,jobStatus] of cycle){
  const result=await app.call(action);
  assert.equal(result.status,200,JSON.stringify(result.data));
  assert.equal(app.tables.hyperlocal_jobs_live[0].status,jobStatus);
  assert.equal(app.tables.transactions[0].payment_status,'Verified');
  assert.equal(app.tables.transactions[0].metadata.hyperlocalExecution.status,jobStatus);
  assert(!app.writes.some(w=>w.table==='transactions'&&Object.hasOwn(w.payload,'payment_status')),
    'Job action may not update payment_status');
 }
 assert.equal(app.tables.service_requests_live[0].status,'Completed');
 assert.equal(app.tables.hyperlocal_jobs_live[0].completed_at!==null,true);
});
test('Pending payment stays pending through the job completion lifecycle',async()=>{
 const app=simulatedServer({paymentStatus:'Pending'});
 for(const action of ['accept','start','complete']){const r=await app.call(action);assert.equal(r.status,200)}
 assert.equal(app.tables.transactions[0].payment_status,'Pending');
 assert.equal(app.tables.hyperlocal_jobs_live[0].status,'Completed');
});
test('Repeating completion does not generate another payment or job update',async()=>{
 const app=simulatedServer({jobStatus:'Completed'});
 const r=await app.call('complete');
 assert.equal(r.status,200);assert.equal(r.data.existing,true);
 assert.equal(app.writes.length,0);
});
test('Invalid transition is rejected without touching payments or assignments',async()=>{
 const app=simulatedServer();
 const r=await app.call('complete');
 assert.equal(r.status,409);assert.equal(app.writes.length,0);
 assert.equal(app.tables.hyperlocal_jobs_live[0].status,'Assigned');
});
test('Member/partner session and Owner approval are enforced before job mutations',async()=>{
 let app=simulatedServer(),r=await app.call('accept',{auth:false});
 assert.equal(r.status,401);assert.equal(app.writes.length,0);
 app=simulatedServer({approved:false});r=await app.call('accept');
 assert.equal(r.status,403);assert.equal(app.writes.length,0);
});
test('Only assigned partner can act on a job',async()=>{
 const app=simulatedServer(),r=await app.call('accept',{txid:'OTHER-JOB'});
 assert.equal(r.status,404);assert.equal(app.writes.length,0);
});
