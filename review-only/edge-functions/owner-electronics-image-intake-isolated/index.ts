import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-dbest-owner-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const out=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:h});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:h});
 if(!["GET","POST"].includes(req.method))return out({error:"method_not_allowed"},405);
 const token=req.headers.get("x-dbest-owner-token")?.trim();if(!token)return out({error:"owner_session_required"},401);
 const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:owner,error:oe}=await sb.rpc("validate_owner_session",{p_token:token});
 if(oe||!owner)return out({error:"owner_session_invalid"},401);
 if(req.method==="GET"){const {data,error}=await sb.from("dbest_electronics_image_review_isolated").select("id,master_product_id,candidate_image_url,source_name,rights_basis,evidence_reference,review_status,submitted_at").order("submitted_at",{ascending:false}).limit(200);return error?out({error:"queue_unavailable"},503):out({ok:true,rows:data});}
 const b=await req.json().catch(()=>({}));
 if(b.action!=="submit_candidate")return out({error:"unsupported_action"},400);
 const url=String(b.imageUrl||"").trim(),source=String(b.sourceName||"").trim(),evidence=String(b.evidenceReference||"").trim(),basis=String(b.rightsBasis||"");
 if(!/^https:\/\/[^\s]+$/i.test(url)||url.includes("/functions/v1/dbest-catalogue-image-isolated")||!source||!evidence||!["manufacturer_authorized","distributor_authorized","vendor_owned","licensed_asset"].includes(basis))return out({error:"valid_image_source_and_rights_evidence_required"},400);
 const {data:p}=await sb.from("dbest_master_products").select("id").eq("id",String(b.productId||"")).eq("category","electronics").eq("status","draft").maybeSingle();if(!p)return out({error:"electronics_draft_not_found"},404);
 const {data,error}=await sb.from("dbest_electronics_image_review_isolated").insert({master_product_id:p.id,candidate_image_url:url,source_name:source.slice(0,200),rights_basis:basis,evidence_reference:evidence.slice(0,1000)}).select("id,review_status").single();
 return error?out({error:"submission_failed"},503):out({ok:true,submission:data,productPublished:false});
});