(function(){
'use strict';
['/marketplace-cod-option-v1.js','/transaction-invoice-receipt-v1.js'].forEach(function(src){
  if(document.querySelector('script[src^="'+src+'"]')) return;
  var s=document.createElement('script');
  s.src=src+'?v=20260913-invoice-cod-test-v1';
  s.defer=true;
  (document.body||document.documentElement).appendChild(s);
});
})();