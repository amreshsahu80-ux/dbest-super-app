(function(){
'use strict';
const VERSION='20260914-cab-live-handoff-v3';
if(window.DBEST_CAB_LIVE_HANDOFF?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=cfg.supabasePublishableKey||'';
if(!BASE||!KEY)return;
const LIVE=BASE+'/functions/v1/vaahak-live';
const DISPATCH=BASE+'/functions/v1/vaahak-dispatch-live';
const VOICE=BASE+'/functions/v1/partner-voice-alert';
const inFlight=new Map();
function headers(){return {'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}}
function txList(){
  try{if(Array.isArray(window.txs))return window.txs}catch(_){ }
  try{if(typeof txs!=='undefined'&&Array.isArray(txs))return txs}catch(_){ }
  return [];
}
function userList(){
  try{if(Array.isArray(window.users))return window.users}catch(_){ }
  try{if(typeof users!=='undefined'&&Array.isArray(users))return users}catch(_){ }
  return [];
}
function findTx(txId){return txList().find(t=>String(t?.id)===String(txId))||null}
function ridePayload(txId){
  const x=findTx(txId);if(!x)return null;
  const r=x?.ride||x?.meta?.ride||{};
  const u=userList().find(v=>String(v?.id)===String(x?.userId))||{};
  const pickup=String(r.pickup||r.from||'').trim(),drop=String(r.drop||r.dropoff||r.to||'').trim();
  const fare=Number(x.amount||x.total||r.fare||0),distance=Number(r.distance||r.distanceKm||0);
  if(!pickup||!drop||!Number.isFinite(fare)||fare<=0)return null;
  return {
    txId:String(txId),customerName:String(u.name||x.user||x.customerName||''),customerMobile:String(u.mobile||x.customerMobile||''),
    customerEmail:String(u.email||x.customerEmail||''),customerMemberId:String(u.id||x.userId||''),
    pickup,drop,pickupLat:r.pickupCoords?.lat??r.pickupLat??null,pickupLng:r.pickupCoords?.lng??r.pickupLng??null,
    dropLat:r.dropCoords?.lat??r.dropLat??null,dropLng:r.dropCoords?.lng??r.dropLng??null,
    distanceKm:distance,fare,vehicleType:String(r.vehicleName||r.vehicleId||r.vehicleType||'')
  };
}
async function post(url,body){
  const res=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)});
  let data={};try{data=await res.json()}catch(_){ }
  if(!res.ok){const e=new Error(data.error||('Request failed '+res.status));e.status=res.status;throw e}
  return data;
}
async function createLiveJob(txId){
  const id=String(txId||'').trim();if(!id)return null;
  const flag='dbest_live_ride_'+id;
  try{if(localStorage.getItem(flag)==='1')return {already:true}}catch(_){ }
  if(inFlight.has(id))return inFlight.get(id);
  const p=(async()=>{
    let payload=null;
    for(let i=0;i<20&&!payload;i++){payload=ridePayload(id);if(!payload)await new Promise(r=>setTimeout(r,150))}
    if(!payload){console.warn('DBest live ride handoff: transaction payload unavailable',id);return null}
    let out=null;
    try{out=await post(LIVE,{action:'create_ride',...payload})}
    catch(e){if(e.status!==409&&e.message!=='ride_already_created')throw e;out={already:true}}
    try{
      localStorage.setItem(flag,'1');
      if(out?.customerToken){
        const token=String(out.customerToken);
        localStorage.setItem('dbest_live_customer_token_'+id,token);
        localStorage.setItem('dbest_ride_customer_token_'+id,token);
      }
    }catch(_){ }
    const jobId=out?.job?.id||'';
    try{await post(DISPATCH,{action:'tick',...(jobId?{jobId}:{txId:id})})}catch(e){console.warn('DBest dispatch tick warning',e?.message||e)}
    setTimeout(()=>{post(VOICE,jobId?{jobId}:{txId:id}).catch(e=>console.warn('DBest Exotel escalation warning',e?.message||e))},28000);
    return out;
  })().catch(e=>{console.error('DBest live ride handoff failed',e);try{localStorage.removeItem(flag)}catch(_){ }return null}).finally(()=>inFlight.delete(id));
  inFlight.set(id,p);return p;
}
function wrap(){
  const fn=window.rideStatusScreen;
  if(typeof fn!=='function'||fn.__dbestLiveHandoffV3)return false;
  function wrapped(txId){const out=fn.apply(this,arguments);setTimeout(()=>createLiveJob(txId),0);return out}
  wrapped.__dbestLiveHandoffV3=true;wrapped.__dbestOriginal=fn;window.rideStatusScreen=wrapped;return true;
}
wrap();
const installer=setInterval(()=>{if(wrap())console.info('DBest live ride handoff attached')},500);
setTimeout(()=>clearInterval(installer),120000);
window.DBEST_CAB_LIVE_HANDOFF={version:VERSION,createLiveJob,wrap};
})();