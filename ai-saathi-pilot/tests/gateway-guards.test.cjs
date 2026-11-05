"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const model=require("../api/model-chat.js");
const health=require("../api/health.js");
const KEYS=["AI_SAATHI_LLM_ENABLED","AI_SAATHI_COST_GATE_APPROVED","AI_SAATHI_PRIVACY_GATE_APPROVED","AI_SAATHI_REDIS_REST_URL","AI_SAATHI_REDIS_REST_TOKEN","AI_SAATHI_RATE_LIMIT_SALT"];
async function isolatedEnv(work){
 const old=Object.fromEntries(KEYS.map(x=>[x,process.env[x]]));
 const oldFetch=globalThis.fetch;
 try{return await work();}
 finally{for(const k of KEYS){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}globalThis.fetch=oldFetch;}
}
function res(){return {statusCode:200,setHeader(){return this;},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};}
async function post(body){const r=res();await model({method:"POST",headers:{host:"test.example","content-type":"application/json"},body:{role:"customer",message:"General DBest assistance",...body}},r);return r;}
test("setting three feature flags does not bypass the independent Redis gate",async()=>{
 await isolatedEnv(async()=>{
  for(const k of KEYS)delete process.env[k];
  process.env.AI_SAATHI_LLM_ENABLED="true";
  process.env.AI_SAATHI_COST_GATE_APPROVED="true";
  process.env.AI_SAATHI_PRIVACY_GATE_APPROVED="true";
  const r=await post({aiConsent:true});
  assert.equal(r.statusCode,503);
  assert.equal(r.body.error,"rate_limit_not_configured");
 });
});
test("privacy consent is required even if feature flags are accidentally enabled",async()=>{
 await isolatedEnv(async()=>{
  for(const k of KEYS)delete process.env[k];
  process.env.AI_SAATHI_LLM_ENABLED="true";
  process.env.AI_SAATHI_COST_GATE_APPROVED="true";
  process.env.AI_SAATHI_PRIVACY_GATE_APPROVED="true";
  const r=await post({aiConsent:false});
  assert.equal(r.statusCode,412);
  assert.equal(r.body.error,"consent_required");
 });
});
test("invalid or non-HTTPS Redis endpoint fails closed",async()=>{
 await isolatedEnv(async()=>{
  process.env.AI_SAATHI_REDIS_REST_URL="http://unsafe.example";
  process.env.AI_SAATHI_REDIS_REST_TOKEN="not-real";
  process.env.AI_SAATHI_RATE_LIMIT_SALT="dummy";
  assert.equal(await model._internal.rateLimit({headers:{}}),false);
 });
});
test("Redis REST response enforces per-minute and daily counters, without paid AI calls",async()=>{
 await isolatedEnv(async()=>{
  process.env.AI_SAATHI_REDIS_REST_URL="https://redis.test.invalid";
  process.env.AI_SAATHI_REDIS_REST_TOKEN="fake-value-only";
  process.env.AI_SAATHI_RATE_LIMIT_SALT="test-salt";
  let seen=0,reply=[1,1];
  globalThis.fetch=async(url,opts)=>{
   seen++;
   assert.equal(url,"https://redis.test.invalid");
   assert.equal(opts.method,"POST");
   const body=JSON.parse(opts.body);
   assert.equal(body[0],"EVAL");
   assert.equal(body[2],2);
   assert.equal(body.length,5);
   return {ok:true,json:async()=>({result:reply})};
  };
  const req={headers:{"x-vercel-forwarded-for":"198.51.100.2"}};
  assert.equal(await model._internal.rateLimit(req),true);
  reply=[4,2];
  assert.equal(await model._internal.rateLimit(req),false);
  reply=[1,61];
  assert.equal(await model._internal.rateLimit(req),false);
  assert.equal(seen,3);
 });
});
test("malformed or unavailable Redis response denies use",async()=>{
 await isolatedEnv(async()=>{
  process.env.AI_SAATHI_REDIS_REST_URL="https://redis.test.invalid";
  process.env.AI_SAATHI_REDIS_REST_TOKEN="fake-value-only";
  process.env.AI_SAATHI_RATE_LIMIT_SALT="test-salt";
  globalThis.fetch=async()=>({ok:true,json:async()=>({result:["invalid",1]})});
  assert.equal(await model._internal.rateLimit({headers:{}}),false);
  globalThis.fetch=async()=>{throw Error("offline");};
  assert.equal(await model._internal.rateLimit({headers:{}}),false);
 });
});
test("health endpoint reports no model access when server-side rate limit is missing",async()=>{
 await isolatedEnv(async()=>{
  for(const k of KEYS)delete process.env[k];
  process.env.AI_SAATHI_LLM_ENABLED="true";
  process.env.AI_SAATHI_COST_GATE_APPROVED="true";
  process.env.AI_SAATHI_PRIVACY_GATE_APPROVED="true";
  const r=res();
  await health({method:"GET"},r);
  assert.equal(r.body.modelCallsAllowed,false);
  assert.equal(r.body.productionWritesEnabled,false);
 });
});
test("conversation history cannot forward identity, email or phone number",()=>{
 for(const content of ["ABCDE1234F","user@example.com","9876543210","9123 4567 1234"]){
  assert.equal(model._internal.historyOK([{role:"user",content}]),null);
 }
});
