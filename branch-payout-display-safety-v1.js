(function(){
'use strict';
function clean(){
  document.querySelectorAll('.branchStat,.kpi').forEach(function(card){
    var s=card.querySelector('small');
    var t=String(s&&s.textContent||'').trim();
    if(t==='Your Payout'||t==='Your Eligible Payout')card.style.display='none';
  });
  document.querySelectorAll('h3').forEach(function(h){
    if(/Payout Calculation/i.test(String(h.textContent||''))){
      var n=h.nextElementSibling;
      h.style.display='none';
      if(n&&n.classList&&n.classList.contains('table'))n.style.display='none';
    }
  });
  document.querySelectorAll('.payoutBox').forEach(function(x){
    if(/default L1|qualifying txn|custom product\/service\/category rules/i.test(String(x.textContent||'')))x.style.display='none';
  });
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(clean,40)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',function(){setTimeout(clean,50)},true);
[0,150,500,1200,2500].forEach(function(ms){setTimeout(clean,ms)});
})();