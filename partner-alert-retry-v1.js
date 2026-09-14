(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=cfg.supabasePublishableKey||'';
if(!base||!key)return;
const endpoint=base+'/functions/v1/partner-voice-alert';
const dispatch=base+'/functions/v1/vaahak-dispatch-live';
const seen=new Set();
function headers(){return {'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}}
async function post(url,body){const r=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)});let d={};try{d=await r.json()}catch(_){}return {ok:r.ok,data:d}}
window.DBEST_RETRY_PARTNER_ALERT=function(ref){
 const id=String(ref?.jobId||ref?.txId||'');if(!id||seen.has(id))return;seen.add(id);
 let n=0;const t=setInterval(async()=>{n++;try{await post(dispatch,{action:'tick',...ref});const r=await post(endpoint,ref);if(r.data?.called||r.data?.reason==='already_alerted'||r.data?.reason==='job_not_open'){clearInterval(t);seen.delete(id)}}catch(_){}if(n>=8){clearInterval(t);seen.delete(id)}},15000);
};
})();