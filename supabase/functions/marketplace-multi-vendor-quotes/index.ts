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
  const isVendor=action==="vendor_invitations"||action==="submit_offer"||action==="vendor_document_url";
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
  const requestId=String(body.requestId||"");
  if(action!=="vendor_invitations"&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId))return respond({error:"invalid_request_id"},400);
  const {data:request}=action==="vendor_invitations"?{data:null}:await db.from("marketplace_upload_requests_live").select("id,customer_member_id,category,status,delivery_lat,delivery_lng,quote_window_closes_at").eq("id",requestId).maybeSingle();
  if(action!=="vendor_invitations"&&!request)return respond({error:"request_not_found"},404);
  if(action==="vendor_invitations"){
   const {data:invitations,error}=await db.from("marketplace_quote_invitations").select("request_id,created_at").eq("vendor_id",actor).order("created_at",{ascending:false}).limit(50);
   if(error)return respond({error:"invitations_unavailable"},503);
   const ids=(invitations||[]).map(x=>x.request_id);if(!ids.length)return respond({ok:true,invitations:[]});
   const {data:requests,error:requestError}=await db.from("marketplace_upload_requests_live").select("id,category,status,original_filename,quote_window_closes_at,extracted_items,extraction_status").in("id",ids);
   if(requestError)return respond({error:"invitations_unavailable"},503);
   const byId=new Map((requests||[]).map(x=>[x.id,x]));return respond({ok:true,invitations:(invitations||[]).map(x=>({...x,request:byId.get(x.request_id)||null})).filter(x=>x.request)});
  }
  if(action==="save_request_items"){
   if(request.customer_member_id!==actor)return respond({error:"forbidden"},403);
   if(Date.now()>=new Date(request.quote_window_closes_at).getTime())return respond({error:"quotation_window_closed"},409);
   const items=body.items;
   if(!Array.isArray(items)||items.length<1||items.length>10)return respond({error:"invalid_items"},400);
   const cleaned=[];
   for(const item of items){const name=String(item.name||"").trim().slice(0,180),qty=Number(item.qty);if(!name||!Number.isInteger(qty)||qty<1||qty>1000)return respond({error:"invalid_item"},400);cleaned.push({name,qty})}
   const {error}=await db.from("marketplace_upload_requests_live").update({extracted_items:cleaned,extraction_status:"customer_confirmed"}).eq("id",requestId).eq("customer_member_id",actor);
   return error?respond({error:"items_save_failed"},503):respond({ok:true,items:cleaned});
  }
  if(action==="vendor_document_url"){
   const {data:invitation}=await db.from("marketplace_quote_invitations").select("request_id").eq("request_id",requestId).eq("vendor_id",actor).maybeSingle();
   if(!invitation)return respond({error:"invitation_unavailable"},403);
   const {data:doc}=await db.from("marketplace_upload_requests_live").select("object_path,mime_type,original_filename").eq("id",requestId).single();
   if(!doc?.object_path)return respond({error:"document_unavailable"},404);
   const {data:link,error}=await db.storage.from("marketplace-private-uploads").createSignedUrl(doc.object_path,120);
   return error||!link?respond({error:"document_unavailable"},503):respond({ok:true,url:link.signedUrl,expiresInSeconds:120,filename:doc.original_filename,mimeType:doc.mime_type});
  }
  if(action==="invite_vendors"){
   if(Date.now()>=new Date(request.quote_window_closes_at).getTime())return respond({error:"quotation_window_closed"},409);
   if(request.customer_member_id!==actor)return respond({error:"forbidden"},403);
   if(!["Submitted","Vendor Reviewing","Quote Ready"].includes(request.status))return respond({error:"request_not_open"},409);
   const vendorIds=body.vendorIds;
   if(!Array.isArray(vendorIds)||vendorIds.length<1||vendorIds.length>20||vendorIds.some((v:unknown)=>typeof v!=="string"||!v||v.length>128)||new Set(vendorIds).size!==vendorIds.length)return respond({error:"invalid_vendor_selection"},400);
   const {data:vendors,error:vendorError}=await db.from("marketplace_vendors_live").select("id,type,owner_approval,active,operational_hold,agreement_status").in("id",vendorIds);
   if(vendorError||!vendors||vendors.length!==vendorIds.length||vendors.some(v=>String(v.type).toLowerCase()!==request.category||v.owner_approval!=="Approved"||v.active!==true||v.operational_hold===true||v.agreement_status!=="Fully Signed"))return respond({error:"vendor_not_eligible"},409);
   const lat=Number(request.delivery_lat),lng=Number(request.delivery_lng);
   if(request.delivery_lat==null||request.delivery_lng==null||!Number.isFinite(lat)||!Number.isFinite(lng))return respond({error:"delivery_coordinates_missing"},409);
   const {data:positions,error:posError}=await db.from("marketplace_vendors_live").select("id,lat,lng").in("id",vendorIds);
   if(posError||!positions||positions.length!==vendorIds.length)return respond({error:"vendor_location_unavailable"},409);
   const rad=Math.PI/180, radius=request.category==="grocery"?10:15;
   for(const v of positions){
    if(v.lat==null||v.lng==null)return respond({error:"vendor_location_unavailable"},409);
    const a=(Number(v.lat)-lat)*rad,b=(Number(v.lng)-lng)*rad;
    const h=Math.sin(a/2)**2+Math.cos(lat*rad)*Math.cos(Number(v.lat)*rad)*Math.sin(b/2)**2;
    const distance=6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
    if(!Number.isFinite(distance)||distance>radius)return respond({error:"vendor_outside_delivery_radius"},409);
   }
   const {error}=await db.from("marketplace_quote_invitations").upsert(vendorIds.map((vendor_id:string)=>({request_id:requestId,vendor_id})),{onConflict:"request_id,vendor_id",ignoreDuplicates:true});
   return error?respond({error:"invitation_save_failed"},503):respond({ok:true,invited:vendorIds.length});
  }
  if(action==="customer_offers"){
   if(request.customer_member_id!==actor)return respond({error:"forbidden"},403);
   const {data,error}=await db.from("marketplace_quote_offers").select("id,vendor_id,version,items,subtotal,delivery_fee,delivery_calculated,status,expires_at,created_at").eq("request_id",requestId).eq("status","submitted").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});
   return error?respond({error:"offers_unavailable"},503):respond({ok:true,offers:data||[],quoteWindowClosesAt:request.quote_window_closes_at,selectionClosesAt:new Date(new Date(request.quote_window_closes_at).getTime()+5*60*1000).toISOString()});
  }
  if(action==="submit_offer"){
   if(Date.now()>=new Date(request.quote_window_closes_at).getTime())return respond({error:"quotation_window_closed"},409);
   const {data:invitation}=await db.from("marketplace_quote_invitations").select("vendor_id").eq("request_id",requestId).eq("vendor_id",actor).maybeSingle();
   if(!invitation||!["Submitted","Vendor Reviewing","Quote Ready"].includes(request.status))return respond({error:"invitation_unavailable"},403);
   const items=body.items;
   if(!Array.isArray(items)||items.length<1||items.length>100)return respond({error:"invalid_items"},400);
   let cents=0;const normalized=[];
   for(const item of items){
    const name=String(item.name||"").trim().slice(0,180),qty=Number(item.qty),price=Number(item.price);
    if(!name||!Number.isInteger(qty)||qty<1||qty>1000||!Number.isFinite(price)||price<0||price>100000||Math.abs(Math.round(price*100)-price*100)>0.000001)return respond({error:"invalid_item"},400);
    cents+=qty*Math.round(price*100);normalized.push({name,qty,price});
   }
   if(cents>100000000)return respond({error:"invalid_total"},400);
   if(request.delivery_lat==null||request.delivery_lng==null)return respond({error:"customer_delivery_location_required"},409);
   const {data:pickup}=await db.from("marketplace_vendors_live").select("lat,lng").eq("id",actor).maybeSingle();
   if(!pickup||pickup.lat==null||pickup.lng==null)return respond({error:"vendor_pickup_location_required"},409);
   const lat1=Number(request.delivery_lat),lng1=Number(request.delivery_lng),lat2=Number(pickup.lat),lng2=Number(pickup.lng);
   if(![lat1,lng1,lat2,lng2].every(Number.isFinite)||Math.abs(lat1)>90||Math.abs(lat2)>90||Math.abs(lng1)>180||Math.abs(lng2)>180)return respond({error:"invalid_delivery_coordinates"},409);
   const rad=Math.PI/180,a=(lat2-lat1)*rad,b=(lng2-lng1)*rad;
   const h=Math.sin(a/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(b/2)**2;
   const km=6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
   const grocery=String(request.category).toLowerCase()==="grocery";
   const threshold=grocery?1000:250,rate=grocery?15:10;
   const fee=Math.round(((cents/100)>=threshold?Math.max(0,km-5):Math.max(1,km))*rate*100)/100;
   if(!Number.isFinite(fee)||fee>10000)return respond({error:"delivery_fee_out_of_range"},409);
   const {data:latest}=await db.from("marketplace_quote_offers").select("version").eq("request_id",requestId).eq("vendor_id",actor).order("version",{ascending:false}).limit(1).maybeSingle();
   const {data,error}=await db.from("marketplace_quote_offers").insert({request_id:requestId,vendor_id:actor,version:Number(latest?.version||0)+1,items:normalized,subtotal:cents/100,delivery_fee:fee,delivery_calculated:true,expires_at:new Date(new Date(request.quote_window_closes_at).getTime()+5*60*1000).toISOString()}).select("id,version").single();
   return error?respond({error:"quote_save_failed"},409):respond({ok:true,offer:{...data,delivery_fee:fee,delivery_distance_km:Math.round(km*100)/100}});
  }
  if(action==="accept_offer"){
   if(request.customer_member_id!==actor)return respond({error:"forbidden"},403);
   if(!["Submitted","Vendor Reviewing","Quote Ready"].includes(request.status))return respond({error:"request_not_open"},409);
   const offerId=String(body.offerId||"");
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(offerId))return respond({error:"invalid_offer_id"},400);
   const {data:offer}=await db.from("marketplace_quote_offers").select("id,vendor_id,subtotal,delivery_fee,status,expires_at").eq("id",offerId).eq("request_id",requestId).maybeSingle();
   if(!offer||offer.status!=="submitted"||new Date(offer.expires_at).getTime()<=Date.now())return respond({error:"offer_unavailable"},409);
   const {data:vendor}=await db.from("marketplace_vendors_live").select("id").eq("id",offer.vendor_id).eq("owner_approval","Approved").eq("active",true).eq("operational_hold",false).maybeSingle();
   if(!vendor)return respond({error:"vendor_unavailable"},409);
   const {data:accepted,error:acceptError}=await db.rpc("dbest_accept_marketplace_quote",{p_request:requestId,p_offer:offerId,p_member:actor});
   if(acceptError)return respond({error:"acceptance_unavailable"},503);
   return accepted?.ok?respond(accepted):respond(accepted||{error:"acceptance_failed"},409);
  }
  // Invitation and acceptance need a server-side atomic transaction with
  // ownership, vendor eligibility, price and order idempotency checks.
  // Do not expose incomplete mutations.
  return respond({error:"operation_not_enabled"},501);
 }catch(e){console.error("marketplace-multi-vendor-quotes",e);return respond({error:"request_failed"},500)}
});
