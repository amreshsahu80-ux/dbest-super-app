// Isolated read-only Partner catalogue API. Never accepts a vendor ID from the client.
// Requires existing vendor session token, verified server-side against its SHA-256 hash.
// This endpoint does not publish products or modify live vendor offers.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-vendor-token","Access-Control-Allow-Methods":"GET,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
async function sha256hex(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="GET")return respond({error:"method_not_allowed"},405);
 const token=req.headers.get("x-vendor-token")?.trim();
 if(!token||token.length<16||token.length>2048)return respond({error:"vendor_session_required"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return respond({error:"server_not_configured"},503);
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const hash=await sha256hex(token);
 const {data:session,error:sessionError}=await sb.from("marketplace_vendor_sessions_live")
 .select("vendor_id").eq("token_hash",hash).gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
 if(sessionError)return respond({error:"session_validation_unavailable"},503);
 if(!session)return respond({error:"vendor_session_invalid"},401);
 const {data:vendor,error:vendorError}=await sb.from("marketplace_vendors_live")
 .select("id,type,active,owner_approval,operational_hold").eq("id",session.vendor_id).maybeSingle();
 if(vendorError)return respond({error:"vendor_lookup_unavailable"},503);
 if(!vendor||!vendor.active||vendor.operational_hold||String(vendor.owner_approval||"").toLowerCase()!=="approved")
  return respond({error:"vendor_not_active"},403);
 const {data:products,error:productsError}=await sb.from("dbest_partner_auto_catalogue_isolated")
 .select("master_product_id,name,brand,category,image_url,auto_assigned,vendor_stock,vendor_price,vendor_mrp,in_stock,publication_checks_passed")
 .eq("vendor_id",vendor.id).order("name").limit(500);
 if(productsError)return respond({error:"catalogue_unavailable"},503);
 return respond({ok:true,category:vendor.type,autoAssigned:true,products:products||[],count:products?.length||0});
});
