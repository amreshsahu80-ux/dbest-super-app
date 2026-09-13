(function(){
'use strict';
function ensureStyle(){
  if(document.getElementById('dbestWalletScopeStyle'))return;
  const s=document.createElement('style');
  s.id='dbestWalletScopeStyle';
  s.textContent='#dbestWalletSummaryBtn{display:none!important}.classicDash #dbestWalletSummaryBtn{display:inline-block!important}';
  (document.head||document.documentElement).appendChild(s);
}
function visible(el){
  if(!el)return false;
  const s=getComputedStyle(el);
  return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0;
}
function isHome(){
  const buttons=[...document.querySelectorAll('button')].filter(visible);
  const texts=buttons.map(b=>String(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase());
  return texts.some(t=>t.includes('my profile'))&&texts.some(t=>t.includes('dashboard'))&&texts.some(t=>t.includes('all services'));
}
function wireHomeWallet(){
  if(!isHome())return;
  const candidates=[...document.querySelectorAll('button')].filter(visible);
  const all=candidates.find(b=>String(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase().includes('all services'));
  if(!all)return;
  if(!all.dataset.dbestOriginalAllServices){
    all.dataset.dbestOriginalAllServices=all.innerHTML;
    all.dataset.dbestOriginalOnclick=all.getAttribute('onclick')||'';
  }
  all.innerHTML='💰 My Wallet';
  all.setAttribute('aria-label','My Wallet');
  all.onclick=function(e){
    try{e&&e.preventDefault&&e.preventDefault();e&&e.stopPropagation&&e.stopPropagation()}catch(_){}
    const api=window.DBEST_MEMBER_WALLET_SUMMARY;
    if(api&&typeof api.open==='function')api.open();
    return false;
  };
}
function restoreNonHomeButtons(){
  if(isHome())return;
  document.querySelectorAll('button[data-dbest-original-all-services]').forEach(b=>{
    b.innerHTML=b.dataset.dbestOriginalAllServices||'All Services';
    const oc=b.dataset.dbestOriginalOnclick||'';
    b.onclick=null;
    if(oc)b.setAttribute('onclick',oc);else b.removeAttribute('onclick');
    delete b.dataset.dbestOriginalAllServices;
    delete b.dataset.dbestOriginalOnclick;
  });
}
function apply(){
  ensureStyle();
  wireHomeWallet();
  restoreNonHomeButtons();
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(apply,50)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
document.addEventListener('click',()=>setTimeout(apply,60),true);
[0,120,400,900,1800].forEach(ms=>setTimeout(apply,ms));
})();
