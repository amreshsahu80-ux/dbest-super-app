import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-vendor-token,x-dbest-member-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const enc=new TextEncoder();
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:cors})}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return json({error:"server_not_configured"},503);
  const db=createClient(url,key,{auth:{persistSession:false}});
  const body=await req.json(),action=String(body.action||"");
  const token=String(req.headers.get("x-vendor-token")||"").trim();
  if(!token)return json({error:"vendor_session_required"},401);
  const {data:session}=await db.from("marketplace_vendor_sessions_live").select("vendor_id,expires_at").eq("token_hash",await sha(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(!session)return json({error:"vendor_session_invalid"},401);
  const {data:vendor}=await db.from("marketplace_vendors_live").select("id,owner_approval,active,operational_hold").eq("id",session.vendor_id).maybeSingle();
  if(!vendor||vendor.owner_approval!=="Approved"||vendor.active!==true||vendor.operational_hold===true)return json({error:"vendor_not_active"},403);
  if(action==="vendor_list"){
   const {data,error}=await db.from("marketplace_upload_requests_live").select("id,category,status,created_at,original_filename,quote_items,quoted_total").eq("vendor_id",vendor.id).order("created_at",{ascending:false}).limit(50);
   if(error)return json({error:"requests_unavailable"},503);
   return json({ok:true,requests:data||[]});
  }
  if(action==="vendor_quote"){
   const requestId=String(body.requestId||"").trim();
   const items=Array.isArray(body.items)?body.items:[];
   if(!requestId||items.length<1||items.length>100)return json({error:"invalid_quote"},400);
   let total=0;const safeItems=[];
   for(const item of items){const name=String(item.name||"").trim().slice(0,180),qty=Number(item.qty),price=Number(item.price);if(!name||!Number.isInteger(qty)||qty<1||qty>1000||!Number.isFinite(price)||price<0||price>100000)return json({error:"invalid_quote_item"},400);total+=qty*price;safeItems.push({name,qty,price})}
   total=Math.round(total*100)/100;if(total>1000000)return json({error:"quote_too_large"},400);
   const {data,error}=await db.from("marketplace_upload_requests_live").update({quote_items:safeItems,quoted_total:total,status:"Quote Ready",updated_at:new Date().toISOString()}).eq("id",requestId).eq("vendor_id",vendor.id).in("status",["Submitted","Vendor Reviewing","Quote Ready"]).select("id,status,quoted_total").maybeSingle();
   if(error)return json({error:"quote_update_failed"},503);
   if(!data)return json({error:"request_not_found_or_not_editable"},409);
   return json({ok:true,request:data});
  }
  return json({error:"unsupported_action"},400);
 }catch(e){console.error("marketplace-upload-requests",e);return json({error:"request_failed"},500)}
});
