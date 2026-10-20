'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const requestSource=fs.readFileSync('api/payu/create-payment.js','utf8');
const callbackSource=fs.readFileSync('api/payu/return.js','utf8');
const govt={transaction_id:'TX-GOVT-SYNTH-01',section:'PAN, DL, ITR',subsection:'PAN Application',
 actor_ref:'QA-MEMBER',actor_name:'QA Applicant',amount:140,payment_status:'Payment Pending',metadata:{sectionId:'govt',subIndex:0}};
function fakeRes(){
 return {statusCode:200,headers:{},jsonBody:null,url:'',
  status(x){this.statusCode=x;return this},json(x){this.jsonBody=x;return this},
  setHeader(k,v){this.headers[k]=v},end(){return this}};
}
function handler(source,cfg={},overrides={}){
 const state={tx:{...govt,...(overrides.tx||{})},writes:[],payu:{configured:true,key:'FAKE-TEST-PUBLIC-KEY',mode:'test',salt:'FAKE-TEST-SECRET',paymentUrl:'https://test.payu.in/_payment',...cfg},memberId:overrides.memberId||'QA-MEMBER'};
 const stub={
  safe(v,n=180){return String(v??'').replace(/[\r\n]/g,' ').trim().slice(0,n)},
  payuConfig(){return state.payu},
  paymentHash(){return 'TEST-HASH-NOT-FOR-PAYU'},
  parseBody(req){return req.body||{}},
  requestOrigin(){return 'https://dbest4u.com'},
  async sbFetch(url,options={}){
   if(url.includes('/transactions?')&&(options.method!=='POST'&&options.method!=='PATCH'))
      return state.tx?[state.tx]:[];
   if(url.includes('/member_sessions_live?'))return [{member_id:state.memberId,expires_at:'2099-01-01T00:00:00Z'}];
   if(url.includes('/app_settings?'))return [{value:{serviceFeeOverrides:overrides.fees||{}}}];
   if(options.method==='POST'||options.method==='PATCH'){state.writes.push({url,body:JSON.parse(options.body)});return [{}]}
   throw Error('Unknown API path '+url);
  },
  async verifyWithPayU(){return {detail:{status:'success',amt:'140.00',mihpayid:'SANDBOX-PAYMENT-ID',bank_ref_num:'SANDBOX-NO-BANK'}}}
 };
 const sandbox={module:{exports:{}},exports:{},Buffer,console,URLSearchParams,crypto,process:{env:{VERCEL_ENV:'production'}},
  require(name){if(name==='crypto')return crypto;if(name==='../../lib/payu')return stub;throw Error('bad import')},fetch:async()=>{throw Error('No network access in tests')}};
 vm.runInNewContext(source,sandbox,{timeout:2000});
 return {call:async(payload={},headers={})=>{
   const res=fakeRes();
   const req={method:'POST',headers:{'x-dbest-member-token':'synthetic-qa-member-token',...headers},body:{
      dbest_tx_id:'TX-GOVT-SYNTH-01',amount:140,firstname:'Applicant',email:'qa-applicant@example.test',
      phone:'9000000000',udf1:'QA-MEMBER',udf2:'PAN, DL, ITR',udf3:'PAN Application',...payload}};
   await sandbox.module.exports(req,res);return res;
 },state};
}
test('Govt PAN PayU request always uses server Owner fee and ONLY test.payu.in',async()=>{
 const h=handler(requestSource);
 const r=await h.call({amount:2});
 assert.equal(r.statusCode,200,JSON.stringify(r.jsonBody));
 assert.equal(r.jsonBody.amount,'140.00');
 assert.equal(r.jsonBody.action,'https://test.payu.in/_payment');
 assert.equal(r.jsonBody.mode,'test');
 assert.equal(h.state.writes.length,1);
 assert.match(h.state.writes[0].body.payment_status,/Sandbox Initiated/);
 assert.equal(h.state.writes[0].body.metadata.sandbox_only,true);
});
test('Govt client cannot bypass central signed-in transaction or fee',async()=>{
 const cases=[
  {opt:{memberId:'ANOTHER-MEMBER'},err:403},
  {opt:{tx:{amount:149}},err:409},
  {opt:{tx:{section:'Another Service'}},err:404},
  {opt:{fees:{'govt:0':125}},err:409}
 ];
 for(const c of cases){const h=handler(requestSource,{},c.opt);const r=await h.call();assert.equal(r.statusCode,c.err,JSON.stringify(c));assert.equal(h.state.writes.length,0)}
 const h=handler(requestSource);
 const r=await h.call({}, {'x-dbest-member-token':''});
 assert.equal(r.statusCode,401);assert.equal(h.state.writes.length,0);
});
test('Any live PayU mode must be refused for Government Services until Owner separately authorizes it',async()=>{
 const h=handler(requestSource,{mode:'live',paymentUrl:'https://secure.payu.in/_payment'});
 const r=await h.call();assert.equal(r.statusCode,403);assert.equal(h.state.writes.length,0);
});
test('Without configured test key+salt, Government Services cannot create a checkout',async()=>{
 const h=handler(requestSource,{configured:false});const r=await h.call();
 assert.equal(r.statusCode,503);assert.equal(h.state.writes.length,0);
});
test('PayU sandbox callback cannot turn a successful test response into a real paid/verified transaction',async()=>{
 const h=handler(callbackSource,{}, {tx:{reference:'DB-SYNTH-PAYU',metadata:{sandbox_only:true,payu_txnid:'DB-SYNTH-PAYU'}}});
 const r=await h.call({txnid:'DB-SYNTH-PAYU'});
 assert.equal(r.statusCode,303);
 assert.match(r.headers.Location,/payu_test=1/);
 assert.match(r.headers.Location,/payu_verified=0/);
 assert.match(r.headers.Location,/payu_status=sandbox_success/);
 assert.equal(h.state.writes.length,1);
 const write=h.state.writes[0].body;
 assert.match(write.payment_status,/Sandbox Success/);
 assert(!/^(Verified|Paid|Captured)$/.test(write.payment_status));
 assert.equal(write.metadata.payu_verified,false);
 assert.equal(write.metadata.sandbox_verified,true);
 assert.equal(write.metadata.payu_mihpayid,'');
});
test('Non-Govt payment policy is not replaced by this targeted PayU-only test flow',()=>{
 const policy=fs.readFileSync('payment-policy-router-v1.js','utf8');
 const app=fs.readFileSync('index.html','utf8');
 assert(policy.includes("forms:['razorpay','payu']"));
 assert(policy.includes("ecommerce:['razorpay','payu']"));
 assert(policy.includes("govt:['payu']"));
 assert(policy.includes("if(route==='govt')"));
 assert.equal((app.match(/'govt-payu-test-only-v1\.js'/g)||[]).length,1);
 assert(app.includes("'member-referral-share-v1.js'"));
});
