'use strict';
// Owner-only approval of vendor-specific images. Never changes master product imagery.
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
  if(!sessions[0]?.admin_id)return reply(res,401,{ok:false,error:'invalid_owner_session'});
  if(req.method==='GET'){
   const offers=await db('dbest_vendor_product_offers?vendor_image_review_status=eq.pending_review&select=id,vendor_id,master_product_id,vendor_image_url,vendor_image_review_status,created_at&order=created_at.asc&limit=100');
   return reply(res,200,{ok:true,pendingImages:offers});
  }
  const offerId=String(req.body?.offerId||'');
  const decision=String(req.body?.decision||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId)||!['approved','rejected'].includes(decision))return reply(res,400,{ok:false,error:'invalid_review_request'});
  const offers=await db('dbest_vendor_product_offers?id=eq.'+offerId+'&vendor_image_review_status=eq.pending_review&select=id,vendor_image_url&limit=1');
  if(!offers[0]||!offers[0].vendor_image_url)return reply(res,404,{ok:false,error:'pending_image_not_found'});
  const updated=await db('dbest_vendor_product_offers?id=eq.'+offerId+'&vendor_image_review_status=eq.pending_review',{method:'PATCH',body:{vendor_image_review_status:decision,updated_at:new Date().toISOString()}});
  if(updated.length!==1)return reply(res,409,{ok:false,error:'image_review_conflict'});
  return reply(res,200,{ok:true,offerId,decision,cataloguePublished:false});
 }catch(e){console.error('[owner image review]',e);return reply(res,500,{ok:false,error:'owner_image_review_failed'});}
};
