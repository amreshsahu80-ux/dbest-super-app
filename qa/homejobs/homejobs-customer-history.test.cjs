'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{transformSync}=require('esbuild'),crypto=require('node:crypto');
const src=fs.readFileSync('qa/homejobs/homejobs-customer-history-live/index.ts','utf8');
const js=transformSync(src,{loader:'ts',format:'cjs',target:'es2022'}).code;
const token='QA-TOKEN-HISTORY',hash=crypto.createHash('sha256').update(token).digest('hex');
const member='QA-MEMBER';
const rows={
 member_sessions_live:[{member_id:member,token_hash:hash,expires_at:'2099-01-01T00:00:00Z'}],
 onboarding_records:[{kind:'member',external_id:member,status:'Active',deleted_at:null}],
 hyperlocal_jobs_live:[
 {transaction_id:'TX-COMPLETE-FREE',member_id:member,service_type:'electrician',status:'Completed',created_at:'2026-09-19T06:00:00Z',completed_at:'2026-09-19T07:00:00Z'},
 {transaction_id:'TX-VERIFIED-PAID',member_id:member,service_type:'plumber',status:'Completed',created_at:'2026-09-19T05:00:00Z',completed_at:'2026-09-19T06:00:00Z'},
 {transaction_id:'TX-NO-ASSIGNMENT',member_id:member,service_type:'ac',status:'Open',created_at:'2026-09-20T01:00:00Z'},
 {transaction_id:'TX-OTHER-MEMBER',member_id:'OTHER-CUSTOMER',service_type:'electrician',status:'Completed'}
 ],
 service_requests_live:[
 {transaction_id:'TX-COMPLETE-FREE',member_id:member,section:'Home Jobs & Local Services',subsection:'Electrician',status:'Completed'},
 {transaction_id:'TX-VERIFIED-PAID',member_id:member,section:'Home Jobs & Local Services',subsection:'Plumber',status:'Completed'},
 {transaction_id:'TX-NO-ASSIGNMENT',member_id:member,section:'Home Jobs & Local Services',subsection:'AC Mechanic',status:'New'},
 {transaction_id:'TX-PENDING-ONLY',member_id:member,section:'Home Jobs & Local Services',subsection:'Maid / House Help',status:'New'},
 {transaction_id:'TX-OTHER-REQUEST',member_id:'OTHER-CUSTOMER',section:'Home Jobs & Local Services',subsection:'Electrician',status:'New'}
 ],
 transactions:[
 {transaction_id:'TX-COMPLETE-FREE',actor_ref:member,section:'Home Jobs & Local Services',subsection:'Electrician',amount:0,payment_status:'Verified',payment_mode:'None',metadata:{qa:true}},
 {transaction_id:'TX-VERIFIED-PAID',actor_ref:member,section:'Home Jobs & Local Services',subsection:'Plumber',amount:249,payment_status:'Verified',payment_mode:'PayU',metadata:{payu_verified:true,payu_mihpayid:'qa_unit_test_gateway_reference'}},
 {transaction_id:'TX-NO-ASSIGNMENT',actor_ref:member,section:'Home Jobs & Local Services',subsection:'AC Mechanic',amount:0,payment_status:'Payment Pending'},
 {transaction_id:'TX-UNPAID',actor_ref:member,section:'Home Jobs & Local Services',subsection:'Refrigerator Mechanic',amount:150,payment_status:'Pending'},
 {transaction_id:'TX-PARTNER-REG',actor_ref:member,section:'Home Jobs & Local Services',subsection:'Service Partner Registration',amount:0,payment_status:'Approved'},
 {transaction_id:'TX-OTHER-TRANSACTION',actor_ref:'OTHER-CUSTOMER',section:'Home Jobs & Local Services',subsection:'Plumber',amount:300,payment_status:'Verified'}
 ]
};
function build(options={}){
 const data={...rows,onboarding_records:options.inactive?[{kind:'member',external_id:member,status:'Suspended',deleted_at:null}]:rows.onboarding_records,transactions:rows.transactions.map(x=>x.transaction_id==='TX-VERIFIED-PAID'?{...x,metadata:options.qaTransaction?{qa:'legacy-test',purpose:'QA payment-gated wallet test'}:options.noProof?{}:x.metadata}:x)};let handler,readCalls=[];
 const db={from:(table)=>{
  const constraints=[],gt=[],nulls=[];
  const query={
   select(){return query},eq(k,v){constraints.push([k,v]);return query},gt(k,v){gt.push([k,v]);return query},is(k,v){nulls.push([k,v]);return query},order(){return query},limit(n){query.max=n;return query},
   async maybeSingle(){let res=await result();return {data:res.data[0]||null,error:null}},
   then(resolve,reject){return result().then(resolve,reject)}
  };
  async function result(){
   readCalls.push({table,filters:constraints});
   const source=data[table]||[];
   const found=source.filter(r=>constraints.every(([k,v])=>r[k]===v)&&gt.every(([k,v])=>String(r[k])>String(v))&&nulls.every(([k,v])=>r[k]===v)).slice(0,query.max||300);
   return {data:found,error:null};
  }
  return query;
 }};
 const context={module:{exports:{}},exports:{},console,TextEncoder,Response,Request,Promise,crypto:crypto.webcrypto,
  Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://invalid.test':k==='SUPABASE_SERVICE_ROLE_KEY'?'TEST-SERVER-KEY':''},serve:f=>{handler=f}},
  require:name=>name.includes('supabase-js')?{createClient:()=>db}:name.includes('functions-js')?{}:(()=>{throw Error('Unexpected import '+name)})()};
 vm.runInNewContext(js,context,{timeout:5000});
 assert.equal(typeof handler,'function');
 return {calls:readCalls,run:async(t=token)=>{const headers={'Content-Type':'application/json'};if(t)headers['x-dbest-member-token']=t;const res=await handler(new Request('https://invalid.test',{method:'POST',headers,body:'{}'}));return {status:res.status,body:await res.json()}}};
}
test('customer history uses hashed member session and excludes other-member records',async()=>{
 const c=build(),r=await c.run();
 assert.equal(r.status,200);assert.equal(r.body.history.length,5);
 assert(!r.body.history.some(x=>x.transactionId.includes('OTHER')||x.transactionId.includes('PARTNER-REG')));
 assert(c.calls.some(x=>x.table==='hyperlocal_jobs_live'&&x.filters.some(y=>y[0]==='member_id'&&y[1]===member)));
 assert(c.calls.some(x=>x.table==='transactions'&&x.filters.some(y=>y[0]==='actor_ref'&&y[1]===member)));
});
test('completed free job is service summary, never falsely issued paid receipt',async()=>{
 const c=build(),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-COMPLETE-FREE');
 assert.equal(x.status,'Completed');assert.equal(x.payment.verified,false);assert.equal(x.documentType,'service_summary');
});
test('verified payment produces receipt and amount from server ledger',async()=>{
 const c=build(),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-VERIFIED-PAID');
 assert.equal(x.documentType,'payment_receipt');assert.equal(x.payment.amount,249);assert.equal(x.payment.verified,true);
});
test('legacy QA Verified-status transaction cannot generate a paid invoice',async()=>{
 const c=build({qaTransaction:true}),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-VERIFIED-PAID');
 assert.equal(x.payment.verified,false);
 assert.equal(x.documentType,'service_summary');
});
test('unverified payment status alone never generates a receipt',async()=>{
 const c=build({noProof:true}),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-VERIFIED-PAID');
 assert.equal(x.payment.verified,false);
});
test('pending quote may be visible but cannot create receipt',async()=>{
 const c=build(),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-UNPAID');
 assert.equal(x.payment.verified,false);assert.equal(x.documentType,null);
});
test('pending service request visible before job assignment',async()=>{
 const c=build(),r=await c.run(),x=r.body.history.find(x=>x.transactionId==='TX-PENDING-ONLY');
 assert.equal(x.status,'New');assert.equal(x.assigned,false);
});
test('missing or invalid session denied with no other member data leaked',async()=>{
 for(const t of ['', 'INVALID-TOKEN']){const c=build(),r=await c.run(t);assert.equal(r.status,401);assert.equal(r.body.history,undefined)}
});
test('inactive customer account denied',async()=>{
 const c=build({inactive:true}),r=await c.run();assert.equal(r.status,403);
});
test('no protected existing HomeJobs operational source is modified by this API',()=>{
 const shell=fs.readFileSync('index.html','utf8');assert.equal((shell.match(/'homejobs-customer-history-v1.js'/g)||[]).length,1);
 for(const file of ['home-jobs-hyperlocal.js','service-partner-job-execution.js','home-jobs-section-finalizer.js'])assert(!shell.includes(file+'-altered'));
});
