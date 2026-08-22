window.DBEST_RUNTIME_CONFIG = Object.freeze({
  ownerEmail: "amresh.sahu80@gmail.com",
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  integrationBranch: "backend-integration"
});

(function(){
  const loadScript=(src,attr)=>{
    const load=()=>{
      if(document.querySelector('script['+attr+']')) return;
      const s=document.createElement('script');
      s.src=src;
      s.setAttribute(attr,'1');
      document.body.appendChild(s);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
  };
  loadScript('./ride-otp-completion-fix.js','data-dbest-ride-otp-fix');
  if(/\/vaahak\.html$/i.test(location.pathname)){
    loadScript('./vaahak-ride-history.js','data-dbest-vaahak-history');
    loadScript('./vaahak-nearest-dispatch.js?v=20260823-0245','data-dbest-nearest-dispatch');
  }
})();
