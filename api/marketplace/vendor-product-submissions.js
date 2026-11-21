'use strict';
// Isolated API: vendor submissions only. Does not publish or alter existing live catalogue.
const crypto=require('node:crypto');
const {validateBatch}=require('./vendor-product-validation');
const {autoMatchDecision}=require('./vendor-product-auto-match-policy');
const URL_BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const respond=(res,status,data)=>res.status(status).json(data);
async function db(path,opts={}){
 const response=await fetch(URL_BASE+'/rest/v1/'+path,{method:opts.method||'GET',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:opts.body?JSON.stringify(opts.body):undefined});
 if(!response.ok)throw Error('database_operation_failed');
 return response.json();
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return respond(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return respond(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-vendor-token']||'');
 if(token.length<20||token.length>500)return respond(res,401,{ok:false,error:'vendor_session_required'});
 try{
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const sessions=await db('marketplace_vendor_sessions_live?token_hash=eq.'+encodeURIComponent(hash)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=vendor_id&limit=1');
  const vendorId=sessions[0]?.vendor_id;
  if(!vendorId)return respond(res,401,{ok:false,error:'invalid_vendor_session'});
  const vendors=await db('marketplace_vendors_live?id=eq.'+encodeURIComponent(vendorId)+'&select=id,active,owner_approval,operational_hold&limit=1');
  const vendor=vendors[0];
  if(!vendor||vendor.active!==true||vendor.owner_approval!=='Approved'||vendor.operational_hold===true)return respond(res,403,{ok:false,error:'vendor_not_eligible'});
  if(req.method==='GET'){
   const rows=await db('dbest_vendor_product_submissions?vendor_id=eq.'+encodeURIComponent(vendorId)+'&select=id,payload,status,created_at,matched_master_product_id&order=created_at.desc&limit=100');
   return respond(res,200,{ok:true,submissions:rows});
  }
  const rows=Array.isArray(req.body?.products)?req.body.products:[req.body?.product];
  if(rows.length>100)return respond(res,413,{ok:false,error:'batch_too_large'});
  const results=validateBatch(rows,{maxRows:100});
  const valid=results.filter(r=>r.ok);
  if(!valid.length)return respond(res,400,{ok:false,error:'no_valid_products',results:results.map(({row,ok,error})=>({row,ok,error}))});
  // Determine eligibility without publishing. An atomic, server-authorized RPC
  // is required before any auto-match may activate a vendor offer.
  const barcodes=[...new Set(valid.map(r=>r.product.barcode).filter(Boolean))];
  const masters=barcodes.length?await db('dbest_master_products?barcode_gtin=in.('+barcodes.map(encodeURIComponent).join(',')+')&select=id,category,name,brand,barcode_gtin,status,specifications,image_rights_verified,gst_verified_at&limit=1000'):[];
  const decisions=valid.map(r=>({row:r.row,...autoMatchDecision({vendor,product:r.product,masters})}));
  const batchId=crypto.randomUUID();
  const inserted=await db('dbest_vendor_product_submissions',{method:'POST',body:valid.map(r=>({vendor_id:vendorId,payload:r.product,import_batch_id:batchId,status:'pending_owner_review'}))});
  return respond(res,201,{ok:true,batchId,accepted:inserted.length,autoMatchCandidates:decisions.filter(d=>d.eligible).length,publicationPending:true,results:results.map(({row,ok,error})=>({row,ok,error:error||null,match:decisions.find(d=>d.row===row)||null}))});
 }catch(e){console.error('[vendor submissions]',e);return respond(res,500,{ok:false,error:'vendor_submission_failed'})}
};
