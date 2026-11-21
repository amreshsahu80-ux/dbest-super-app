'use strict';
const BASE=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/$/,'');
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY;
const reply=(res,status,data)=>res.status(status).json(data);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!KEY)return reply(res,503,{ok:false,error:'service_unavailable'});
 const token=String(req.headers['x-dbest-owner-token']||'');
 if(token.length<20||token.length>500)return reply(res,401,{ok:false,error:'owner_session_required'});
 const headers={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
 try{
  const auth=await fetch(BASE+'/rest/v1/rpc/validate_owner_session',{method:'POST',headers,body:JSON.stringify({p_token:token})});
  if(!auth.ok)return reply(res,503,{ok:false,error:'owner_session_verification_unavailable'});
  const email=await auth.json();
  if(typeof email!=='string'||!email.includes('@'))return reply(res,401,{ok:false,error:'owner_session_invalid'});
  const r=await fetch(BASE+'/rest/v1/marketplace_vendors_live?select=id,name,type,active,owner_approval,operational_hold&order=name.asc&limit=500',{headers});
  if(!r.ok)return reply(res,503,{ok:false,error:'vendor_list_unavailable'});
  const vendors=await r.json();
  return reply(res,200,{ok:true,vendors:Array.isArray(vendors)?vendors:[]});
 }catch(e){console.error('[owner vendor list]',e);return reply(res,500,{ok:false,error:'vendor_list_failed'});}
};
