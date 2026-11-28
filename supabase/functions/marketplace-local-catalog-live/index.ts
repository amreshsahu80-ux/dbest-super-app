import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const finite=(v:any)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const clampPct=(v:any)=>Math.max(0,Math.min(90,Number.isFinite(Number(v))?Number(v):0));
const roundMoney=(v:number)=>Math.round(Math.max(0,v)*100)/100;
function hav(lat1:number,lon1:number,lat2:number,lon2:number){const R=6371,toRad=(x:number)=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
function productOfferPrice(base:number,p:any){return base<=0?0:Math.max(0,base*(1-clampPct(p.offer_percent)/100))}
function campaignPrice(base:number,p:any){if(base<=0)return 0;const val=Number(p.discount_value||0);return p.promotion_type==='fixed'?Math.max(0,base-val):Math.max(0,base*(1-clampPct(val)/100))}
function radiusFor(type:string,cfg:any){type=String(type||'').toLowerCase();if(type==='digital')return null;if(type==='restaurant')return 15;if(type==='grocery')return 10;if(type==='medicine')return 15;return Math.max(1,Number(cfg?.other_physical_km||cfg?.default_physical_km||40))}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';if(!url||!service)return json({error:'service_unavailable'},503);
  const got=String(req.headers.get('apikey')||'').trim(),legacy=String(Deno.env.get('SUPABASE_ANON_KEY')||'').trim();let clientOk=!!got&&!!legacy&&got===legacy;
  if(!clientOk){try{const x=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}');clientOk=Object.values(x||{}).some((v:any)=>String(v)===got)}catch(_){clientOk=got.startsWith('sb_publishable_')}}if(!clientOk)return json({error:'invalid_project_client'},401);
  const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),b=await req.json().catch(()=>({}));
  if(String(b.action||'public_catalog')!=='public_catalog')return json({error:'unknown_action'},400);
  const marketType=String(b.marketType||'').trim().toLowerCase(),vendorId=String(b.vendorId||'').trim(),hasLoc=finite(b.customerLat)&&finite(b.customerLng),customerLat=Number(b.customerLat),customerLng=Number(b.customerLng);
  const {data:rrow}=await sb.from('app_settings').select('value').eq('key','marketplace_service_radius_km').maybeSingle();
  const cfg:any={...(rrow?.value||{}),restaurant_km:15,grocery_km:10,medicine_km:15,digital_unrestricted:true};
  let vq=sb.from('marketplace_vendors_live').select('id,name,type,city,lat,lng,profile_meta').eq('owner_approval','Approved').eq('active',true).eq('operational_hold',false).eq('agreement_status','Fully Signed');if(vendorId)vq=vq.eq('id',vendorId);if(marketType)vq=vq.eq('type',marketType);
  const {data:allVendors,error:ve}=await vq;if(ve)throw ve;
  const vendors:any[]=[];let locationRequired=false;
  for(const v of allVendors||[]){const type=String(v.type||'').toLowerCase(),radius=radiusFor(type,cfg),ownerAssisted=String((v.profile_meta as any)?.ownerAssistedOnboarding||'').toLowerCase()==='true'||(v.profile_meta as any)?.ownerAssistedOnboarding===true;if(type==='digital'){vendors.push({...v,distance_km:null,service_radius_km:null,owner_assisted:ownerAssisted});continue}if(!finite(v.lat)||!finite(v.lng)){continue}if(!hasLoc){locationRequired=true;continue}const d=hav(Number(v.lat),Number(v.lng),customerLat,customerLng);if(radius!==null&&d<=radius+1e-9)vendors.push({...v,distance_km:Number(d.toFixed(2)),service_radius_km:radius,owner_assisted:ownerAssisted})}
  vendors.sort((a,b)=>{const ad=a.distance_km===null?Number.POSITIVE_INFINITY:Number(a.distance_km),bd=b.distance_km===null?Number.POSITIVE_INFINITY:Number(b.distance_km);return ad-bd});
  const vids=vendors.map(v=>v.id);
  if(!vids.length)return json({ok:true,products:[],vendors:[],promotions:[],serviceRadius:{restaurantKm:15,defaultPhysicalKm:Number(cfg.default_physical_km||40),groceryKm:10,medicineKm:15,otherPhysicalKm:Number(cfg.other_physical_km||40),digitalUnrestricted:cfg.digital_unrestricted!==false},locationRequired,physicalMarketplaceRequiresLocation:true});
  let pq=sb.from('marketplace_catalog_live').select('*').in('vendor_id',vids).eq('active',true).gt('stock',0);if(marketType){pq=pq.eq('market_type',marketType);if(marketType!=='digital')pq=pq.gte('created_at','2026-11-20');}else pq=pq.or('market_type.eq.digital,created_at.gte.2026-11-20');if(vendorId)pq=pq.eq('vendor_id',vendorId);const {data:products,error:pe}=await pq.order('updated_at',{ascending:false}).limit(1000);if(pe)throw pe;
  const now=new Date().toISOString();const {data:promos,error:pre}=await sb.from('marketplace_vendor_promotions_live').select('*').in('vendor_id',vids).eq('active',true).lte('start_at',now).gte('end_at',now);if(pre)throw pre;const eligible=(promos||[]).filter((p:any)=>p.usage_limit==null||Number(p.usage_count||0)<Number(p.usage_limit));
  const out=(products||[]).map((p:any)=>{const base=Number(p.price||0),regularPct=clampPct(p.offer_percent),regular=productOfferPrice(base,p),applicable=eligible.filter((x:any)=>x.vendor_id===p.vendor_id&&(x.applies_to_all||(Array.isArray(x.product_ids)&&x.product_ids.includes(p.id))));let best:any=null,bestPrice=regular,source=regularPct>0?'product':null;for(const x of applicable){const ep=campaignPrice(base,x);if(ep<bestPrice-.005){best=x;bestPrice=ep;source='campaign'}}const pct=base>0?Math.round((1-bestPrice/base)*10000)/100:0;return {...p,base_price:roundMoney(base),price:roundMoney(bestPrice),product_offer_percent:regularPct,effective_offer_percent:pct,offer_source:source,campaign_id:best?.id||null,campaign_title:best?.title||null,campaign_type:best?.promotion_type||null,campaign_discount_value:best?Number(best.discount_value):0}});
  const rank=new Map(vendors.map((v:any,i:number)=>[String(v.id),i]));out.sort((a:any,b:any)=>(rank.get(String(a.vendor_id))??99999)-(rank.get(String(b.vendor_id))??99999));
  return json({ok:true,products:out,vendors:vendors.map(v=>({id:v.id,name:v.name,type:v.type,city:v.city,distance_km:v.distance_km,service_radius_km:v.service_radius_km,owner_assisted:!!v.owner_assisted,location_pending:!!v.location_pending})),promotions:eligible.map((p:any)=>({id:p.id,vendor_id:p.vendor_id,title:p.title,promotion_type:p.promotion_type,discount_value:p.discount_value,applies_to_all:p.applies_to_all,product_ids:p.product_ids,start_at:p.start_at,end_at:p.end_at,banner_text:p.banner_text})),serviceRadius:{restaurantKm:15,defaultPhysicalKm:Number(cfg.default_physical_km||40),groceryKm:10,medicineKm:15,otherPhysicalKm:Number(cfg.other_physical_km||40),digitalUnrestricted:cfg.digital_unrestricted!==false},locationRequired,physicalMarketplaceRequiresLocation:true});
 }catch(e){console.error(e);return json({error:'unexpected_error',detail:String((e as any)?.message||e)},500)}
});