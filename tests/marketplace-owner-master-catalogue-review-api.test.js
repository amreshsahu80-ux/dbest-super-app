'use strict';
const assert=require('node:assert/strict');
const path='../api/marketplace/owner-master-catalogue-review';
async function invoke({enabled=true,token='valid-owner-session-token-123456',decision='reviewed',reason='Verified QA review only',rpcResult=true}={}){
 const saved={...process.env},oldFetch=global.fetch;
 process.env.DBEST_MASTER_CATALOGUE_REVIEW_ENABLED=enabled?'true':'false';
 process.env.SUPABASE_URL='https://example.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='qa-mock-key';
 delete require.cache[require.resolve(path)];
 const handler=require(path),calls=[];
 global.fetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});
  return {ok:true,json:async()=>url.includes('validate_owner_session')?(token.startsWith('invalid')?null:'owner@example.org'):rpcResult};
 };
 const res={setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
 try{await handler({method:'POST',headers:{'x-dbest-owner-token':token},body:{batchId:'a3b38ef7-239b-4f16-a06d-6e701c41c6e1',rowNumber:1,decision,reason}},res)}
 finally{global.fetch=oldFetch;process.env=saved;}
 return {res,calls};
}
(async()=>{
 let x=await invoke({enabled:false});assert.equal(x.res.code,503);assert.equal(x.calls.length,0);
 x=await invoke({token:'invalid-owner-session-token-123456'});assert.equal(x.res.code,401);assert.equal(x.calls.length,1);
 x=await invoke({reason:'no'});assert.equal(x.res.code,400);assert.equal(x.calls.length,0);
 x=await invoke({decision:'published'});assert.equal(x.res.code,400);assert.equal(x.calls.length,0);
 x=await invoke({decision:'reviewed'});assert.equal(x.res.code,200);assert.equal(x.res.data.published,0);assert.equal(x.calls.length,2);
 assert.equal(x.calls[1].body.p_decision,'reviewed');
 x=await invoke({decision:'rejected'});assert.equal(x.res.code,200);assert.equal(x.calls[1].body.p_decision,'rejected');
 x=await invoke({rpcResult:false});assert.equal(x.res.code,409);
 console.log('Owner review feature gate, authentication, validation, decisions and conflict tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
