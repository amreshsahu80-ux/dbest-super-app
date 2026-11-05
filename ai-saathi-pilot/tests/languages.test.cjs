"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const demo=require("../api/chat.js");
function call(message){return new Promise(resolve=>{const res={statusCode:200,setHeader(){return this;},status(n){this.statusCode=n;return this;},json(d){resolve({status:this.statusCode,...d});return this;}};demo({method:"POST",headers:{"content-type":"application/json"},body:{role:"customer",message}},res);});}
test("Hindi demonstration is labelled and makes no live claims",async()=>{const r=await call("मुझे होटल चाहिए");assert.equal(r.mode,"simulation");assert.match(r.reply,/परीक्षण/);});
test("Odia demonstration is labelled and makes no live claims",async()=>{const r=await call("ମୋତେ ହୋଟେଲ ଦରକାର");assert.equal(r.mode,"simulation");assert.match(r.reply,/ପରୀକ୍ଷା/);});
test("English customer demo remains preserved",async()=>{const r=await call("hotels in Puri");assert.equal(r.mode,"simulation");assert.match(r.reply,/SIMULATION/);});
