'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {transformSync}=require('esbuild');
const src=fs.readFileSync('qa/homejobs/homejobs-customer-history-live/index.ts','utf8');
const code=transformSync(src,{loader:'ts',format:'cjs',target:'es2022'}).code;
const A='QA-MEMBER-A',B='QA-MEMBER-B',token='synthetic-customer-access-token';
const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
function fixture(params={}){
 const rows={
  member_sessions_live:[{member_id:A,token_hash:tokenHash,expires_at:'2099-12-31'}],
  onboarding_records:[{kind:'member',external_id:A,status:'Active',deleted_at:null}],
  hyperlocal_jobs_live:[
   {transaction_id:'HOME-A-OLD',member_id:A,service_type:'electrician',status:'Completed',created_at:'2026-09-19',completed_at:'2026-09-19',assigned_partner_member_id:'SP-A',city:'Test City'},
   {transaction_id:'HOME-A-PAID',member_id:A,service_type:'plumber',status:'Completed',created_at:'2026-10-15',completed_at:'2026-10-16',assigned_partner_member_id:'SP-A'},
   {transaction_id:'HOME-B-SECRET',member_id:B,service_type:'maid',status:'Assigned',created_at:'2026-10-16'}
  ],
  service_requests_live:[
   {transaction_id:'HOME-A-OLD',member_id:A,section:'Home Jobs & Local Services',subsection:'Electrician',status:'Processing',created_at:'2026-09-19'},
   {transaction_id:'HOME-A-PAID',member_id:A,section:'Home Jobs & Local Services',subsection:'Plumber',status:'Completed',created_at:'2026-10-15'},
   {transaction_id:'HOME-A-PENDING',member_id:A,section:'Home Jobs & Local Services',subsection:'AC Mechanic',status:'New',created_at:'2026-10-19'},
   {transaction_id:'HOME-B-SECRET',member_id:B,section:'Home Jobs & Local Services',subsection:'Maid / House Help',status:'New',created_at:'2026-10-19'}
  ],
  transactions:[
   {transaction_id:'HOME-A-OLD',actor_ref:A,amount:400,payment_mode:'Razorpay',payment_status:'Verified',metadata:{qa:true,purpose:'QA synthetic'},created_at:'2026-09-19'},
   {transaction_id:'HOME-A-PAID',actor_ref:A,amount:350,payment_mode:'Razorpay',payment_status:'Verified',metadata:{razorpay_signature_verified:true,razorpay_payment_id:'pay_synthetic_verified'},created_at:'2026-10-16'},
   {transaction_id:'HOME-B-SECRET',actor_ref:B,amount:450,payment_mode:'Razorpay',payment_status:'Verified',metadata:{razorpay_signature_verified:true,razorpay_payment_id:'pay_other'},created_at:'2026-10-17'}
  ]
 };
 if(params.override){for(const [k,v] of Object.entries(params.override))rows[k]=v;}
 let fn;
 const sb={from(table){let predicates=[],cap=1000,sort=null;
  const q={
   select(){return q},eq(name,v){predicates.push(x=>x[name]===v);return q},
   gt(name,v){predicates.push(x=>x[name]>v);return q},
   is(name,v){predicates.push(x=>x[name]===v);return q},
   in(name,arr){predicates.push(x=>arr.includes(x[name]));return q},
   order(name,opt){sort={name,desc:opt?.ascending===false};return q},
   limit(n){cap=n;return q},
   async maybeSingle(){const v=await get();return {data:v.data[0]||null,error:null}},
   then(resolve,reject){return get().then(resolve,reject)}
  };
  async function get(){let result=(rows[table]||[]).filter(x=>predicates.every(p=>p(x)));
   if(sort)result=result.sort((a,b)=>String(a[sort.name]||'').localeCompare(String(b[sort.name]||''))*(sort.desc?-1:1));
   return {data:result.slice(0,cap),error:null};
  }
  return q;
 }};
 const sandbox={module:{exports:{}},exports:{},crypto:crypto.webcrypto,TextEncoder,Response,Request,URL,console:{...console,error(){}},
  Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://synthetic.invalid':k==='SUPABASE_SERVICE_ROLE_KEY'?'not-a-real-secret':''},serve:v=>{fn=v}},
  require:p=>p.includes('supabase-js')?{createClient:()=>sb}:{}
 };
 vm.runInNewContext(code,sandbox,{timeout:3000});
 return async(options={})=>{
   const req=new Request('https://synthetic.invalid/functions/v1/homejobs-customer-history-live',
     {method:options.method||'POST',headers:{'Content-Type':'application/json',...(options.token===false?{}:{'x-dbest-member-token':options.token||token})},body:JSON.stringify({action:options.action||'list',memberId:options.tryMember||A})});
   const res=await fn(req);return {status:res.status,payload:await res.json()};
 };
}
test('Customer history only returns authenticated member records, never other users',async()=>{
 const r=await fixture()({tryMember:B});
 assert.equal(r.status,200);
 assert.deepEqual(Array.from(r.payload.services.map(x=>x.id)).sort(),['HOME-A-OLD','HOME-A-PAID','HOME-A-PENDING']);
 assert.equal(r.payload.summary.total,3);
});
test('Completed job is authoritative when operations queue still says Processing',async()=>{
 const r=await fixture()({});
 const x=r.payload.services.find(z=>z.id==='HOME-A-OLD');
 assert.equal(x.jobStatus,'Completed');assert.equal(x.status,'Completed');
 assert.equal(x.receiptEligible,false,'Historical QA transaction must not generate payment invoice');
 assert.equal(x.paymentStatus,'Payment not verified');
});
test('Genuine gateway confirmation allows a printable payment receipt',async()=>{
 const r=await fixture()({});
 const x=r.payload.services.find(z=>z.id==='HOME-A-PAID');
 assert.equal(x.receiptEligible,true);
 assert.equal(x.charge,350);
 assert.equal(x.paymentMethod,'Razorpay');
});
test('Requests awaiting assignment still appear in service history',async()=>{
 const r=await fixture()({});
 const x=r.payload.services.find(z=>z.id==='HOME-A-PENDING');
 assert.equal(x.service,'AC Mechanic');
 assert.equal(x.receiptEligible,false);
});
test('No member token means no data returned',async()=>{
 const r=await fixture()({token:false});
 assert.equal(r.status,401);assert.equal(r.payload.services,undefined);
});
test('Expired/unknown member identity cannot retrieve customer records',async()=>{
 const r=await fixture()({token:'unknown-token'});
 assert.equal(r.status,401);
});
test('Unsupported action and arbitrary memberID cannot grant invoice access',async()=>{
 const r=await fixture()({action:'grantInvoice',tryMember:B});
 assert.equal(r.status,400);
});
test('No forged paid receipt for sandbox transactions',async()=>{
 const f=fixture({override:{transactions:[{transaction_id:'HOME-A-OLD',actor_ref:A,amount:400,payment_mode:'PayU Test',payment_status:'Paid',metadata:{payu_verified:true,payu_mihpayid:'test_id',sandbox_only:true}}]}});
 const r=await f({});
 assert.equal(r.payload.services.find(x=>x.id==='HOME-A-OLD').receiptEligible,false);
});
test('Only isolated Home Jobs shell and new source files are referenced',()=>{
 const shell=fs.readFileSync('index.html','utf8');
 assert.equal((shell.match(/'homejobs-customer-dashboard-v1\.js'/g)||[]).length,1);
 assert(shell.includes("'home-jobs-hyperlocal.js','homejobs-customer-dashboard-v1.js','service-partner-job-execution.js'"));
 assert(shell.includes("'govt-payu-test-only-v1.js'"));
 assert(shell.includes("'cab-entry-capture-final-v1.js'"));
 assert(shell.includes("'marketplace-secure-session-v1.js'"));
});
