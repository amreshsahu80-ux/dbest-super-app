(function(){
'use strict';
function ensureStyle(){
  if(document.getElementById('dbestWalletScopeStyle'))return;
  const s=document.createElement('style');
  s.id='dbestWalletScopeStyle';
  s.textContent='#dbestWalletSummaryBtn{display:none!important}.classicDash #dbestWalletSummaryBtn{display:inline-block!important}body.dbestHomeWalletAllowed #dbestWalletSummaryBtn{display:inline-block!important}';
  (document.head||document.documentElement).appendChild(s);
}
function classify(){
  ensureStyle();
  const btn=document.getElementById('dbestWalletSummaryBtn');
  const visibleHero=[...document.querySelectorAll('.sectionHero')].some(x=>{const s=getComputedStyle(x);return s.display!=='none'&&s.visibility!=='hidden'});
  const onDashboard=!!btn?.closest('.classicDash');
  document.body?.classList.toggle('dbestHomeWalletAllowed',!visibleHero&&!onDashboard);
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(classify,40)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
document.addEventListener('click',schedule,true);
[0,100,350,800,1600].forEach(ms=>setTimeout(classify,ms));
})();
