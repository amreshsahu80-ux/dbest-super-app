(function(){
'use strict';
function tidy(){
  const btn=document.getElementById('dbestWalletSummaryBtn');
  if(!btn)return;
  const dashboard=btn.closest('.classicDash');
  if(!dashboard)btn.remove();
}
new MutationObserver(function(){setTimeout(tidy,20)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',function(){setTimeout(tidy,30)},true);
[0,150,500,1200,2500].forEach(function(ms){setTimeout(tidy,ms)});
})();