// DBest isolated Android FCM backend (DRAFT; never deploy before review).
// No live Web Push, Cab, Marketplace, wallet, or payout paths are modified.
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_MAIN = "com.dbest4u.app";
const APP_PARTNER = "com.dbest4u.partner";
const APPS = new Set([APP_MAIN, APP_PARTNER]);
const HEADER_NAMES = [
  { header: "x-dbest-member-token", table: "member_sessions_live", field: "member_id", type: "Member" },
  { header: "x-vendor-token", table: "marketplace_vendor_sessions_live", field: "vendor_id", type: "Vendor" },
  { header: "x-vaahak-token", table: "vaahak_sessions_live", field: "partner_id", type: "Vaahak" },
  { header: "x-dbest-partner-token", table: "partner_sessions_live", field: "account_id", type: "Service Partner" },
] as const;
type Who = {type:string; id:string};
const enc = new TextEncoder();
const text = (v:unknown,n=1000)=>String(v??"").trim().slice(0,n);
const json = (body:unknown,status=200,headers:Record<string,string>={})=>
  new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...headers}});
const sha = async (s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(s))))
  .map(b=>b.toString(16).padStart(2,"0")).join("");
const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes))
  .replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const jwtPart=(data:unknown)=>b64url(enc.encode(JSON.stringify(data)));

function originHeaders(req:Request) {
  const origin=req.headers.get("Origin")||"";
  const allowed=["https://dbest4u.com","https://www.dbest4u.com"];
  if(origin&&!allowed.includes(origin))return null;
  return {
    "Access-Control-Allow-Origin":origin||"https://dbest4u.com",
    "Access-Control-Allow-Headers":"content-type,apikey,authorization,x-dbest-member-token,x-vendor-token,x-vaahak-token,x-dbest-partner-token,x-dbest-fcm-internal-key",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Vary":"Origin",
    "Cache-Control":"no-store",
  };
}
function validType(type:string,app:string) {
  return (app===APP_MAIN&&type==="Member")||
    (app===APP_PARTNER&&["Vendor","Vaahak","Service Partner"].includes(type));
}

async function accessToken() {
  const raw=Deno.env.get("DBEST_FCM_SERVICE_ACCOUNT_JSON");
  const project=Deno.env.get("DBEST_FCM_PROJECT_ID");
  if(!raw||project!=="dbest-mobile-notifications")throw new Error("sender_not_configured");
  const sa=JSON.parse(raw);
  if(!sa.client_email||!sa.private_key||sa.project_id!==project)throw new Error("invalid_sender_identity");
  const privateDer=Uint8Array.from(atob(sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"")),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",privateDer,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const iat=Math.floor(Date.now()/1000);
  const assertion=jwtPart({alg:"RS256",typ:"JWT"})+"."+
    jwtPart({iss:sa.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",
      aud:"https://oauth2.googleapis.com/token",iat,exp:iat+3300});
  const signature=b64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,enc.encode(assertion))));
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:assertion+"."+signature}),
    signal:AbortSignal.timeout(9000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)throw new Error("oauth_token_failed");
  return String(data.access_token);
}

