// Isolated Owner-controlled master-product review. Never overrides image rights or publication blocks.
// Approves one eligible product per explicit Owner request; vendor assignment remains automatic.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-dbest-owner-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="GET"&&req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const token=req.headers.get("x-dbest-owner-token")?.trim();
 if(!token)return reply({error:"owner_session_required"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return reply({error:"server_not_configured"},503);
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:owner,error:authError}=await sb.rpc("validate_owner_session",{p_token:token});
 if(authError||!owner)return reply({error:"owner_session_invalid"},401);
 if(req.method==="GET"){
  const {data,error}=await sb.from("dbest_master_products").select("id,name,brand,category,status,image_url,image_rights_verified,specifications")
  .eq("category","electronics").order("created_at",{ascending:false}).limit(200);
  if(error)return reply({error:"catalogue_unavailable"},503);
  const rows=(data||[]).map(p=>{
   const blocked=p.specifications?.customer_publication_blocked===true||p.specifications?.customer_publication_blocked==="true";
   const reasons=[...(!p.image_url?["image_missing"]:[]),...(!p.image_rights_verified?["image_rights_unverified"]:[]),...(blocked?["customer_publication_blocked"]:[])];
   return {id:p.id,name:p.name,brand:p.brand,status:p.status,image_url:p.image_url,eligibleForApproval:reasons.length===0,blockers:reasons};
  });
  return reply({ok:true,category:"electronics",total:rows.length,eligible:rows.filter(x=>x.eligibleForApproval).length,rows});
 }
 let body:{action?:string;productId?:string};
 try{body=await req.json()}catch{return reply({error:"invalid_json"},400)}
 if(body.action!=="approve_product"||!uuid.test(body.productId||""))return reply({error:"invalid_action_or_product"},400);
 const {data:p,error:readError}=await sb.from("dbest_master_products")
  .select("id,category,status,image_url,image_rights_verified,specifications").eq("id",body.productId).maybeSingle();
 if(readError)return reply({error:"product_lookup_failed"},503);
 if(!p||p.category!=="electronics")return reply({error:"product_not_found"},404);
 if(p.status!=="draft")return reply({error:"product_not_draft"},409);
 const blocked=p.specifications?.customer_publication_blocked===true||p.specifications?.customer_publication_blocked==="true";
 if(!p.image_rights_verified||!p.image_url||blocked)return reply({error:"publication_checks_incomplete",imageRightsVerified:!!p.image_rights_verified,imagePresent:!!p.image_url,publicationBlocked:blocked},409);
 const {data:changed,error}=await sb.from("dbest_master_products").update({status:"approved",updated_at:new Date().toISOString()})
 .eq("id",p.id).eq("category","electronics").eq("status","draft").eq("image_rights_verified",true).select("id,status").maybeSingle();
 if(error)return reply({error:"approval_failed"},503);
 if(!changed)return reply({error:"approval_conflict"},409);
 return reply({ok:true,productId:changed.id,status:changed.status,approvedByOwner:true,vendorApprovalRequired:false});
});