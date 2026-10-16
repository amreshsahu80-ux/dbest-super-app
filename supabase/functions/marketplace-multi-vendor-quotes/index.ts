import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"apikey,content-type,x-dbest-member-token,x-vendor-token","Access-Control-Allow-Methods":"POST,OPTIONS"};
const respond=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
async function digest(v:string){const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)));return [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("")}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return respond({error:"service_unavailable"},503);
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json(),action=String(body.action||"");
  const isVendor=action==="vendor_invitations"||action==="submit_offer";
  const token=String(req.headers.get(isVendor?"x-vendor-token":"x-dbest-member-token")||"");
  if(!token)return respond({error:"authentication_required"},401);
  const {data:session}=await db.from(isVendor?"marketplace_vendor_sessions_live":"member_sessions_live")
   .select(isVendor?"vendor_id":"member_id").eq("token_hash",await digest(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(!session)return respond({error:"session_invalid"},401);
  const actor=isVendor?String((session as {vendor_id:string}).vendor_id):String((session as {member_id:string}).member_id);
  if(isVendor){
   const {data:v}=await db.from("marketplace_vendors_live").select("id").eq("id",actor).eq("owner_approval","Approved").eq("active",true).eq("operational_hold",false).maybeSingle();
   if(!v)return respond({error:"vendor_unavailable"},403);
  }
  if(action==="vendor_invitations"){
   const {data,error}=await db.from("marketplace_quote_invitations").select("request_id,created_at").eq("vendor_id",actor).order("created_at",{ascending:false}).limit(50);
   return error?respond({error:"invitations_unavailable"},503):respond({ok:true,invitations:data||[]});
  }
  const requestId=String(body.requestId||"");
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId))return respond({error:"invalid_request_id"},400);
  const {data:request}=await db.from("marketplace_upload_requests_live").select("id,customer_member_id,category,status").eq("id",requestId).maybeSingle();
  if(!request)return respond({error:"request_not_found"},404);
  if(action==="customer_offers"){
   if(request.customer_member_id!==actor)return respond({error:"forbidden"},403);
   const {data,error}=await db.from("marketplace_quote_offers").select("id,vendor_id,version,items,subtotal,delivery_fee,status,expires_at,created_at").eq("request_id",requestId).eq("status","submitted").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});
   return error?respond({error:"offers_unavailable"},503):respond({ok:true,offers:data||[]});
  }
  if(action==="submit_offer"){
   const {data:invitation}=await db.from("marketplace_quote_invitations").select("vendor_id").eq("request_id",requestId).eq("vendor_id",actor).maybeSingle();
   if(!invitation||!["Submitted","Vendor Reviewing","Quote Ready"].includes(request.status))return respond({error:"invitation_unavailable"},403);
   const items=body.items;
   if(!Array.isArray(items)||items.length<1||items.length>100)return respond({error:"invalid_items"},400);
   let cents=0;const normalized=[];
   for(const item of items){
    const name=String(item.name||"").trim().slice(0,180),qty=Number(item.qty),price=Number(item.price);
    if(!name||!Number.isInteger(qty)||qty<1||qty>1000||!Number.isFinite(price)||price<0||price>100000||Math.round(price*100)!==price*100)return respond({error:"invalid_item"},400);
    cents+=qty*Math.round(price*100);normalized.push({name,qty,price});
   }
   const fee=Number(body.deliveryFee);
   if(!Number.isFinite(fee)||fee<0||fee>10000||Math.round(fee*100)!==fee*100||cents>100000000)return respond({error:"invalid_total"},400);
   const {data:latest}=await db.from("marketplace_quote_offers").select("version").eq("request_id",requestId).eq("vendor_id",actor).order("version",{ascending:false}).limit(1).maybeSingle();
   const {data,error}=await db.from("marketplace_quote_offers").insert({request_id:requestId,vendor_id:actor,version:Number(latest?.version||0)+1,items:normalized,subtotal:cents/100,delivery_fee:fee,expires_at:new Date(Date.now()+24*3600*1000).toISOString()}).select("id,version").single();
   return error?respond({error:"quote_save_failed"},409):respond({ok:true,offer:data});
  }
  // Invitation and acceptance need a server-side atomic transaction with
  // ownership, vendor eligibility, price and order idempotency checks.
  // Do not expose incomplete mutations.
  return respond({error:"operation_not_enabled"},501);
 }catch(e){console.error("marketplace-multi-vendor-quotes",e);return respond({error:"request_failed"},500)}
});
