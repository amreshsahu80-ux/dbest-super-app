import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-vendor-token,x-dbest-member-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const enc=new TextEncoder();
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function json(x:unknown,status=200){return new Response(JSON.stringify(x),{status,headers:cors})}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return json({error:"server_not_configured"},503);
  const db=createClient(url,key,{auth:{persistSession:false}});
  const body=await req.json(),action=String(body.action||"");
  if(action==="available_vendors"){
   const category=String(body.category||"").trim().toLowerCase();
   if(!["grocery","medicine","restaurant"].includes(category))return json({error:"invalid_category"},400);
   const lat=Number(body.lat),lng=Number(body.lng);
   if(body.lat==null||body.lng==null||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return json({error:"delivery_location_required"},400);
   const radius=category==="grocery"?10:15;
   const {data,error}=await db.from("marketplace_vendors_live").select("id,name,type,lat,lng").eq("type",category).eq("owner_approval","Approved").eq("active",true).eq("operational_hold",false).order("name",{ascending:true}).limit(100);
   if(error)return json({error:"vendor_list_unavailable"},503);
   const distance=(v:{lat:number,lng:number})=>{const rad=Math.PI/180,dLat=(v.lat-lat)*rad,dLng=(v.lng-lng)*rad,a=Math.sin(dLat/2)**2+Math.cos(lat*rad)*Math.cos(v.lat*rad)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))};
   const vendors=(data||[]).filter(v=>v.lat!=null&&v.lng!=null&&distance({lat:Number(v.lat),lng:Number(v.lng)})<=radius).map(v=>({id:v.id,name:v.name,type:v.type}));
   return json({ok:true,vendors});
  }
  if(action==="create_request"){
   const memberToken=String(req.headers.get("x-dbest-member-token")||"").trim();
   if(!memberToken)return json({error:"member_session_required"},401);
   const {data:memberSession}=await db.from("member_sessions_live").select("member_id").eq("token_hash",await sha(memberToken)).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!memberSession)return json({error:"member_session_invalid"},401);
   const category=String(body.category||"").toLowerCase(),vendorId=String(body.vendorId||"").trim();
   const mime=String(body.mimeType||""),size=Number(body.fileSize),filename=String(body.filename||"").slice(0,180);
   if(!["grocery","medicine","restaurant"].includes(category)||!vendorId||!filename||!["image/jpeg","image/png","application/pdf"].includes(mime)||!Number.isInteger(size)||size<1||size>8388608)return json({error:"invalid_request"},400);
   const {data:v}=await db.from("marketplace_vendors_live").select("id,type").eq("id",vendorId).eq("owner_approval","Approved").eq("active",true).eq("operational_hold",false).maybeSingle();
   if(!v||String(v.type||"").toLowerCase()!==category)return json({error:"vendor_unavailable"},409);
   const lat=Number(body.lat),lng=Number(body.lng);
   if(body.lat==null||body.lng==null||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return json({error:"delivery_location_required"},400);
   const {data:geo}=await db.from("marketplace_vendors_live").select("lat,lng").eq("id",vendorId).maybeSingle();
   if(geo?.lat==null||geo?.lng==null)return json({error:"vendor_location_unavailable"},409);
   const rad=Math.PI/180,dLat=(Number(geo.lat)-lat)*rad,dLng=(Number(geo.lng)-lng)*rad,h=Math.sin(dLat/2)**2+Math.cos(lat*rad)*Math.cos(Number(geo.lat)*rad)*Math.sin(dLng/2)**2;
   if(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))>(category==="grocery"?10:15))return json({error:"vendor_outside_delivery_radius"},409);
   const requestId=crypto.randomUUID(),ext=mime==="application/pdf"?"pdf":mime==="image/png"?"png":"jpg",objectPath=memberSession.member_id+"/"+requestId+"."+ext;
   const {data:upload,error:signError}=await db.storage.from("marketplace-private-uploads").createSignedUploadUrl(objectPath);
   if(signError||!upload)return json({error:"upload_unavailable"},503);
   const {error:insertError}=await db.from("marketplace_upload_requests_live").insert({id:requestId,category,vendor_id:vendorId,customer_member_id:memberSession.member_id,object_path:objectPath,original_filename:filename,mime_type:mime,file_size_bytes:size,status:"Pending Upload"});
   if(insertError)return json({error:"request_creation_failed"},503);
   return json({ok:true,requestId,uploadToken:upload.token,objectPath});
  }
  if(action==="finalize_upload"){
   const memberToken=String(req.headers.get("x-dbest-member-token")||"").trim(),requestId=String(body.requestId||"").trim();
   if(!memberToken||(action!=="customer_list"&&!requestId))return json({error:"member_session_required"},401);
   const {data:memberSession}=await db.from("member_sessions_live").select("member_id").eq("token_hash",await sha(memberToken)).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!memberSession)return json({error:"member_session_invalid"},401);
   const {data:request}=await db.from("marketplace_upload_requests_live").select("id,object_path,mime_type,file_size_bytes").eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Pending Upload").maybeSingle();
   if(!request)return json({error:"request_not_found"},404);
   const prefix=request.object_path.split("/").slice(0,-1).join("/"),name=request.object_path.split("/").pop();
   const {data:objects,error:listError}=await db.storage.from("marketplace-private-uploads").list(prefix,{search:name,limit:10});
   if(listError)return json({error:"file_check_failed"},503);
   const obj=(objects||[]).find(x=>x.name===name);
   if(!obj||Number(obj.metadata?.size)!==Number(request.file_size_bytes)||String(obj.metadata?.mimetype||"")!==request.mime_type)return json({error:"file_metadata_mismatch"},409);
   const {data:download,error:downloadError}=await db.storage.from("marketplace-private-uploads").download(request.object_path);
   if(downloadError||!download)return json({error:"file_verification_failed"},503);
   const bytes=new Uint8Array(await download.slice(0,16).arrayBuffer());
   const mime=String(request.mime_type);
   const valid=mime==="application/pdf"?bytes.length>=5&&[37,80,68,70,45].every((v,i)=>bytes[i]===v):mime==="image/png"?bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   if(!valid)return json({error:"file_content_invalid"},409);
   const {data,error}=await db.from("marketplace_upload_requests_live").update({status:"Submitted",updated_at:new Date().toISOString()}).eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Pending Upload").select("id,status").maybeSingle();
   if(error||!data)return json({error:"request_update_failed"},409);
   return json({ok:true,request:data});
  }
  if(action==="customer_list"||action==="customer_status"||action==="customer_accept"||action==="customer_checkout_preview"){
   const memberToken=String(req.headers.get("x-dbest-member-token")||"").trim(),requestId=String(body.requestId||"").trim();
   if(!memberToken||(action!=="customer_list"&&!requestId))return json({error:"member_session_required"},401);
   const {data:memberSession}=await db.from("member_sessions_live").select("member_id").eq("token_hash",await sha(memberToken)).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!memberSession)return json({error:"member_session_invalid"},401);
   if(action==="customer_list"){
    const {data,error}=await db.from("marketplace_upload_requests_live").select("id,category,vendor_id,status,quote_items,quoted_total,created_at,updated_at").eq("customer_member_id",memberSession.member_id).neq("status","Pending Upload").order("created_at",{ascending:false}).limit(50);
    if(error)return json({error:"request_list_unavailable"},503);
    return json({ok:true,requests:data||[]});
   }
   if(action==="customer_checkout_preview"){
    const {data:q,error}=await db.from("marketplace_upload_requests_live").select("id,status,vendor_id,category,quote_items,quoted_total").eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Customer Accepted").maybeSingle();
    if(error||!q)return json({error:"accepted_quote_not_found"},404);
    const {data:v}=await db.from("marketplace_vendors_live").select("id,name,owner_approval,active,operational_hold").eq("id",q.vendor_id).eq("owner_approval","Approved").eq("active",true).eq("operational_hold",false).maybeSingle();
    if(!v)return json({error:"vendor_unavailable"},409);
    const subtotal=Number(q.quoted_total);if(!Number.isFinite(subtotal)||subtotal<0||!Array.isArray(q.quote_items)||!q.quote_items.length)return json({error:"invalid_quote"},409);
    return json({ok:true,checkout:{requestId:q.id,vendorName:v.name,category:q.category,items:q.quote_items,itemSubtotal:subtotal,deliveryCharge:null,totalPayable:null,paymentReady:false,reason:"delivery_address_and_verified_payment_integration_pending"}});
   }
   if(action==="customer_status"){
    const {data,error}=await db.from("marketplace_upload_requests_live").select("id,category,vendor_id,status,quote_items,quoted_total,created_at,updated_at").eq("id",requestId).eq("customer_member_id",memberSession.member_id).maybeSingle();
    if(error||!data)return json({error:"request_not_found"},404);
    return json({ok:true,request:data});
   }
   const {data:current}=await db.from("marketplace_upload_requests_live").select("id,quoted_total,updated_at").eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Quote Ready").maybeSingle();
   if(!current)return json({error:"quote_not_available"},409);
   if(String(body.quoteVersion||"")!==String(current.updated_at))return json({error:"quote_changed_refresh_required"},409);
   const {data,error}=await db.from("marketplace_upload_requests_live").update({status:"Customer Accepted",customer_approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Quote Ready").eq("updated_at",current.updated_at).select("id,status,quoted_total").maybeSingle();
   if(error||!data)return json({error:"quote_changed_refresh_required"},409);
   return json({ok:true,request:data,paymentReady:false});
  }
  const token=String(req.headers.get("x-vendor-token")||"").trim();
  if(!token)return json({error:"vendor_session_required"},401);
  const {data:session}=await db.from("marketplace_vendor_sessions_live").select("vendor_id,expires_at").eq("token_hash",await sha(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(!session)return json({error:"vendor_session_invalid"},401);
  const {data:vendor}=await db.from("marketplace_vendors_live").select("id,owner_approval,active,operational_hold").eq("id",session.vendor_id).maybeSingle();
  if(!vendor||vendor.owner_approval!=="Approved"||vendor.active!==true||vendor.operational_hold===true)return json({error:"vendor_not_active"},403);
  if(action==="vendor_list"){
   const {data,error}=await db.from("marketplace_upload_requests_live").select("id,category,status,created_at,original_filename,quote_items,quoted_total").eq("vendor_id",vendor.id).order("created_at",{ascending:false}).limit(50);
   if(error)return json({error:"requests_unavailable"},503);
   return json({ok:true,requests:data||[]});
  }
  if(action==="vendor_document_url"){
   const requestId=String(body.requestId||"").trim();
   if(!requestId)return json({error:"request_id_required"},400);
   const {data:request,error:lookupError}=await db.from("marketplace_upload_requests_live").select("id,object_path,mime_type,original_filename,status").eq("id",requestId).eq("vendor_id",vendor.id).in("status",["Submitted","Vendor Reviewing","Quote Ready","Customer Accepted","Payment Pending","Verified/Paid","Fulfilment","Completed"]).maybeSingle();
   if(lookupError||!request)return json({error:"request_not_found"},404);
   const {data:link,error:linkError}=await db.storage.from("marketplace-private-uploads").createSignedUrl(request.object_path,120);
   if(linkError||!link)return json({error:"document_unavailable"},503);
   return json({ok:true,url:link.signedUrl,expiresInSeconds:120,mimeType:request.mime_type,filename:request.original_filename});
  }
  if(action==="vendor_quote"){
   const requestId=String(body.requestId||"").trim();
   const items=Array.isArray(body.items)?body.items:[];
   if(!requestId||items.length<1||items.length>100)return json({error:"invalid_quote"},400);
   let total=0;const safeItems=[];
   for(const item of items){const name=String(item.name||"").trim().slice(0,180),qty=Number(item.qty),price=Number(item.price);if(!name||!Number.isInteger(qty)||qty<1||qty>1000||!Number.isFinite(price)||price<0||price>100000)return json({error:"invalid_quote_item"},400);total+=qty*price;safeItems.push({name,qty,price})}
   total=Math.round(total*100)/100;if(total>1000000)return json({error:"quote_too_large"},400);
   const {data,error}=await db.from("marketplace_upload_requests_live").update({quote_items:safeItems,quoted_total:total,status:"Quote Ready",updated_at:new Date().toISOString()}).eq("id",requestId).eq("vendor_id",vendor.id).in("status",["Submitted","Vendor Reviewing","Quote Ready"]).select("id,status,quoted_total").maybeSingle();
   if(error)return json({error:"quote_update_failed"},503);
   if(!data)return json({error:"request_not_found_or_not_editable"},409);
   return json({ok:true,request:data});
  }
  return json({error:"unsupported_action"},400);
 }catch(e){console.error("marketplace-upload-requests",e);return json({error:"request_failed"},500)}
});
