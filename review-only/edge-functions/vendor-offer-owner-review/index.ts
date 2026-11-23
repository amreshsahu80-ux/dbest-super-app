// REVIEW ONLY — not deployed. Requires approved SQL migration and RPC.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-dbest-owner-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const token=String(req.headers.get("x-dbest-owner-token")||"").trim();
 if(!token)return json({error:"owner_session_required"},401);
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return json({error:"invalid_json"},400)}
 const action=String(body.action||"");
 if(!["review_offer","list_pending"].includes(action))return json({error:"unsupported_action"},400);
 const offerId=String(body.offerId||"");
 const version=body.expectedVersion;
 const decision=String(body.decision||"");
 const reason=String(body.reason||"");
 if(action==="review_offer" && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(offerId)
   ||typeof version!=="number"||!Number.isSafeInteger(version)||version<0
   ||!["approve","reject","suspend"].includes(decision)
   ||reason.length>1000))return json({error:"invalid_input"},400);
 try{
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({error:"server_not_configured"},503);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(action==="list_pending"){
   const {data:ownerEmail,error:authError}=await sb.rpc("validate_owner_session",{p_token:token});
   if(authError||!ownerEmail)return json({error:"owner_session_invalid"},401);
   const {data:offers,error:listError}=await sb.from("dbest_vendor_product_offers")
    .select("id,vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active,review_status,review_version,created_at")
    .eq("review_status","pending_review").order("created_at",{ascending:true}).limit(100);
   if(listError){console.error("vendor_offer_queue_failed",listError.code);return json({error:"queue_unavailable"},500)}
   return json({ok:true,offers:offers||[]});
  }
  // Do not accept client isOwner or reviewedBy. RPC verifies token and obtains actor server-side.
  const {data,error}=await sb.rpc("dbest_owner_review_vendor_offer",{
   p_owner_token:token,p_offer_id:offerId,p_expected_version:version,
   p_decision:decision,p_reason:reason
  });
  if(error){
   const msg=String(error.message||"");
   if(/owner_session_invalid/i.test(msg))return json({error:"owner_session_invalid"},401);
   if(/stale_review_version|duplicate_review/i.test(msg))return json({error:"review_conflict"},409);
   if(/offer_not_found/i.test(msg))return json({error:"offer_not_found"},404);
   if(/invalid_|not_sellable|not_approved|reason_required/i.test(msg))return json({error:"review_not_allowed"},422);
   console.error("vendor_offer_review_rpc_failed",error.code);
   return json({error:"review_failed"},500);
  }
  return json(data);
 }catch(e){console.error("vendor_offer_review_exception",e);return json({error:"unexpected_error"},500)}
});
