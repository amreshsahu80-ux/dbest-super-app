import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-vendor-token, x-vaahak-token, x-dbest-owner-token","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const enc=new TextEncoder();
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
const safe=(s:any)=>String(s||'file').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120);
const cleanKind=(v:any)=>String(v||'').toLowerCase()==='vaahak'?'vaahak':'vendor';
const labels:any={shop_photo:'Shop / Establishment Photo',owner_photo:'Owner Photo',pan:'PAN Copy',gst:'GST Certificate',establishment:'Shop & Establishment / Udyam',sector_licence:'FSSAI / Drug / Sector Licence',bank_proof:'Cancelled Cheque / Bank Proof',address_proof:'Address Proof',id_proof:'Identity Proof',driving_licence:'Driving Licence',rc:'Vehicle RC',insurance:'Vehicle Insurance',puc:'PUC / Pollution Certificate',fitness_permit:'Fitness / Permit'};
const legacyMap:any={shopPhoto:'shop_photo',ownerPhoto:'owner_photo',panCopy:'pan',gstCert:'gst',establishment:'establishment',sectorLicenceDoc:'sector_licence',bankProof:'bank_proof',addressProof:'address_proof'};
function required(kind:string,partner:any){if(kind==='vendor'){const r=['shop_photo','owner_photo','pan','establishment','bank_proof'];if(['restaurant','medicine'].includes(String(partner?.type||'').toLowerCase()))r.push('sector_licence');return r}const r=['id_proof','driving_licence','rc','insurance','puc'];if(/auto|car|suv|van|commercial|taxi/i.test(String(partner?.vehicle||'')))r.push('fitness_permit');return r}
function legacyDocs(partner:any){const src=partner?.profile_meta?.documents||{};return Object.entries(src).flatMap(([k,v]:any)=>{if(!v||v.selected===false)return[];const dt=legacyMap[k];if(!dt)return[];return[{doc_type:dt,label:labels[dt]||dt,file_name:String(v.name||''),size_bytes:Number(v.size||0),content_type:String(v.type||''),legacy_only:true}]})}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  if(!String(req.headers.get('apikey')||'').trim())return json({error:'invalid_project_client'},401);
  const url=Deno.env.get('SUPABASE_URL')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const b=await req.json().catch(()=>({})),action=String(b.action||''),kind=cleanKind(b.partnerKind);
  async function ownerEmail(){const t=String(req.headers.get('x-dbest-owner-token')||'').trim();if(!t)return null;const {data,error}=await sb.rpc('validate_owner_session',{p_token:t});return error?null:(data||null)}
  async function ownPartner(){if(kind==='vendor'){const t=String(req.headers.get('x-vendor-token')||'').trim();if(!t)return null;const h=await sha(t);const {data:s}=await sb.from('marketplace_vendor_sessions_live').select('vendor_id,expires_at').eq('token_hash',h).gt('expires_at',new Date().toISOString()).maybeSingle();if(!s)return null;const {data:v}=await sb.from('marketplace_vendors_live').select('*').eq('id',s.vendor_id).maybeSingle();return v?{id:v.id,row:v}:null}else{const t=String(req.headers.get('x-vaahak-token')||'').trim();if(!t)return null;const h=await sha(t);const {data:s}=await sb.from('vaahak_sessions_live').select('partner_id,expires_at').eq('token_hash',h).gt('expires_at',new Date().toISOString()).maybeSingle();if(!s)return null;const {data:v}=await sb.from('vaahak_partners_live').select('*').eq('id',s.partner_id).maybeSingle();return v?{id:v.id,row:v}:null}}
  async function partnerById(id:string){if(kind==='vendor'){const {data}=await sb.from('marketplace_vendors_live').select('*').eq('id',id).maybeSingle();return data}else{const {data}=await sb.from('vaahak_partners_live').select('*').eq('id',id).maybeSingle();return data}}
  async function docsFor(id:string){const {data,error}=await sb.from('partner_kyc_documents').select('id,partner_kind,partner_id,doc_type,file_name,storage_path,content_type,size_bytes,created_at,updated_at').eq('partner_kind',kind).eq('partner_id',id).order('created_at');if(error)throw error;return data||[]}
  function status(partner:any,docs:any[]){const have=new Set(docs.map(d=>String(d.doc_type))),reqd=required(kind,partner),missing=reqd.filter(x=>!have.has(x));return {complete:missing.length===0,required:reqd,missing,missingLabels:missing.map(x=>labels[x]||x)}}

  if(action==='upload'){
   const own=await ownPartner();if(!own)return json({error:kind==='vendor'?'vendor_session_invalid':'vaahak_session_invalid'},401);
   const docType=String(b.docType||'').trim(),fileName=safe(b.fileName),contentType=String(b.contentType||'').toLowerCase(),base64=String(b.base64||'').replace(/^data:[^;]+;base64,/,'');const allowed=['image/jpeg','image/png','image/webp','application/pdf'];
   if(!docType||!labels[docType])return json({error:'invalid_document_type'},400);if(!allowed.includes(contentType))return json({error:'unsupported_file_type'},400);if(!base64)return json({error:'file_missing'},400);
   let bytes:Uint8Array;try{const raw=atob(base64);bytes=Uint8Array.from(raw,c=>c.charCodeAt(0))}catch(_){return json({error:'invalid_file_data'},400)}
   if(bytes.byteLength>8*1024*1024)return json({error:'file_too_large'},413);
   // Never remove prior or uncertain objects inline: concurrent replacements and lost responses must not destroy KYC.
   if(!bytes.byteLength)return json({error:'file_missing'},400);
   const path=`${kind}/${own.id}/${docType}-${crypto.randomUUID()}-${fileName}`;
   const {error:up}=await sb.storage.from('partner-kyc').upload(path,bytes,{contentType,upsert:false});
   if(up)return json({error:'kyc_storage_upload_failed'},500);
   const now=new Date().toISOString();
   const {error}=await sb.from('partner_kyc_documents').upsert({partner_kind:kind,partner_id:own.id,doc_type:docType,file_name:fileName,storage_path:path,content_type:contentType,size_bytes:bytes.byteLength,updated_at:now},{onConflict:'partner_kind,partner_id,doc_type'});
   if(error)return json({error:'kyc_persistence_failed'},500);
   const {data:confirmed,error:readError}=await sb.from('partner_kyc_documents').select('doc_type,file_name,size_bytes,created_at,updated_at,storage_path').eq('partner_kind',kind).eq('partner_id',own.id).eq('doc_type',docType).maybeSingle();
   if(readError||!confirmed||confirmed.storage_path!==path)return json({error:'kyc_persistence_unconfirmed'},409);
   const {storage_path,...document}=confirmed;
   // Old objects retained for separately audited garbage collection; never delete a winning concurrent upload here.
   return json({ok:true,document});
  }

  if(action==='list_own'){
   const own=await ownPartner();if(!own)return json({error:kind==='vendor'?'vendor_session_invalid':'vaahak_session_invalid'},401);const docs=await docsFor(own.id);return json({ok:true,documents:docs.map(({storage_path,...d}:any)=>d),kyc:status(own.row,docs),legacyDocuments:legacyDocs(own.row)});
  }

  if(action==='owner_list_docs'){
   if(!await ownerEmail())return json({error:'owner_session_invalid'},401);const id=String(b.partnerId||'').trim().toUpperCase();const partner=await partnerById(id);if(!partner)return json({error:'partner_not_found'},404);const docs=await docsFor(id);const out=[];for(const d of docs){const {data}=await sb.storage.from('partner-kyc').createSignedUrl(d.storage_path,600);out.push({...d,label:labels[d.doc_type]||d.doc_type,signedUrl:data?.signedUrl||null})}return json({ok:true,partner:{id:partner.id,name:partner.name||'',type:partner.type||'',vehicle:partner.vehicle||'',ownerApproval:partner.owner_approval||'Pending',agreementStatus:partner.agreement_status||'Pending'},documents:out,legacyDocuments:legacyDocs(partner),kyc:status(partner,docs)});
  }

  if(action==='owner_approve'){
   const email=await ownerEmail();if(!email)return json({error:'owner_session_invalid'},401);const id=String(b.partnerId||'').trim().toUpperCase(),approve=!!b.approve,partner=await partnerById(id);if(!partner)return json({error:'partner_not_found'},404);const docs=await docsFor(id),ks=status(partner,docs);
   if(approve&&!ks.complete)return json({error:'kyc_incomplete',missing:ks.missing,missingLabels:ks.missingLabels},409);const now=new Date().toISOString();
   if(kind==='vendor'){const patch:any={owner_approval:approve?'Approved':'Rejected',active:false,updated_at:now};if(!approve)patch.agreement_status='Rejected / KYC';const {data,error}=await sb.from('marketplace_vendors_live').update(patch).eq('id',id).select('id,name,owner_approval,active,agreement_status').maybeSingle();if(error||!data)throw error||new Error('vendor_not_found');return json({ok:true,partner:data,kyc:ks})}
   else{const patch:any={owner_approval:approve?'Approved':'Rejected',available:false,updated_at:now};if(!approve)patch.agreement_status='Rejected / KYC';const {data,error}=await sb.from('vaahak_partners_live').update(patch).eq('id',id).select('id,name,owner_approval,available,agreement_status').maybeSingle();if(error||!data)throw error||new Error('vaahak_not_found');return json({ok:true,partner:data,kyc:ks})}
  }

  return json({error:'unknown_action'},400);
 }catch(e){console.error(e);return json({error:'unexpected_error',detail:String((e as any)?.message||e)},500)}
});