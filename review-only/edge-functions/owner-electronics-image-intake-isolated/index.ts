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
 if(!["submit_candidate","submit_bulk_candidates"].includes(b.action))return out({error:"unsupported_action"},400);
 const candidates=b.action==="submit_bulk_candidates"?b.candidates:[b];
 if(!Array.isArray(candidates)||candidates.length<1||candidates.length>25)return out({error:"submit_1_to_25_candidates"},400);
 const entries=[];
 for(const c of candidates){
 const url=String(c.imageUrl||"").trim(),source=String(c.sourceName||"").trim(),evidence=String(c.evidenceReference||"").trim(),basis=String(c.rightsBasis||"");
 if(!/^https:\/\/[^\s]+$/i.test(url)||url.includes("/functions/v1/dbest-catalogue-image-isolated")||!source||!["manufacturer_authorized","distributor_authorized","vendor_owned","licensed_asset"].includes(basis))return out({error:"valid_image_source_and_rights_basis_required"},400);
 const {data:p}=await sb.from("dbest_master_products").select("id").eq("id",String(c.productId||"")).eq("category","electronics").eq("status","draft").maybeSingle();
 if(!p)return out({error:"electronics_draft_not_found",productId:c.productId},404);
 entries.push({master_product_id:p.id,candidate_image_url:url,source_name:source.slice(0,200),rights_basis:basis,evidence_reference:(evidence||"Source recorded: "+source).slice(0,1000)});
 }
 const {data,error}=await sb.from("dbest_electronics_image_review_isolated").insert(entries).select("id,review_status");
 return error?out({error:"submission_failed"},503):out({ok:true,submitted:data?.length||0,reviewStatus:"pending",productPublished:false,rightsAutomaticallyVerified:false});
});