(function(){
'use strict';
const VERSION='1.0.0';
function stageText(){
  const t=document.getElementById('dbestThreePortalTracking');
  if(!t)return '';
  const s=String(t.textContent||'');
  if(/Delivered \/ Completed|Marketplace Completed/i.test(s))return 'Delivery completed.';
  if(/Payment Received/i.test(s)&&/Out for Delivery|Picked Up/i.test(s))return 'Payment received. Completing delivery…';
  if(/Out for Delivery|Picked Up \/ Out for Delivery/i.test(s))return 'Your order is out for delivery…';
  if(/Vaahak Reached Vendor|Reached Vendor/i.test(s))return 'Vaahak has reached the Vendor for pickup…';
  if(/Vaahak Assigned|Going to Vendor/i.test(s))return 'Vaahak assigned and going to the Vendor…';
  if(/Ready for Pickup/i.test(s))return 'Order ready for pickup. Finding the nearest Vaahak…';
  if(/Preparing Order|Vendor Preparing/i.test(s))return 'Vendor is preparing your order…';
  if(/Vendor Confirmed/i.test(s))return 'Vendor confirmed your order.';
  if(/Vendor Notified \/ Awaiting Confirmation/i.test(s))return 'Waiting for Vendor confirmation…';
  if(/Order Placed \/ Vendor Notification Pending/i.test(s))return 'Order placed. Notifying Vendor…';
  return '';
}
function apply(){
  const card=document.querySelector('.orderStatusCard');if(!card)return;
  const next=stageText();if(!next)return;
  const leaves=[...card.querySelectorAll('*')].filter(el=>el.childElementCount===0);
  for(const el of leaves){const txt=String(el.textContent||'').trim();if(/Waiting for Vaahak delivery dispatch/i.test(txt)||/Waiting for Vaahak$/i.test(txt)){el.textContent=next}}
}
setInterval(apply,700);
new MutationObserver(()=>setTimeout(apply,0)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.DBEST_MARKETPLACE_STAGE_WORDING={version:VERSION,apply};
})();
