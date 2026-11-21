// Isolated staging endpoint. Isolated endpoint; no master publication. Does not publish master products.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-dbest-owner-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
type Row={category:string;name:string;mrp:number;description:string;dimensions:string;image_url:string;brand?:string};
function check(r:Row):string[]{
 const errors:string[]=[];
 for(const key of ["category","name","description","dimensions","image_url"] as const)
  if(typeof r?.[key]!=="string"||!r[key].trim()||r[key].length>2000)errors.push(key);
 if(typeof r?.mrp!=="number"||!Number.isFinite(r.mrp)||r.mrp<=0||Math.abs(r.mrp*100-Math.round(r.mrp*100))>1e-7)errors.push("mrp");
 try{if(new URL(r.image_url).protocol!=="https:")errors.push("image_url")}catch{errors.push("image_url")}
 return errors;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(!["GET","POST"].includes(req.method))return reply({error:"method_not_allowed"},405);
 const token=req.headers.get("x-dbest-owner-token")?.trim();
 if(!token)return reply({error:"owner_session_required"},401);
 if(req.method==="GET"){
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return reply({error:"server_not_configured"},503);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:owner,error:authError}=await sb.rpc("validate_owner_session",{p_token:token});
  if(authError||!owner)return reply({error:"owner_session_invalid"},401);
  const {data:rows,error}=await sb.from("dbest_master_catalogue_import_staging")
   .select("id,batch_id,row_number,payload,status,created_at")
   .eq("imported_by",owner).order("created_at",{ascending:false}).limit(100);
  if(error)return reply({error:"list_failed"},500);
  return reply({ok:true,rows:rows||[]});
 }
 let data:{rows?:Row[]};
 try{data=await req.json()}catch{return reply({error:"invalid_json"},400)}
 if((data as Record<string,unknown>).action==="review_draft"){
  const rowId=String((data as Record<string,unknown>).rowId||"");
  const decision=String((data as Record<string,unknown>).decision||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rowId)
     ||!["reviewed","rejected"].includes(decision))return reply({error:"invalid_review_request"},400);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return reply({error:"server_not_configured"},503);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:owner,error:authError}=await sb.rpc("validate_owner_session",{p_token:token});
  if(authError||!owner)return reply({error:"owner_session_invalid"},401);
  const {data:changed,error}=await sb.from("dbest_master_catalogue_import_staging")
   .update({status:decision}).eq("id",rowId).eq("imported_by",owner).eq("status","draft")
   .select("id,status").maybeSingle();
  if(error)return reply({error:"review_failed"},500);
  if(!changed)return reply({error:"draft_not_found_or_already_reviewed"},409);
  return reply({ok:true,rowId:changed.id,status:changed.status,published:0});
 }
 if(!Array.isArray(data.rows)||data.rows.length<1||data.rows.length>100)return reply({error:"batch_size_must_be_1_to_100"},400);
 const problems=data.rows.map((r,i)=>({row:i+2,errors:check(r)})).filter(x=>x.errors.length);
 if(problems.length)return reply({error:"invalid_rows",problems},422);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return reply({error:"server_not_configured"},503);
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:owner,error:authError}=await sb.rpc("validate_owner_session",{p_token:token});
 if(authError||!owner)return reply({error:"owner_session_invalid"},401);
 const batchId=crypto.randomUUID();
 const inserts=data.rows.map((r,i)=>({
  batch_id:batchId,row_number:i+2,imported_by:owner,status:"draft",
  payload:{category:r.category.trim(),name:r.name.trim(),brand:String(r.brand||"").trim(),
   mrp:r.mrp,description:r.description.trim(),dimensions:r.dimensions.trim(),
   image_url:r.image_url.trim(),specifications:{description:r.description.trim(),dimensions:r.dimensions.trim()}}
 }));
 const {error}=await sb.from("dbest_master_catalogue_import_staging").insert(inserts);
 if(error){console.error("owner_catalogue_stage_failed",error.code);return reply({error:"staging_failed"},500)}
 return reply({ok:true,batchId,staged:inserts.length,published:0,status:"draft"});
});
