(function(){
'use strict';
const VERSION='1.0.0',cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',DISPATCH=BASE+'/functions/v1/vaahak-dispatch-live',RIDE=BASE+'/functions/v1/vaahak-live',COM=BASE+'/functions/v1/vaahak-commerce-live';
if(!BASE||!KEY)return;
const raw=window.fetch.bind(window),lastTick=new Map();
function headers(){return {'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'}}
async function tick(body){const k=String(body.jobId||body.txId||'');if(!k)return;const now=Date.now(),last=lastTick.get(k)||0;if(now-last<2200)return;lastTick.set(k,now);try{await raw(DISPATCH,{method:'POST',headers:headers(),body:JSON.stringify({action:'tick',...body})})}catch(e){}}
async function geocode(q){q=String(q||'').trim();if(q.length<3)return null;try{let r=await raw('https://photon.komoot.io/api/?limit=1&q='+encodeURIComponent(q),{headers:{'Accept':'application/json'}}),d=await r.json();let c=d?.features?.[0]?.geometry?.coordinates;if(Array.isArray(c)&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1])))return {lat:Number(c[1]),lng:Number(c[0])}}catch(e){}try{let r=await raw('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q='+encodeURIComponent(q),{headers:{'Accept':'application/json'}}),d=await r.json(),x=d?.[0];if(x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon)))return {lat:Number(x.lat),lng:Number(x.lon)}}catch(e){}return null}
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:String(input?.url||''),method=String(init?.method||'GET').toUpperCase();let body=null;
 if(method==='POST'&&init?.body&&(url.startsWith(RIDE)||url.startsWith(COM))){try{body=JSON.parse(String(init.body))}catch(e){}}
 if(body?.action==='create_delivery'&&(body.pickupLat==null||body.pickupLng==null)&&body.pickup){const g=await geocode(body.pickup);if(g){body.pickupLat=g.lat;body.pickupLng=g.lng;init={...init,body:JSON.stringify(body)}}}
 const res=await raw(input,init);
 if(body?.action==='ride_status'&&body.txId)tick({txId:body.txId});
 if((body?.action==='create_ride'||body?.action==='create_delivery')&&res.ok){try{const d=await res.clone().json();if(d?.job?.id)tick({jobId:d.job.id});else if(body.txId)tick({txId:body.txId})}catch(e){}}
 return res;
};
window.DBEST_NEAREST_VAAHAK_DISPATCH={version:VERSION,tick,geocode,offerSeconds:20};
})();