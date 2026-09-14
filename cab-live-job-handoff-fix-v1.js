(function(){
'use strict';
const VERSION='20260914-cab-live-handoff-v6';
if(window.DBEST_CAB_LIVE_HANDOFF?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=cfg.supabasePublishableKey||'';
if(!BASE||!KEY)return;
const LIVE=BASE+'/functions/v1/vaahak-live';
const DISPATCH=BASE+'/functions/v1/vaahak-dispatch-live';
const VOICE=BASE+'/functions/v1/partner-voice-alert';
const RECOVER=BASE+'/functions/v1/vaahak-customer-session-live';
const inFlight=new Map();
function headers(){return {'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}}
function txList(){try{if(Array.isArray(window.txs))return window.txs}catch(_){ }try{if(typeof txs!=='undefined'&&Array.isArray(txs))return txs}catch(_){ }return []}
function userList(){try{if(Array.isArray(window.users))return window.users}catch(_){ }try{if(typeof users!=='undefined'&&Array.isArray(users))return users}catch(_){ }return []}
function findTx(txId){return txList().find(t=>String(t?.id)===String(txId))||null}
function ridePayload(txId){const x=findTx(txId);if(!x)return null;const r=x?.ride||x?.meta?.ride||{},u=userList().find(v=>String(v?.id)===String(x?.userId))||{},pickup=String(r.pickup||r.from||'').trim(),drop=String(r.drop||r.dropoff||r.to||'').trim(),fare=Number(x.amount||x.total||r.fare||0),distance=Number(r.distance||r.distanceKm||0);if(!pickup||!drop||!Number.isFinite(fare)||fare<=0)return null;return {txId:String(txId),customerName:String(u.name||x.user||x.customerName||''),customerMobile:String(u.mobile||x.customerMobile||''),customerEmail:String(u.email||x.customerEmail||''),customerMemberId:String(u.id||x.userId||''),pickup,drop,pickupLat:r.pickupCoords?.lat??r.pickupLat??null,pickupLng:r.pickupCoords?.lng??r.pickupLng??null,dropLat:r.dropCoords?.lat??r.dropLat??null,dropLng:r.dropCoords?.lng??r.dropLng??null,distanceKm:distance,fare,vehicleType:String(r.vehicleName||r.vehicleId||r.vehicleType||'')}}
async function post(url,body){const res=await fetch(url,{method:'POST',cache:'no-store',headers:headers(),body:JSON.stringify(body)});let data={};try{data=await res.json()}catch(_){ }if(!res.ok){const e=new Error(data.error||('Request failed '+res.status));e.status=res.status;e.data=data;throw e}return data}
function saveCustomerToken(id,token){try{if(id&&token){localStorage.setItem('dbest_live_customer_token_'+id,String(token));localStorage.setItem('dbest_ride_customer_token_'+id,String(token));return true}}catch(_){ }return false}
function hasCustomerToken(id){try{return !!(localStorage.getItem('dbest_live_customer_token_'+id)||localStorage.getItem('dbest_ride_customer_token_'+id))}catch(_){return false}}
async function recoverCustomerSession(payload){const d=await post(RECOVER,{action:'recover',txId:payload.txId,customerMemberId:payload.customerMemberId,customerMobile:payload.customerMobile,pickup:payload.pickup,drop:payload.drop,fare:payload.fare});if(!d?.customerToken)throw new Error('customer_session_recovery_failed');saveCustomerToken(payload.txId,d.customerToken);setTimeout(()=>window.DBEST_RIDE_LIVE_UI_FINALIZER?.refresh?.(),50);return d}
function loadScript(src,attr){if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');(document.head||document.documentElement).appendChild(s)}
function ensureCustomerLiveLayers(){setTimeout(()=>loadScript('/ride-live-ui-finalizer.js?v=20260914-ride-live-v25','data-dbest-ride-live-v25'),200);setTimeout(()=>{if(String(window.DBEST_RUNTIME_CONFIG?.googleMapsApiKey||'').trim())loadScript('/customer-google-live-tracking-v1.js?v=20260914-customer-map-v3','data-dbest-customer-google-map-v3')},900)}
function scheduleVoice(jobId,txId){let attempts=0;const run=async()=>{attempts++;try{const d=await post(VOICE,jobId?{jobId}:{txId});if(d?.called||d?.reason==='already_alerted'||d?.reason==='job_not_open')return;const retryable=['too_early','no_active_offer','partner_not_eligible'].includes(String(d?.reason||''));if(retryable&&attempts<6){const wait=Math.max(4000,Math.min(15000,Number(d?.retryAfterMs||7000)));setTimeout(run,wait)}}catch(e){if(attempts<4)setTimeout(run,8000)}};setTimeout(run,28000)}
async function createLiveJob(txId){const id=String(txId||'').trim();if(!id)return null;if(inFlight.has(id))return inFlight.get(id);const p=(async()=>{let payload=null;for(let i=0;i<20&&!payload;i++){payload=ridePayload(id);if(!payload)await new Promise(r=>setTimeout(r,150))}if(!payload){console.warn('DBest live ride handoff: transaction payload unavailable',id);return null}const flag='dbest_live_ride_'+id;let flagged=false;try{flagged=localStorage.getItem(flag)==='1'}catch(_){ }
if(flagged&&!hasCustomerToken(id)){try{const r=await recoverCustomerSession(payload);return {already:true,recovered:true,job:r.job}}catch(e){console.warn('DBest customer session recovery warning',e?.message||e)}}
if(flagged&&hasCustomerToken(id))return {already:true};
let out=null;try{out=await post(LIVE,{action:'create_ride',...payload})}catch(e){if(e.status!==409&&e.message!=='ride_already_created')throw e;try{const r=await recoverCustomerSession(payload);out={already:true,recovered:true,job:r.job,customerToken:r.customerToken}}catch(re){throw re}}
try{localStorage.setItem(flag,'1');if(out?.customerToken)saveCustomerToken(id,out.customerToken)}catch(_){ }
const jobId=out?.job?.id||'';try{await post(DISPATCH,{action:'tick',...(jobId?{jobId}:{txId:id})})}catch(e){console.warn('DBest dispatch tick warning',e?.message||e)}scheduleVoice(jobId,id);setTimeout(()=>window.DBEST_RIDE_LIVE_UI_FINALIZER?.refresh?.(),80);return out})().catch(e=>{console.error('DBest live ride handoff failed',e);try{localStorage.removeItem('dbest_live_ride_'+id)}catch(_){ }return null}).finally(()=>inFlight.delete(id));inFlight.set(id,p);return p}
function wrap(){const fn=window.rideStatusScreen;if(typeof fn!=='function'||fn.__dbestLiveHandoffV6)return false;function wrapped(txId){const out=fn.apply(this,arguments);ensureCustomerLiveLayers();setTimeout(()=>createLiveJob(txId),0);return out}wrapped.__dbestLiveHandoffV6=true;wrapped.__dbestOriginal=fn;window.rideStatusScreen=wrapped;return true}
ensureCustomerLiveLayers();wrap();const installer=setInterval(()=>{if(wrap())console.info('DBest live ride handoff attached')},500);setTimeout(()=>clearInterval(installer),120000);window.DBEST_CAB_LIVE_HANDOFF={version:VERSION,createLiveJob,wrap,recoverCustomerSession};
})();