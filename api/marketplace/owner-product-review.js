'use strict';
// Owner-only review of vendor-submitted products. Does not auto-publish catalogue items.
const crypto=require('node:crypto');
const BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
async function db(path,{method='GET',body}={}){
 const r=await fetch(BASE+'/rest/v1/'+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw Error('database_operation_failed');
 return r.json();
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-admin-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 try{
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const sessions=await db('super_admin_sessions?token_hash=eq.'+encodeURIComponent(hash)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=admin_id&limit=1');
  const adminId=sessions[0]?.admin_id;
  if(!adminId)return reply(res,401,{ok:false,error:'invalid_owner_session'});
  if(req.method==='GET'){
   const rows=await db('dbest_vendor_product_submissions?status=eq.pending_owner_review&select=id,vendor_id,payload,status,created_at&order=created_at.asc&limit=100');
   return reply(res,200,{ok:true,submissions:rows});
  }
  const id=String(req.body?.submissionId||'');
  const decision=String(req.body?.decision||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!['rejected','needs_correction','approved'].includes(decision))return reply(res,400,{ok:false,error:'invalid_review_request'});
  const rows=await db('dbest_vendor_product_submissions?id=eq.'+id+'&status=eq.pending_owner_review&select=id,status,matched_master_product_id&limit=1');
  if(!rows[0])return reply(res,404,{ok:false,error:'pending_submission_not_found'});
  // Approval requires explicit master-product matching to avoid duplicates.
  const masterId=String(req.body?.masterProductId||'');
  if(decision==='approved'){
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(masterId))return reply(res,400,{ok:false,error:'approved_master_product_required'});
   const masters=await db('dbest_master_products?id=eq.'+masterId+'&select=id,status&limit=1');
   if(!masters[0])return reply(res,404,{ok:false,error:'master_product_not_found'});
  }
  const updated=await db('dbest_vendor_product_submissions?id=eq.'+id+'&status=eq.pending_owner_review',{method:'PATCH',body:{status:decision,matched_master_product_id:decision==='approved'?masterId:null,reviewed_by:String(adminId),reviewed_at:new Date().toISOString()}});
  if(updated.length!==1)return reply(res,409,{ok:false,error:'review_conflict'});
  return reply(res,200,{ok:true,submission:updated[0],cataloguePublished:false});
 }catch(e){console.error('[owner product review]',e);return reply(res,500,{ok:false,error:'owner_review_failed'})}
};
