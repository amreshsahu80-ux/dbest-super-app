'use strict';
// Isolated vendor offer editor. Session identity is derived server-side.
const crypto=require('node:crypto');
const {updateOffer}=require('./vendor-offer-rules');
const {calculateOffer}=require('./vendor-offer-pricing');
const BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
async function db(path,{method='GET',body}={}){
 const response=await fetch(BASE+'/rest/v1/'+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)throw Error('database_operation_failed');
 return response.json();
}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='PATCH')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-vendor-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'vendor_session_required'});
 const offerId=String(req.body?.offerId||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId))return reply(res,400,{ok:false,error:'invalid_offer_id'});
 try{
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const sessions=await db('marketplace_vendor_sessions_live?token_hash=eq.'+encodeURIComponent(hash)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=vendor_id&limit=1');
  const vendorId=sessions[0]?.vendor_id;
  if(!vendorId)return reply(res,401,{ok:false,error:'invalid_vendor_session'});
  const vendors=await db('marketplace_vendors_live?id=eq.'+encodeURIComponent(vendorId)+'&select=id,active,owner_approval,operational_hold&limit=1');
  const vendor=vendors[0];
  if(!vendor||vendor.active!==true||vendor.owner_approval!=='Approved'||vendor.operational_hold===true)return reply(res,403,{ok:false,error:'vendor_not_eligible'});
  const offers=await db('dbest_vendor_product_offers?id=eq.'+offerId+'&vendor_id=eq.'+encodeURIComponent(vendorId)+'&select=*&limit=1');
  const offer=offers[0];
  if(!offer)return reply(res,404,{ok:false,error:'offer_not_found'});
  const patch=req.body?.patch;
  if(!patch||typeof patch!=='object'||Array.isArray(patch))return reply(res,400,{ok:false,error:'invalid_patch'});
  if(Object.hasOwn(patch,'mrp'))return reply(res,400,{ok:false,error:'master_mrp_read_only'});
  const pricingRequested=Object.hasOwn(patch,'discount_percent')||Object.hasOwn(patch,'price_inclusive_gst');
  const masterRows=await db('dbest_master_products?id=eq.'+encodeURIComponent(offer.master_product_id)+'&select=id,status,specifications&limit=1');
  const master=masterRows[0];
  if(patch.active===true&&(!master||master.status!=='approved'||master.specifications?.test_only===true))
   return reply(res,409,{ok:false,error:'master_product_not_publishable'});
  let effectivePatch={...patch};
  if(pricingRequested){
   if(!master||master.status!=='approved'||master.specifications?.test_only===true)
    return reply(res,409,{ok:false,error:'master_product_not_publishable'});
   // Until a verified MRP is stored on the master, price edits remain blocked.
   // This avoids treating legacy vendor-entered MRP as authoritative.
   if(master.specifications?.mrp_verified!==true||master.specifications?.verified_mrp_inr===null||master.specifications?.verified_mrp_inr===undefined)
    return reply(res,409,{ok:false,error:'verified_master_mrp_required'});
   try{
    const computed=calculateOffer({mrp:master.specifications.verified_mrp_inr,
     sellingPrice:patch.price_inclusive_gst,discountPercent:patch.discount_percent});
    effectivePatch.price_inclusive_gst=computed.priceInclusiveGst;
    // Legacy offer MRP is not authoritative. Keep it unchanged until a
    // separate Owner-controlled reconciliation migrates existing records.
    delete effectivePatch.discount_percent;
   }catch(e){return reply(res,400,{ok:false,error:e.message});}
  }
  let next;
  try{next=updateOffer({actorVendorId:vendorId,offer,patch:effectivePatch,vendor,verifiedMasterMrp:master?.specifications?.mrp_verified===true?Number(master.specifications.verified_mrp_inr):null});}
  catch(e){return reply(res,400,{ok:false,error:e.message});}
  const allowed=['price_inclusive_gst','stock','active','vendor_image_url','vendor_image_review_status'];
  const updates=Object.fromEntries(allowed.filter(k=>next[k]!==offer[k]).map(k=>[k,next[k]]));
  if(!Object.keys(updates).length)return reply(res,200,{ok:true,offer});
  updates.updated_at=new Date().toISOString();
  const updated=await db('dbest_vendor_product_offers?id=eq.'+offerId+'&vendor_id=eq.'+encodeURIComponent(vendorId),{method:'PATCH',body:updates});
  if(updated.length!==1)return reply(res,409,{ok:false,error:'offer_update_conflict'});
  return reply(res,200,{ok:true,offer:updated[0]});
 }catch(e){console.error('[vendor offer edit]',e);return reply(res,500,{ok:false,error:'vendor_offer_update_failed'});}
};
