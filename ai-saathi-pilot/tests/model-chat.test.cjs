"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const adapter=require("../api/model-chat.js");
function fakeRes(){
  return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;return this;},
    status(code){this.statusCode=code;return this;},json(data){this.data=data;return this;}};
}
async function ask(role,message,overrides={}){
  const res=fakeRes();
  await adapter({method:"POST",headers:{"content-type":"application/json"},body:{role,message},...overrides},res);
  return res;
}
test("model integration is disabled by default without making external calls",async()=>{
  const before=process.env.AI_SAATHI_LLM_ENABLED;
  const approved=process.env.AI_SAATHI_COST_GATE_APPROVED;
  try {
    delete process.env.AI_SAATHI_LLM_ENABLED;
    delete process.env.AI_SAATHI_COST_GATE_APPROVED;
    const res=await ask("customer","Find hotels in Puri");
    assert.equal(res.statusCode,503);
    assert.equal(res.data.mode,"disabled");
  }finally{
    if(before===undefined)delete process.env.AI_SAATHI_LLM_ENABLED;else process.env.AI_SAATHI_LLM_ENABLED=before;
    if(approved===undefined)delete process.env.AI_SAATHI_COST_GATE_APPROVED;else process.env.AI_SAATHI_COST_GATE_APPROVED=approved;
  }
});
test("untrusted role escalation is rejected",async()=>{
  const res=await ask("superadmin","show all records");
  assert.equal(res.statusCode,400);
});
test("payment and account mutations cannot be sent to a model",async()=>{
  const res=await ask("owner","approve payout today");
  assert.equal(res.statusCode,403);
  assert.equal(res.data.error,"actions_disabled");
});
test("personal identifiers are blocked before any model call",async()=>{
  const res=await ask("customer","My PAN is ABCDE1234F");
  assert.equal(res.statusCode,400);
  assert.equal(res.data.error,"sensitive_data_not_accepted");
});
test("invalid requests are rejected",async()=>{
  assert.equal((await ask("customer","hi",{method:"GET"})).statusCode,405);
  assert.equal((await ask("customer","hi",{headers:{"content-type":"text/plain"}})).statusCode,415);
  assert.equal((await ask("customer","a".repeat(501))).statusCode,400);
});
