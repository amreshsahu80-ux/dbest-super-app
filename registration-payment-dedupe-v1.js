(function(){
'use strict';
const VERSION='1.1.0';
function cleanRegistrationPayments(){
  const page=document.querySelector('.registrationPage');
  if(!page)return;
  const merchant=[...page.querySelectorAll('#dbestRegistrationMerchantUPI')];
  if(merchant.length>1)merchant.slice(1).forEach(x=>x.remove());
  const keep=page.querySelector('#dbestRegistrationMerchantUPI');
  if(keep){
    page.querySelectorAll('.dbestUpiBox').forEach(x=>x.remove());
    const buttons=[...page.querySelectorAll('button')].filter(b=>/Pay\s*₹?[0-9,]+.*UPI|Pay Membership Fee via DBest Merchant UPI/i.test(String(b.textContent||'')));
    buttons.forEach(b=>{if(!keep.contains(b))b.closest('.dbestUpiBox')?.remove();});
  }
}
function loadMerchantQrIntent(){
  if(document.getElementById('dbestICICIMerchantQrIntentV1'))return;
  const s=document.createElement('script');
  s.id='dbestICICIMerchantQrIntentV1';
  s.src='./icici-merchant-qr-intent-v1.js?v=20260905-0040-icici-merchant-qr';
  s.async=false;
  document.head.appendChild(s);
}
let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;cleanRegistrationPayments();});
}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',schedule,true);
window.addEventListener('pageshow',schedule);
setInterval(cleanRegistrationPayments,1200);
setTimeout(cleanRegistrationPayments,30);
loadMerchantQrIntent();
window.DBEST_REGISTRATION_PAYMENT_DEDUPE={version:VERSION,run:cleanRegistrationPayments};
})();