'use strict';
const assert=require('node:assert/strict');
process.env.SUPABASE_SERVICE_ROLE_KEY='mock-test-key';
const crypto=require('node:crypto');
const handler=require('../api/marketplace/vendor-offer-edit');
const offerId='14031b03-d2ca-438c-8bbf-b52f3f9c8a80';
const masterId='b12cc7dd-7baf-4cf4-8523-7476f03b8462';
async function run(master){
 const calls=[];
 const old=global.fetch;
 global.fetch=async(url,opts={})=>{
  calls.push({url,method:opts.method||'GET'});
  const data=url.includes('marketplace_vendor_sessions_live')?[{vendor_id:'VND1'}]:
   url.includes('marketplace_vendors_live')?[{id:'VND1',active:true,owner_approval:'Approved',operational_hold:false}]:
   url.includes('dbest_vendor_product_offers')?[{id:offerId,vendor_id:'VND1',master_product_id:masterId,price_inclusive_gst:100,stock:3,active:false}]:
   url.includes('dbest_master_products')?[master]:[];
  return {ok:true,json:async()=>data};
 };
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};
 try{await handler({method:'PATCH',headers:{'x-dbest-vendor-token':'valid-vendor-token-for-testing-12345'},body:{offerId,patch:{active:true}}},res);}
 finally{global.fetch=old}
 return {res,calls};
}
(async()=>{
 for(const master of [null,{id:masterId,status:'draft',specifications:{}},{id:masterId,status:'suspended',specifications:{}},{id:masterId,status:'approved',specifications:{test_only:true}}]){
  const {res,calls}=await run(master);
  assert.equal(res.statusCode,409);
  assert.equal(res.body.error,'master_product_not_publishable');
  assert.equal(calls.some(c=>c.method==='PATCH'),false);
 }
 const {res,calls}=await run({id:masterId,status:'approved',specifications:{test_only:false}});
 assert.equal(res.statusCode,200);
 assert.equal(calls.some(c=>c.method==='PATCH'),true);
 console.log('Vendor offer master activation guard tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
