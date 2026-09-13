(function(){
'use strict';
function inferType(){
  var t=String(document.body&&document.body.innerText||'').toLowerCase();
  if(t.indexOf('restaurants & food')>=0)return 'restaurant';
  if(t.indexOf('grocery')>=0)return 'grocery';
  if(t.indexOf('medicine')>=0||t.indexOf('pharmacy')>=0)return 'medicine';
  if(t.indexOf('digital')>=0)return 'digital';
  return 'restaurant';
}
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(!b)return;
  var txt=String(b.textContent||'').trim();
  if(!(/^Checkout$/i.test(txt)||/^Proceed\s+to\s+Checkout/i.test(txt)))return;
  if(!window.DBEST_PAY_AT_DELIVERY||typeof window.DBEST_PAY_AT_DELIVERY.choose!=='function')return;
  e.preventDefault();
  e.stopPropagation();
  if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  window.DBEST_PAY_AT_DELIVERY.choose(e,inferType());
  return false;
},true);
})();