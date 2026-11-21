'use strict';
const assert=require('node:assert/strict');
const handler=require('../api/marketplace/owner-vendor-enforcement');
const oldFetch=global.fetch;
const oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY='qa-service-key';
async function invoke({method='POST',token='a'.repeat(32),body={vendorId:'QA_VENDOR',action:'suspend',reason:'Repeated policy violation'},fetchImpl}={}){
 global.fetch=fetchImpl|| (async()=>({ok:true,json:async()=>({ok:true,vendorId:'QA_VENDOR',action:body.action})}));
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.statusCode=s;return this;},json(v){this.body=v;return this;}};
 await handler({method,headers:{'x-dbest-admin-token':token},body},res);
 return res;
}
(async()=>{
 let calls=0;
 let r=await invoke({method:'GET',fetchImpl:async()=>{calls++;throw Error('must not fetch')}});
 assert.equal(r.statusCode,405);assert.equal(calls,0);
 r=await invoke({token:'bad',fetchImpl:async()=>{calls++;throw Error('must not fetch')}});
 assert.equal(r.statusCode,401);assert.equal(calls,0);
 r=await invoke({body:{vendorId:'QA_VENDOR',action:'terminate',reason:'short'},fetchImpl:async()=>{calls++;throw Error('must not fetch')}});
 assert.equal(r.statusCode,400);assert.equal(calls,0);
 let sent;
 r=await invoke({fetchImpl:async(url,opts)=>{sent={url,opts};return {ok:true,json:async()=>({ok:true,vendorId:'QA_VENDOR',action:'suspend'})}}});
 assert.equal(r.statusCode,200);
 assert.match(sent.url,/\/rest\/v1\/rpc\/dbest_enforce_vendor$/);
 const payload=JSON.parse(sent.opts.body);
 assert.equal(payload.p_vendor_id,'QA_VENDOR');
 assert.equal(payload.p_action,'suspend');
 assert.equal(payload.p_token_hash.length,64);
 assert.notEqual(payload.p_token_hash,'a'.repeat(32));
 r=await invoke({fetchImpl:async()=>({ok:false,status:400})});
 assert.equal(r.statusCode,400);
 r=await invoke({fetchImpl:async()=>({ok:false,status:404})});
 assert.equal(r.statusCode,503);
 assert.equal(r.headers['Cache-Control'],'no-store');
 console.log('Owner vendor enforcement mocked API: 13 assertions passed');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;});
