(function(){
  'use strict';
  const FLOAT_ID='dbestVaahakFloat';
  const MARKET_CLASS='dbestMarketplaceOpen';
  const STYLE_ID='dbest-vaahak-marketplace-scope-style';

  function marketplaceOpen(){
    try{return !!document.querySelector('#m .sectionContent.shopPage, #m .shopPage')}catch(_){return false}
  }
  function sync(){
    try{if(document.body)document.body.classList.toggle(MARKET_CLASS,marketplaceOpen())}catch(_){}
  }
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent='body.'+MARKET_CLASS+' #'+FLOAT_ID+'{display:none!important;visibility:hidden!important;pointer-events:none!important}';
    (document.head||document.documentElement).appendChild(style);
  }

  installStyle();
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('popstate',sync);
  window.addEventListener('hashchange',sync);
  setInterval(sync,500);
  window.DBEST_VAAHAK_FLOATING_BUTTON_SCOPE={version:'2.0.0',marketplaceOnly:true};
})();