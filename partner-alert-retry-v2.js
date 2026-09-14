(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=cfg.supabasePublishableKey||'';
if(!base||!key)return;
const alertApi=base+'/functions/v1/partner-voice-alert';
const dispatchApi=base+'/functions/v1/vaahak-dispatch-live';
const active=new Set();
function headers(){return {'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}}
async function send(url,body){const r=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)});let d={};try{d=await r.json()}catch(_){}return d}
function schedule(txId){const id=String(txId||'');if(!id||active.has(id))return;active.add(id);let tries=0;const run=async()=>{tries++;try{await send(dispatchApi,{action:'tick',txId:id});const d=await send(alertApi,{txId:id});if(d?.called||d?.reason==='already_alerted'||d?.reason==='job_not_open'){clearInterval(timer);active.delete(id);return}}catch(_){}if(tries>=8){clearInterval(timer);active.delete(id)}};const timer=setInterval(run,15000);setTimeout(run,30000)}
function attach(){const fn=window.rideStatusScreen;if(typeof fn!=='function'||fn.__dbestAlertRetryV2)return false;function wrapped(txId){const out=fn.apply(this,arguments);schedule(txId);return out}wrapped.__dbestAlertRetryV2=true;wrapped.__dbestOriginal=fn;window.rideStatusScreen=wrapped;return true}
attach();const installer=setInterval(attach,500);setTimeout(()=>clearInterval(installer),120000);
window.DBEST_PARTNER_ALERT_RETRY_V2={schedule,attach};
})();