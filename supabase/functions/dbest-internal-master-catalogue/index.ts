import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
Deno.serve(async req=>{
const origin=req.headers.get("origin")||"";
const allowed=["https://dbest4u.com","https://www.dbest4u.com","https://dbest-internal-catalogue-team-test-db-est.vercel.app","https://dbest-internal-catalogue-team-test-m8j46z3xl-db-est.vercel.app"];
const headers={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Origin":allowed.includes(origin)?origin:"https://dbest4u.com","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"authorization,content-type,apikey"};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const aliases:Record<string,string>={"grocery":"Grocery & FMCG","grocery & fmcg":"Grocery & FMCG","fmcg":"Grocery & FMCG","electronics":"Electronics","electronic":"Electronics","restaurant":"Restaurant","restaurants":"Restaurant","food":"Restaurant","medicine":"Medicines (OTC)","medicines":"Medicines (OTC)","medicines (otc)":"Medicines (OTC)","pharmacy":"Medicines (OTC)"};
function label(v:any):string{const s=String(typeof v==="object"?(v.category||v.label||v.key||v.type||""):v||"").trim();return aliases[s.toLowerCase()]||s}
function allowedCategories(v:any):string[]{const m=v?.profile_meta&&typeof v.profile_meta==="object"?v.profile_meta:{};const raw=m.approvedCategories??m.approvedBusinessCategories??m.businessCategories??m.categories;const rows=Array.isArray(raw)?raw:(typeof raw==="string"?raw.split(/[;,|]/):[]);const out=rows.filter((x:any)=>!(x&&typeof x==="object"&&(x.approved===false||String(x.status||"").toLowerCase().includes("pending")))).map(label).filter(Boolean);if(!out.length&&v?.type)out.push(label(v.type));return[...new Set(out)]}
if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
if(req.method!=="GET")return respond({error:"method_not_allowed"},405);
const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
if(!token||token.length<24||token.length>512)return respond({error:"authentication_required"},401);
const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
const [{data:vendor},{data:owner}]=await Promise.all([
sb.from("marketplace_vendor_sessions_live").select("vendor_id").eq("token_hash",hash).gt("expires_at",new Date().toISOString()).maybeSingle(),
sb.from("super_admin_sessions").select("admin_id").eq("token_hash",hash).gt("expires_at",new Date().toISOString()).maybeSingle()]);
if(!vendor&&!owner)return respond({error:"invalid_or_expired_session"},403);
let allowed:string[]=[];if(vendor){const {data:v}=await sb.from("marketplace_vendors_live").select("id,type,profile_meta,active,owner_approval,operational_hold").eq("id",vendor.vendor_id).maybeSingle();if(!v||!v.active||v.owner_approval!=="Approved"||v.operational_hold)return respond({error:"vendor_not_eligible"},403);allowed=allowedCategories(v);if(!allowed.length)return respond({error:"vendor_category_not_approved"},403)}
const url=new URL(req.url);const page=Math.max(0,Math.min(20,Number(url.searchParams.get("page")||0)||0));const category=url.searchParams.get("category");if(vendor&&category&&!allowed.some(c=>c.toLowerCase()===label(category).toLowerCase()))return respond({error:"category_not_approved_for_vendor"},403);
let q=sb.from("dbest_uploaded_master_catalogue_isolated").select("sku,category,subcategory,brand,product_title,variant_pack,image_src,image_alt,image_verification_status",{count:"exact"}).order("sku");if(vendor)q=q.in("category",allowed);if(category)q=q.eq("category",label(category));q=q.range(page*60,page*60+59);
const {data,error,count}=await q;if(error)return respond({error:"catalogue_unavailable"},503);
return respond({ok:true,internal_test_only:true,role:owner?"owner":"vendor",approvedCategories:vendor?allowed:undefined,page,total:count,items:data||[],notice:"Reference images only. No customer checkout enabled."});
});