'use strict';
// Isolated Owner draft import. Requires explicitly provisioned staging table and
// feature flag; never inserts into the published master catalogue.
const {parseCsv}=require('./master-catalogue-csv-parser');
const {preflightBatch}=require('./master-catalogue-import-preflight');
const BASE=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(process.env.DBEST_MASTER_CATALOGUE_DRAFT_IMPORT_ENABLED!=='true')return reply(res,503,{ok:false,error:'draft_import_disabled'});
 if(!KEY||!BASE)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-owner-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 try{
  const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const auth=await fetch(BASE+'/rest/v1/rpc/validate_owner_session',{method:'POST',headers,body:JSON.stringify({p_token:token})});
  if(!auth.ok)return reply(res,503,{ok:false,error:'owner_session_verification_unavailable'});
  const owner=await auth.json();
  if(typeof owner!=='string'||!owner.includes('@'))return reply(res,401,{ok:false,error:'owner_session_invalid'});
  if(req.body?.rows!==undefined&&req.body?.csv!==undefined)return reply(res,400,{ok:false,error:'choose_csv_or_rows'});
  let rows=req.body?.rows;
  if(typeof req.body?.csv==='string'){
   try{rows=parseCsv(req.body.csv)}catch(e){return reply(res,400,{ok:false,error:e.message})}
  }
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)return reply(res,400,{ok:false,error:'invalid_batch_size'});
  const checks=preflightBatch(rows);
  if(checks.some(c=>!c.ok))return reply(res,422,{ok:false,error:'preflight_corrections_required',checks});
  const batchId=require('node:crypto').randomUUID();
  const payload=rows.map((row,i)=>({batch_id:batchId,row_number:i+1,payload:row,status:'draft',imported_by:owner}));
  const response=await fetch(BASE+'/rest/v1/dbest_master_catalogue_import_staging',{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify(payload)});
  if(!response.ok)return reply(res,503,{ok:false,error:'draft_staging_unavailable'});
  return reply(res,201,{ok:true,batchId,drafts:payload.length,published:0});
 }catch(e){console.error('[owner draft import]',e);return reply(res,500,{ok:false,error:'draft_import_failed'});}
};
