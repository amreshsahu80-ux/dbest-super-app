'use strict';
const assert=require('node:assert/strict');
const handlerPath='../api/marketplace/owner-master-catalogue-draft-import';
const good={category:'electronics',name:'Example Charger',brand:'Example',barcode_gtin:'12345678',mrp_inr:'999',mrp_verified:'true',image_url:'https://example.org/item.jpg',image_rights_verified:'true'};
async function invoke({enabled=true,token='valid-owner-session-token-123456',rows=[good],csv}={}){
 const oldFetch=global.fetch,oldFlag=process.env.DBEST_MASTER_CATALOGUE_DRAFT_IMPORT_ENABLED,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY,oldUrl=process.env.SUPABASE_URL;
 process.env.DBEST_MASTER_CATALOGUE_DRAFT_IMPORT_ENABLED=enabled?'true':'false';
 process.env.SUPABASE_SERVICE_ROLE_KEY='mock-key';
 process.env.SUPABASE_URL='https://example.supabase.co';
 delete require.cache[require.resolve(handlerPath)];
 const handler=require(handlerPath);
 const calls=[];
 global.fetch=async(url,opts={})=>{
  calls.push({url,method:opts.method,body:opts.body&&JSON.parse(opts.body)});
  return {ok:true,json:async()=>url.includes('validate_owner_session')?(token.startsWith('invalid')?'':'owner@example.org'):[]};
 };
 const res={setHeader(){},status(n){this.code=n;return this},json(v){this.data=v;return this}};
 try{await handler({method:'POST',headers:{'x-dbest-owner-token':token},body:csv===undefined?{rows}:{csv}},res)}
 finally{
  global.fetch=oldFetch;
  if(oldFlag===undefined)delete process.env.DBEST_MASTER_CATALOGUE_DRAFT_IMPORT_ENABLED;else process.env.DBEST_MASTER_CATALOGUE_DRAFT_IMPORT_ENABLED=oldFlag;
  if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
  if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
 }
 return {res,calls};
}
(async()=>{
 let r=await invoke({enabled:false});assert.equal(r.res.code,503);assert.equal(r.calls.length,0);
 r=await invoke({token:'invalid-owner-session-token-12345'});assert.equal(r.res.code,401);assert.equal(r.calls.length,1);
 r=await invoke({rows:[{...good,mrp_verified:'false'}]});assert.equal(r.res.code,422);assert.equal(r.calls.length,1);
 r=await invoke();assert.equal(r.res.code,201);assert.equal(r.res.data.drafts,1);assert.equal(r.res.data.published,0);
 assert.equal(r.calls.length,2);assert.ok(r.calls[1].url.endsWith('/dbest_master_catalogue_import_staging'));
 assert.equal(r.calls[1].body[0].status,'draft');
 assert.equal(r.calls[1].body[0].payload.name,good.name);
 console.log('Owner draft import feature-gate, authentication and staging tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
