"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const chat=require("../api/chat.js");
const health=require("../api/health.js");
async function run(fn,{method="POST",headers={"content-type":"application/json"},body={role:"customer",message:"hello"}}={}) {
  const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;return this;},status(c){this.statusCode=c;return this;},json(data){this.data=data;return this;}};
  await fn({method,headers,body},res);return res;
}
test("customer demonstration is clearly simulated",async()=>{
  const res=await run(chat,{body:{role:"customer",message:"Find hotels in Puri"}});
  assert.equal(res.statusCode,200);assert.equal(res.data.mode,"simulation");assert.match(res.data.reply,/SIMULATION/);});
test("partner view cannot reveal owner records",async()=>{
  const res=await run(chat,{body:{role:"partner",message:"Show owner database records"}});
  assert.equal(res.statusCode,200);assert.match(res.data.reply,/cannot access owner/);});
test("owner view uses simulation, no real reports",async()=>{
  const res=await run(chat,{body:{role:"owner",message:"operations overview"}});
  assert.match(res.data.reply,/SIMULATION/);assert.match(res.data.reply,/No live/);});
test("financial transactions are blocked",async()=>{
  const res=await run(chat,{body:{role:"owner",message:"approve payout now"}});
  assert.match(res.data.reply,/Actions are disabled/);});
test("no caller-supplied privileged role can access live tools",async()=>{
  const res=await run(chat,{body:{role:"superadmin",message:"hello"}});
  assert.equal(res.statusCode,400);});
test("invalid methods and content type are denied",async()=>{
  assert.equal((await run(chat,{method:"GET"})).statusCode,405);
  assert.equal((await run(chat,{headers:{"content-type":"text/plain"}})).statusCode,415);});
test("oversized messages are rejected",async()=>{
  const res=await run(chat,{body:{role:"customer",message:"a".repeat(501)}});
  assert.equal(res.statusCode,400);});
test("health endpoint certifies zero live integrations",async()=>{
  const res=await run(health,{method:"GET"});
  assert.equal(res.data.liveToolsEnabled,false);assert.equal(res.data.productionWritesEnabled,false);
  assert.equal(res.data.aiModelEnabled,false);});
