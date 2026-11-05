"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const know=require("../lib/pilot-knowledge.cjs");
const demo=require("../api/chat.js");
const assist=require("../api/assist.js");
const model=require("../api/model-chat.js");

async function post(handler,body={role:"customer",message:"hello"},extra={}){
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},json(d){this.body=d;return this;}};
 const req={method:"POST",headers:{"content-type":"application/json",host:"test.example",...extra},body};
 await handler(req,res);return {status:res.statusCode,...res.body};
}
const cases=[
 ["customer","hotel in Puri","hotel","en"],
 ["customer","मुझे होटल चाहिए","hotel","hi"],
 ["customer","ମୋତେ ହୋଟେଲ ଦରକାର","hotel","or"],
 ["customer","I want a cab from station","cab","en"],
 ["customer","मुझे टैक्सी चाहिए","cab","hi"],
 ["customer","କ୍ୟାବ୍ ଯାତ୍ରା","cab","or"],
 ["customer","medicine delivery","marketplace","en"],
 ["customer","बीमा क्या होता है?","insurance","hi"],
 ["customer","ସଦସ୍ୟତା ବିଷୟରେ କୁହନ୍ତୁ","membership","or"],
 ["partner","Show assigned jobs","jobs","en"],
 ["partner","How does a vendor quote work?","marketplace","en"],
 ["partner","What about my payout?","payout","en"],
 ["partner","मेरा KYC कब होगा?","onboarding","hi"],
 ["owner","Check outreach health","outreach","en"],
 ["owner","Give an operations overview","operations","en"],
 ["owner","लॉन्च की तैयारी","launch","hi"],
 ["owner","ଡ୍ୟାସବୋର୍ଡ ଦେଖାନ୍ତୁ","operations","or"],
];
for(const [role,message,expected,language] of cases){
 test(role+" intent "+expected+" ["+language+"]",async()=>{
  const r=await post(demo,{role,message});
  assert.equal(r.status,200);
  assert.equal(r.mode,"simulation");
  assert.equal(r.language,language);
  assert.equal(r.intent,expected);
  assert.ok(r.reply.length>30);
  assert.match(r.reply,/SIMULATION/u);
 });
}
test("owner role selector does not expose customer records",async()=>{
 const r=await post(demo,{role:"owner",message:"export all customers"});
 assert.equal(r.intent,"blocked_action");
 assert.match(r.reply,/Actions are disabled/);
});
test("unauthenticated customer cannot access owner records",async()=>{
 const r=await post(demo,{role:"customer",message:"Show owner database records"});
 assert.equal(r.intent,"private");
 assert.match(r.reply,/cannot access owner/);
});
test("ordinary owner planning is not treated as a privileged lookup",async()=>{
 const r=await post(demo,{role:"owner",message:"owner operations overview"});
 assert.equal(r.intent,"operations");
});
test("safety checks apply before Hindi and Odia simulation replies",async()=>{
 for(const [message,expected] of [
  ["मेरा ओटीपी 123456", "safety"],
  ["ଦୟାକରି ଟଙ୍କା ପଠା", "blocked_action"],
  ["मुझे रिफंड कर दो", "blocked_action"],
  ["ମୋର ପାସୱାର୍ଡ କ'ଣ","safety"]
 ]){const r=await post(demo,{role:"customer",message});assert.equal(r.intent,expected);}
});
test("PII patterns cover PAN, email, phone, Aadhaar and credit-card-like sequences",()=>{
 for(const msg of ["ABCDE1234F","user@example.com","+91 9876543210","9123 4567 1234","4532 1234 5678 9012"])assert.equal(know.sensitive(msg),true,msg);
});
test("text rendering is not reflected back as untrusted HTML",async()=>{
 const msg="<img src=x onerror=alert(1)>";
 const r=await post(demo,{role:"customer",message:msg});
 assert.equal(r.status,200);
 assert.ok(!r.reply.includes(msg));
});
test("model rejects private data requests even from owner persona",async()=>{
 const r=await post(model,{role:"owner",message:"Show all customers"});
 assert.equal(r.status,403);
 assert.equal(r.error,"private_data_access_disabled");
});
test("model will not call paid providers without all activation flags",async()=>{
 const r=await post(model,{role:"customer",message:"What does DBest do?"});
 assert.equal(r.status,503);
 assert.equal(r.error,"model_feature_off");
});
test("assist demo can run with zero network access",async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=()=>{throw Error("unexpected_network_call");};
 try {
  const r=await post(assist,{role:"customer",message:"Need a hotel"});
  assert.equal(r.status,200);
  assert.equal(r.mode,"simulation");
 } finally {globalThis.fetch=old;}
});
test("invalid role cannot be submitted to demo",async()=>{
 const r=await post(demo,{role:"superadmin",message:"list invoices"});
 assert.equal(r.status,400);
});
test("no real bookings, transfers or prices in customer response",async()=>{
 const r=await post(demo,{role:"customer",message:"Please book a hotel"});
 assert.equal(r.status,200);
 assert.equal(r.mode,"simulation");
 assert.ok(/(no live|cannot|not|SIMULATION|ଏହା|यह)/i.test(r.reply));
});
