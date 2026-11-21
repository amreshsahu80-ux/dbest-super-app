'use strict';
const assert=require('node:assert/strict');
process.env.SUPABASE_SERVICE_ROLE_KEY='mock-test-key';
const handler=require('../api/marketplace/vendor-offer-edit');
const id='14031b03-d2ca-438c-8bbf-b52f3f9c8a80';
async function check(patch,master={id:'m',status:'approved',specifications:{mrp_verified:true,verified_mrp_inr:350}}){
 const calls=[];const original=global.fetch;
 global.fetch=async(url,opts={})=>{
  calls.push({url,method:opts.method||'GET',body:opts.body&&JSON.parse(opts.body)});
  let data=[];
  if(url.includes('marketplace_vendor_sessions_live'))data=[{vendor_id:'VND1'}];
  else if(url.includes('marketplace_vendors_live'))data=[{id:'VND1',active:true,owner_approval:'Approved',operational_hold:false}];
  else if(url.includes('dbest_master_products'))data=master?[master]:[];
  else if(url.includes('dbest_vendor_product_offers'))data=[{id,vendor_id:'VND1',master_product_id:'m',mrp:350,price_inclusive_gst:100,stock:2,active:false}];
  if(opts.method==='PATCH')data=[{id,vendor_id:'VND1',...opts.body&&JSON.parse(opts.body)}];
  return {ok:true,json:async()=>data};
 };
 const res={setHeader(){},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 try{await handler({method:'PATCH',headers:{'x-dbest-vendor-token':'valid-vendor-token-for-testing-12345'},body:{offerId:id,patch}},res);}
 finally{global.fetch=original}
 return {res,calls};
}
(async()=>{
 let r=await check({discount_percent:10});
 assert.equal(r.res.statusCode,200);
 assert.equal(r.calls.find(x=>x.method==='PATCH').body.price_inclusive_gst,315);
 assert.equal(Object.hasOwn(r.calls.find(x=>x.method==='PATCH').body,'mrp'),false);
 r=await check({price_inclusive_gst:280});
 assert.equal(r.res.statusCode,200);
 assert.equal(r.calls.find(x=>x.method==='PATCH').body.price_inclusive_gst,280);
 for(const patch of [{mrp:300},{discount_percent:101},{discount_percent:10,price_inclusive_gst:315},{price_inclusive_gst:400}]){
  r=await check(patch);
  assert.equal(r.res.statusCode,400);
  assert.equal(r.calls.some(x=>x.method==='PATCH'),false);
 }
 r=await check({discount_percent:10},{id:'m',status:'approved',specifications:{}});
 assert.equal(r.res.statusCode,409);
 assert.equal(r.res.body.error,'verified_master_mrp_required');
 console.log('Vendor verified-MRP API checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
