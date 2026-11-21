'use strict';
// Owner-only dry-run preflight: no database writes and no product publication.
const {preflightBatch}=require('./master-catalogue-import-preflight');
const {parseCsv}=require('./master-catalogue-csv-parser');
const BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-owner-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 try{
  const auth=await fetch(BASE+'/rest/v1/rpc/validate_owner_session',{
   method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},
   body:JSON.stringify({p_token:token})});
  if(!auth.ok)return reply(res,503,{ok:false,error:'owner_session_verification_unavailable'});
  const owner=await auth.json();
  if(typeof owner!=='string'||!owner.includes('@'))return reply(res,401,{ok:false,error:'owner_session_invalid'});
  let rows=req.body?.rows;
  if(typeof req.body?.csv==='string'){
   if(rows!==undefined)return reply(res,400,{ok:false,error:'choose_csv_or_rows'});
   try{rows=parseCsv(req.body.csv)}catch(e){return reply(res,400,{ok:false,error:e.message});}
  }
  if(!Array.isArray(rows)||rows.length===0||rows.length>1000)
   return reply(res,400,{ok:false,error:'invalid_batch_size'});
  const results=preflightBatch(rows);
  return reply(res,200,{ok:true,dryRun:true,published:0,accepted:results.filter(x=>x.ok).length,
   needsCorrection:results.filter(x=>!x.ok).length,results});
 }catch(e){console.error('[catalogue preflight]',e);return reply(res,500,{ok:false,error:'preflight_failed'});}
};
