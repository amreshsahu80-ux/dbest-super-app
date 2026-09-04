(function(){
'use strict';
const VERSION='1.3.0';
function cleanRegistrationPayments(){
  const page=document.querySelector('.registrationPage');
  if(!page)return;
  const merchant=[...page.querySelectorAll('#dbestRegistrationMerchantUPI')];
  if(merchant.length>1)merchant.slice(1).forEach(x=>x.remove());
  const keep=page.querySelector('#dbestRegistrationMerchantUPI');
  if(keep){
    const legacy=[...page.querySelectorAll('.dbestUpiBox')];
    if(legacy.length>1)legacy.slice(1).forEach(x=>x.remove());
  }
  try{window.DBEST_ICICI_MERCHANT_QR?.wireRegistration?.()}catch(e){}
}
function loadMerchantQrIntent(){
  if(window.DBEST_ICICI_MERCHANT_QR?.version==='1.3.0'){cleanRegistrationPayments();return;}
  const old=document.getElementById('dbestICICIMerchantQrIntentV1');
  if(old)old.remove();
  const s=document.createElement('script');
  s.id='dbestICICIMerchantQrIntentV1';
  s.src='./icici-merchant-qr-intent-v1.js?v=20260905-0145-qr-manual-payment';
  s.async=false;
  s.onload=cleanRegistrationPayments;
  document.head.appendChild(s);
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;cleanRegistrationPayments();});}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow',schedule);
setTimeout(cleanRegistrationPayments,30);
setTimeout(cleanRegistrationPayments,300);
loadMerchantQrIntent();
window.DBEST_REGISTRATION_PAYMENT_DEDUPE={version:VERSION,run:cleanRegistrationPayments};
})();