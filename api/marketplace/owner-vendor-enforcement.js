'use strict';
const crypto=require('node:crypto');
const {ownerVendorDecision}=require('./vendor-enforcement-rules');
const BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-admin-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 const vendorId=String(req.body?.vendorId||'');
 const action=String(req.body?.action||'');
 const reason=String(req.body?.reason||'');
 if(!vendorId||vendorId.length>100||!['suspend','reinstate','terminate'].includes(action)||action!=='reinstate'&&reason.trim().length<10)return reply(res,400,{ok:false,error:'invalid_enforcement_request'});
 try{
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const r=await fetch(BASE+'/rest/v1/rpc/dbest_enforce_vendor',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token_hash:hash,p_vendor_id:vendorId,p_action:action,p_reason:reason})});
  if(!r.ok)return reply(res,r.status===404?503:400,{ok:false,error:'vendor_enforcement_failed'});
  return reply(res,200,await r.json());
 }catch(e){console.error('[owner vendor enforcement]',e);return reply(res,500,{ok:false,error:'vendor_enforcement_failed'});}
};
