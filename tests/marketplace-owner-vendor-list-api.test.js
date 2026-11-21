'use strict';
const assert=require('node:assert/strict');
process.env.SUPABASE_SERVICE_ROLE_KEY='mock-qa-key';
const handler=require('../api/marketplace/owner-vendor-list');
const oldFetch=global.fetch;
const validToken='owner-session-token-for-testing-123456';
async function invoke({method='GET',token=validToken,fetchImpl}={}){
 const calls=[];
 global.fetch=async(url,opts)=>{calls.push({url,opts});return fetchImpl(url,opts)};
 const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};
 await handler({method,headers:{'x-dbest-owner-token':token}},res);
 return {res,calls};
}
(async()=>{
 let r=await invoke({method:'POST',fetchImpl:()=>{throw Error('unexpected fetch')}});
 assert.equal(r.res.statusCode,405);assert.equal(r.calls.length,0);
 r=await invoke({token:'invalid',fetchImpl:()=>{throw Error('unexpected fetch')}});
 assert.equal(r.res.statusCode,401);assert.equal(r.calls.length,0);
 r=await invoke({fetchImpl:async()=>({ok:true,json:async()=>null})});
 assert.equal(r.res.statusCode,401);assert.equal(r.calls.length,1);
 r=await invoke({fetchImpl:async(url)=>url.includes('validate_owner_session')?{ok:true,json:async()=>'owner@example.invalid'}:{ok:true,json:async()=>[{id:'QA1',name:'Test vendor',active:true,operational_hold:false}]}})});
 assert.equal(r.res.statusCode,200);assert.equal(r.res.body.vendors.length,1);assert.equal(r.calls.length,2);
 assert.equal(JSON.parse(r.calls[0].opts.body).p_token,validToken);
 assert.match(r.calls[1].url,/marketplace_vendors_live/);
 r=await invoke({fetchImpl:async()=>({ok:false,status:500})});
 assert.equal(r.res.statusCode,503);assert.equal(r.calls.length,1);
 r=await invoke({fetchImpl:async(url)=>url.includes('validate_owner_session')?{ok:true,json:async()=>'owner@example.invalid'}:{ok:false,status:500}});
 assert.equal(r.res.statusCode,503);
 assert.equal(r.res.headers['Cache-Control'],'no-store');
 console.log('Owner vendor list mock authorization and data tests passed');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{global.fetch=oldFetch});
