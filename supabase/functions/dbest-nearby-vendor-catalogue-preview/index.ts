import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.0";
Deno.serve(async req=>{
 const h={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"authorization,content-type,apikey","Cache-Control":"no-store"};
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:h});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="GET")return reply({error:"method_not_allowed"},405);
 const params=new URL(req.url).searchParams;
 const category=params.get("category")||"Electronics";
 const lat=Number(params.get("lat")),lng=Number(params.get("lng"));
 if(!params.has("lat")||!params.has("lng")||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return reply({error:"location_required"},400);
 const distance=(a:number,b:number)=>{const rad=Math.PI/180;const h=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lng)*rad/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));};
 if(!["Electronics","Grocery & FMCG","Grocery","FMCG","Cosmetics","Restaurant","Medicines (OTC)"].includes(category))return reply({error:"invalid_category"},400);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:masters,error}=await db.from("dbest_uploaded_master_catalogue_isolated")// A vendor offer is independently publishable once selected, priced, and stocked. Keep the owner visibility gate, but do not require the master-only customer_publish flag for vendor offers.
 .select("sku,product_title,category,image_src,variant_pack,public_catalogue_visible").eq("category",category).eq("public_catalogue_visible",true).limit(100);
 if(error)return reply({error:"catalogue_unavailable"},503);
 const skus=(masters||[]).map(x=>x.sku);
 if(!skus.length)return reply({ok:true,items:[]});
 const {data:links}=await db.from("dbest_uploaded_master_product_links_isolated").select("sku,master_product_id").in("sku",skus);
 const ids=(links||[]).map(x=>x.master_product_id);
 if(!ids.length)return reply({ok:true,items:[]});
 const {data:offers}=await db.from("dbest_vendor_product_offers").select("vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active").in("master_product_id",ids).eq("active",true).gt("stock",0);
 const vendorIds=[...new Set((offers||[]).map(x=>x.vendor_id))];
 const {data:vendors}=vendorIds.length?await db.from("marketplace_vendors_live").select("id,name,active,operational_hold,owner_approval,lat,lng,agreement_status").in("id",vendorIds):{data:[]};
 const eligible=new Map((vendors||[]).filter(v=>v.active&&!v.operational_hold&&v.owner_approval==="Approved"&&v.agreement_status==="Fully Signed").map(v=>[v.id,v]));
 const byId=new Map((links||[]).map(l=>[l.master_product_id,l.sku]));
 const bySku=new Map((masters||[]).map(m=>[m.sku,m]));
 const items=(offers||[]).filter(o=>eligible.has(o.vendor_id)).map(o=>{const m=bySku.get(byId.get(o.master_product_id));if(!m)return null;const v=eligible.get(o.vendor_id);if(!v||v.lat==null||v.lng==null)return null;const km=distance(Number(v.lat),Number(v.lng));const radius=15;if(!Number.isFinite(km)||km>radius)return null;return {distanceKm:Math.round(km*100)/100,radiusKm:radius,sku:m.sku,name:m.product_title,category:m.category,imageUrl:m.image_src,variant:m.variant_pack,vendorId:o.vendor_id,vendorName:eligible.get(o.vendor_id).name,price:Number(o.price_inclusive_gst),mrp:o.mrp===null?null:Number(o.mrp),stock:o.stock,canBuy:false,notice:"Customer checkout integration pending verification"};}).filter(Boolean);
 const groups=new Map<string,any[]>();
 for(const item of items){if(!item||!Number.isFinite(item.price)||item.price<=0)continue;const group=groups.get(item.sku)||[];if(!group.some(x=>x.vendorId===item.vendorId))group.push(item);groups.set(item.sku,group);}
 const ranked=Array.from(groups.values()).flatMap(group=>{const min=Math.min(...group.map(x=>x.price));const score=(x:any)=>0.5*(1-min/x.price)+0.5*x.distanceKm/15;return group.sort((a,b)=>score(a)-score(b)||a.price-b.price||a.distanceKm-b.distanceKm||a.vendorId.localeCompare(b.vendorId)).slice(0,5);});
 return reply({ok:true,items:ranked});
});