Deno.serve(async req=>{
  const cors=originHeaders(req);
  if(!cors)return json({error:"origin_not_allowed"},403);
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405,cors);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const role=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!role)return json({error:"service_unavailable"},503,cors);
  const db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const b=await req.json().catch(()=>({}));
    const action=text(b.action,40);
    const app=text(b.appPackage,80);
    if(!APPS.has(app))return json({error:"invalid_app"},400,cors);

    if(action==="internal_send_test") {
      // In staging: credential in Supabase secrets, never a public or app key.
      const secret=Deno.env.get("DBEST_FCM_INTERNAL_SEND_KEY")||"";
      const received=req.headers.get("x-dbest-fcm-internal-key")||"";
      if(secret.length<32||received.length!==secret.length ||
        await sha(received)!==await sha(secret))return json({error:"unauthorized"},401,cors);
      const type=text(b.recipientType,40),id=text(b.recipientId,180);
      if(!id||!validType(type,app))return json({error:"invalid_recipient"},400,cors);
      const {data:devices,error:readError}=await db.from("dbest_native_fcm_devices")
        .select("id,token").eq("recipient_type",type).eq("recipient_id",id)
        .eq("app_package",app).eq("enabled",true).limit(5);
      if(readError)throw readError;
      if(!devices?.length)return json({ok:true,skipped:"no_opted_in_device"},200,cors);
      const bearer=await accessToken(),results=[];
      for(const device of devices){
        const target=text(b.targetUrl,600);
        const url="https://dbest4u.com"+(target.startsWith("/")&&!target.startsWith("//")?target:"/");
        const response=await fetch("https://fcm.googleapis.com/v1/projects/dbest-mobile-notifications/messages:send",{
          method:"POST",
          headers:{"Authorization":"Bearer "+bearer,"Content-Type":"application/json"},
          body:JSON.stringify({message:{token:device.token,
            // Data only, never notification payload: native opt-out must govern display.
            data:{title:text(b.title,120)||"DBest",body:text(b.body,300)||"Test notification",targetUrl:url},
            android:{priority:"HIGH"}}}),
          signal:AbortSignal.timeout(9000),
        });
        if(response.ok)results.push({ok:true});
        else{
          const responseData=await response.json().catch(()=>({}));
          const status=String(responseData?.error?.status||"");
          if(["UNREGISTERED","INVALID_ARGUMENT"].includes(status)){
            await db.from("dbest_native_fcm_devices").update({enabled:false,updated_at:new Date().toISOString()})
              .eq("id",device.id);
          }
          results.push({ok:false,status:response.status});
        }
      }
      return json({ok:results.some(x=>x.ok),attempts:results.length,deliveredToFcm:results.filter(x=>x.ok).length},200,cors);
    }

    let who:Who|null=null;
    for(const field of HEADER_NAMES){
      const token=text(req.headers.get(field.header),700);
      if(!token)continue;
      const hashed=await sha(token);
      const {data,error}=await db.from(field.table).select(field.field)
        .eq("token_hash",hashed).gt("expires_at",new Date().toISOString()).maybeSingle();
      if(error)throw error;
      if(data?.[field.field]){who={type:field.type,id:String(data[field.field])};break}
    }
    if(!who)return json({error:"authenticated_session_required"},401,cors);
    if(!validType(who.type,app))return json({error:"role_app_mismatch"},403,cors);
    if(action==="status"){
      const {data,error}=await db.from("dbest_native_fcm_devices")
        .select("enabled,last_seen_at").eq("recipient_type",who.type)
        .eq("recipient_id",who.id).eq("app_package",app).order("last_seen_at",{ascending:false}).limit(20);
      if(error)throw error;
      return json({ok:true,activeDevices:(data||[]).filter(x=>x.enabled).length},200,cors);
    }
    if(!["register","unregister"].includes(action))return json({error:"unknown_action"},400,cors);
    const token=text(b.fcmToken,4000);
    if(token.length<30||token.length>4000||!(/^[A-Za-z0-9_:.-]+$/).test(token))
      return json({error:"invalid_fcm_token"},400,cors);
    const hash=await sha(token);
    if(action==="unregister"){
      const {error}=await db.from("dbest_native_fcm_devices").update({enabled:false,updated_at:new Date().toISOString()})
        .eq("app_package",app).eq("recipient_type",who.type)
        .eq("recipient_id",who.id).eq("token_hash",hash);
      if(error)throw error;
      return json({ok:true,enabled:false},200,cors);
    }
    if(b.userConsented!==true||b.androidPermissionGranted!==true)
      return json({error:"explicit_notification_consent_required"},403,cors);
    const now=new Date().toISOString();
    const {error}=await db.from("dbest_native_fcm_devices").upsert({
      app_package:app,recipient_type:who.type,recipient_id:who.id,
      token,token_hash:hash,enabled:true,platform:"Android",
      last_seen_at:now,updated_at:now,
    },{onConflict:"app_package,token_hash"});
    if(error)throw error;
    return json({ok:true,enabled:true},200,cors);
  } catch(e) {
    // Do not log tokens, credentials, API responses, or user identifiers.
    console.error("native_fcm_request_failed",e instanceof Error?e.name:"error");
    return json({error:"internal_error"},500,cors);
  }
});
