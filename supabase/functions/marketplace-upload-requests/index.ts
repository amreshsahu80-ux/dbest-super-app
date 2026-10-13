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
   const requestId=crypto.randomUUID(),ext=mime==="application/pdf"?"pdf":mime==="image/png"?"png":"jpg",objectPath=memberSession.member_id+"/"+requestId+"."+ext;
   const {data:upload,error:signError}=await db.storage.from("marketplace-private-uploads").createSignedUploadUrl(objectPath);
   if(signError||!upload)return json({error:"upload_unavailable"},503);
   const {error:insertError}=await db.from("marketplace_upload_requests_live").insert({id:requestId,category,vendor_id:vendorId,customer_member_id:memberSession.member_id,object_path:objectPath,original_filename:filename,mime_type:mime,file_size_bytes:size,status:"Pending Upload"});
   if(insertError)return json({error:"request_creation_failed"},503);
   return json({ok:true,requestId,uploadToken:upload.token,objectPath});
  }
  if(action==="finalize_upload"){
   const memberToken=String(req.headers.get("x-dbest-member-token")||"").trim(),requestId=String(body.requestId||"").trim();
   if(!memberToken||!requestId)return json({error:"member_session_required"},401);
   const {data:memberSession}=await db.from("member_sessions_live").select("member_id").eq("token_hash",await sha(memberToken)).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!memberSession)return json({error:"member_session_invalid"},401);
   const {data:request}=await db.from("marketplace_upload_requests_live").select("id,object_path,mime_type,file_size_bytes").eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Pending Upload").maybeSingle();
   if(!request)return json({error:"request_not_found"},404);
   const prefix=request.object_path.split("/").slice(0,-1).join("/"),name=request.object_path.split("/").pop();
   const {data:objects,error:listError}=await db.storage.from("marketplace-private-uploads").list(prefix,{search:name,limit:10});
   if(listError)return json({error:"file_check_failed"},503);
   const obj=(objects||[]).find(x=>x.name===name);
   if(!obj||Number(obj.metadata?.size)!==Number(request.file_size_bytes)||String(obj.metadata?.mimetype||"")!==request.mime_type)return json({error:"file_metadata_mismatch"},409);
   const {data,error}=await db.from("marketplace_upload_requests_live").update({status:"Submitted",updated_at:new Date().toISOString()}).eq("id",requestId).eq("customer_member_id",memberSession.member_id).eq("status","Pending Upload").select("id,status").maybeSingle();
   if(error||!data)return json({error:"request_update_failed"},409);
   return json({ok:true,request:data});
  }
  if(action==="customer_status"||action==="customer_accept"){
   const memberToken=String(req.headers.get("x-dbest-member-token")||"").trim(),requestId=String(body.requestId||"").trim();
   if(!memberToken||!requestId)return json({error:"member_session_required"},401);
   const {data:memberSession}=await db.from("member_sessions_live").select("member_id").eq("token_hash",await sha(memberToken)).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!memberSession)return json({error:"member_session_invalid"},401);
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
