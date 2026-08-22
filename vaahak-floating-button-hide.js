(function(){
  const FLOAT_ID='dbestVaahakFloat';

  function hideFloatingVaahak(){
    try{
      const btn=document.getElementById(FLOAT_ID);
      if(btn) btn.remove();
    }catch(e){}
  }

  try{
    const style=document.createElement('style');
    style.id='dbest-hide-vaahak-float-style';
    style.textContent='#'+FLOAT_ID+'{display:none!important;visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }catch(e){}

  hideFloatingVaahak();
  const observer=new MutationObserver(hideFloatingVaahak);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(hideFloatingVaahak,50);
  setTimeout(hideFloatingVaahak,300);
  setTimeout(hideFloatingVaahak,1000);

  window.DBEST_VAAHAK_FLOATING_BUTTON_DISABLED=true;
})();