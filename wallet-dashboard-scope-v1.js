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
function homeActionButton(){
  const buttons=[...document.querySelectorAll('button')].filter(visible);
  const hasProfile=buttons.some(b=>/my profile/i.test(String(b.textContent||'')));
  const hasDashboard=buttons.some(b=>/^\s*🏠?\s*dashboard\s*$/i.test(String(b.textContent||'').trim())||/dashboard/i.test(String(b.textContent||'')));
  const hasLogout=buttons.some(b=>/logout/i.test(String(b.textContent||'')));
  if(!(hasProfile&&hasDashboard&&hasLogout))return null;
  return buttons.find(b=>/all services/i.test(String(b.textContent||''))||b.dataset.dbestHomeWallet==='1')||null;
}
function apply(){
  ensureStyle();
  const btn=document.getElementById('dbestWalletSummaryBtn');
  if(btn&&!btn.closest('.classicDash'))btn.style.setProperty('display','none','important');
  const home=homeActionButton();
  document.querySelectorAll('button[data-dbest-home-wallet="1"]').forEach(b=>{
    if(b!==home&&b.dataset.dbestOriginalHtml){
      b.innerHTML=b.dataset.dbestOriginalHtml;
      const oc=b.dataset.dbestOriginalOnclick||'';
      b.onclick=null;
      if(oc)b.setAttribute('onclick',oc);else b.removeAttribute('onclick');
      delete b.dataset.dbestHomeWallet;delete b.dataset.dbestOriginalHtml;delete b.dataset.dbestOriginalOnclick;
    }
  });
  if(!home)return;
  if(!home.dataset.dbestHomeWallet){
    home.dataset.dbestOriginalHtml=home.innerHTML;
    home.dataset.dbestOriginalOnclick=home.getAttribute('onclick')||'';
    home.dataset.dbestHomeWallet='1';
  }
  home.innerHTML='💰 My Wallet';
  home.setAttribute('aria-label','My Wallet');
  home.onclick=function(e){
    try{e&&e.preventDefault&&e.preventDefault();e&&e.stopPropagation&&e.stopPropagation()}catch(_){}
    const api=window.DBEST_MEMBER_WALLET_SUMMARY;
    if(api&&typeof api.open==='function')api.open();
    return false;
  };
}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(apply,35)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
document.addEventListener('click',()=>setTimeout(apply,45),true);
[0,100,300,700,1400,2500].forEach(ms=>setTimeout(apply,ms));
})();
