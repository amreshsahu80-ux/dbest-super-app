'use strict';
const assert=require('node:assert/strict');
process.env.SUPABASE_SERVICE_ROLE_KEY='mock-test-key';
const handler=require('../api/marketplace/owner-master-catalogue-preflight');
const row={category:'electronics',name:'Example Charger',brand:'Example',barcode_gtin:'12345678',mrp_inr:999,mrp_verified:true,image_url:'https://example.org/image.jpg',image_rights_verified:true};
async function run(token,rows){
 const old=global.fetch;const calls=[];
 global.fetch=async(url,opts={})=>{calls.push({url,method:opts.method});return {ok:true,json:async()=>token==='invalid-owner-token-long-enough'?'': 'owner@example.org'}};
 const res={setHeader(){},status(n){this.statusCode=n;return this},json(data){this.body=data;return this}};
 try{await handler({method:'POST',headers:{'x-dbest-owner-token':token},body:{rows}},res)}finally{global.fetch=old}
 return {res,calls};
}
(async()=>{
 let r=await run('valid-owner-token-long-enough',[row,{...row,barcode_gtin:'bad'}]);
 assert.equal(r.res.statusCode,200);
 assert.equal(r.res.body.accepted,1);
 assert.equal(r.res.body.needsCorrection,1);
 assert.equal(r.res.body.published,0);
 assert.equal(r.calls.length,1);
 r=await run('invalid-owner-token-long-enough',[row]);
 assert.equal(r.res.statusCode,401);
 assert.equal(r.calls.length,1);
 console.log('Owner master catalogue dry-run preflight API checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
