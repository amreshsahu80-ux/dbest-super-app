"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const model=require("../api/model-chat.js"),assist=require("../api/assist.js"),health=require("../api/health.js");
function res(){return {headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},json(x){this.data=x;return this;}};}
async function req(fn,body={},heads={}){const r=res();await fn({method:"POST",headers:{"content-type":"application/json",host:"qa.example",...heads},body:{role:"customer",message:"Hello",...body}},r);return r;}
test("default OFF means no billable calls",()=>assert.equal(model._internal.enabled(),false));
test("safe existing UI demo remains available",async()=>{const r=await req(assist,{message:"hotels in Puri"});assert.equal(r.data.mode,"simulation");assert.equal(r.statusCode,200);});
test("invalid role rejected",async()=>assert.equal((await req(model,{role:"superadmin"})).statusCode,400));
test("sensitive data blocked",async()=>assert.equal((await req(model,{message:"PAN ABCDE1234F"})).statusCode,400));
test("financial command blocked",async()=>assert.equal((await req(model,{message:"approve payout"})).statusCode,403));
test("Hindi financial command blocked",async()=>assert.equal((await req(model,{message:"पैसे भेज दो"})).statusCode,403));
test("same-origin guard denies foreign origin",async()=>assert.equal((await req(model,{},{"origin":"https://evil.test"})).statusCode,403));
test("history capped and validated",()=>{assert.equal(model._internal.historyOK(Array(7).fill({role:"user",content:"ok"})),null);assert.deepEqual(model._internal.historyOK([{role:"user",content:"नमस्ते"}]),[{role:"user",content:"नमस्ते"}]);});
test("model unavailable without gates",async()=>{const r=await req(model);assert.equal(r.statusCode,503);assert.equal(r.data.error,"model_feature_off");});
test("languages enumerated",()=>assert.match(model._internal.system("customer"),/Hindi, English or Odia/));
test("health never claims DBest access",async()=>{const r=res();await health({method:"GET"},r);assert.equal(r.data.productionWritesEnabled,false);assert.equal(r.data.databaseConnected,false);});
