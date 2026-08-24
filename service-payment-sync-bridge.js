(function(){
'use strict';
const VERSION='1.0.0',seen=new Map();
function rows(){try{return typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]}catch(e){return[]}}
function isManual(x){return String(x?.meta?.source||'')==='Content-wise Service Form'}
function fp(x){return [x?.id,x?.status,x?.paymentStage,x?.paymentRef,x?.payuPaymentId].map(v=>String(v||'')).join('|')}
async function syncOne(x){if(!x||!window.DBEST_SERVICE_REQUEST_LIVE?.sendRequest)return;const f=fp(x);if(seen.get(x.id)===f)return;seen.set(x.id,f);try{await window.DBEST_SERVICE_REQUEST_LIVE.sendRequest(x,true)}catch(e){seen.delete(x.id)}}
async function syncRecent(){const a=rows().filter(isManual).slice(0,30);for(const x of a)await syncOne(x)}
const old=window.paymentResultScreen;
if(typeof old==='function'&&!old.__dbestManualPaymentWrapped){const w=function(txId,success){const out=old.apply(this,arguments);setTimeout(()=>{const x=rows().find(t=>String(t.id)===String(txId));if(x&&isManual(x))syncOne(x)},50);return out};w.__dbestManualPaymentWrapped=true;w.__dbestOriginal=old;window.paymentResultScreen=w}
setTimeout(syncRecent,1300);setInterval(syncRecent,30000);
window.DBEST_SERVICE_PAYMENT_SYNC={version:VERSION,sync:syncRecent};
})();