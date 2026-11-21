'use strict';
// Owner-only draft review. Does not publish catalogue products.
const BASE=String(process.env.SUPABASE_URL||'').replace(/\\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(process.env.DBEST_MASTER_CATALOGUE_REVIEW_ENABLED!=='true')return reply(res,503,{ok:false,error:'review_disabled'});
 if(!BASE||!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-owner-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 const {batchId,rowNumber,decision,reason}=req.body||{};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(batchId||''))||
 !Number.isInteger(rowNumber)||rowNumber<1||rowNumber>1000||
 !['reviewed','rejected'].includes(decision)||
 typeof reason!=='string'||reason.trim().length<5||reason.length>500)
 return reply(res,400,{ok:false,error:'invalid_review_request'});
 try{
  const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  const auth=await fetch(BASE+'/rest/v1/rpc/validate_owner_session',{method:'POST',headers,body:JSON.stringify({p_token:token})});
  if(!auth.ok)return reply(res,503,{ok:false,error:'owner_session_verification_unavailable'});
  const owner=await auth.json();
  if(typeof owner!=='string'||!owner.includes('@'))return reply(res,401,{ok:false,error:'owner_session_invalid'});
  // Database RPC performs status transition and audit atomically.
  const result=await fetch(BASE+'/rest/v1/rpc/dbest_review_master_catalogue_draft',{
   method:'POST',headers,body:JSON.stringify({p_batch_id:batchId,p_row_number:rowNumber,p_decision:decision,p_reason:reason.trim(),p_actor:owner})});
  if(!result.ok)return reply(res,503,{ok:false,error:'review_write_unavailable'});
  const data=await result.json();
  if(data!==true)return reply(res,409,{ok:false,error:'draft_not_pending'});
  return reply(res,200,{ok:true,batchId,rowNumber,status:decision,published:0});
 }catch(e){console.error('[owner catalogue review]',e);return reply(res,500,{ok:false,error:'review_failed'});}
};
