(function(){
'use strict';
const RESET_AT='2026-08-30T07:03:22.439Z';
const cutoff=Date.parse(RESET_AT);
function keep(x){const t=Date.parse(x?.createdISO||x?.created||x?.transaction_date||0);return Number.isFinite(t)&&t>=cutoff;}
try{if(typeof txs!=='undefined'&&Array.isArray(txs)){const fresh=txs.filter(keep);txs.splice(0,txs.length,...fresh);if(typeof save==='function')save();}}catch(e){console.warn('DBest payout reset filter',e)}
try{localStorage.removeItem('dbest_tx_ledger_hashes_v2');localStorage.setItem('dbest_payout_reset_at',RESET_AT);}catch(e){}
window.DBEST_PAYOUT_RESET={resetAt:RESET_AT,keep};
})();