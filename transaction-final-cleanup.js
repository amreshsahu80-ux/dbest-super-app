(function(){
'use strict';
const VERSION='1.0.0';
function bad(x){
  try{
    const m=x?.meta||{};
    const sec=String(x?.section||'').trim().toLowerCase();
    const sub=String(x?.sub||x?.subsection||'').trim().toLowerCase();
    return m.fallbackCapture===true && ((m.form===true && sec==='dbest service') || /(^|\b)(6-digit otp|owner email|agreement otp|kyc otp)(\b|$)/i.test(sub));
  }catch(e){return false}
}
function purge(){
  try{
    if(typeof txs==='undefined'||!Array.isArray(txs))return 0;
    const before=txs.length;
    for(let i=txs.length-1;i>=0;i--)if(bad(txs[i]))txs.splice(i,1);
    if(txs.length!==before){try{typeof save==='function'&&save()}catch(e){};return before-txs.length}
  }catch(e){}
  return 0;
}
document.addEventListener('submit',()=>{setTimeout(purge,650);setTimeout(purge,1300)},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)purge()});
[0,800,1800,4000,8000].forEach(ms=>setTimeout(purge,ms));
window.DBEST_TRANSACTION_FINAL_CLEANUP={version:VERSION,purge};
})();