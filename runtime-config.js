window.DBEST_RUNTIME_CONFIG = Object.freeze({
  ownerEmail: "amresh.sahu80@gmail.com",
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260823-0308-vaahakdash-final';
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
  loadScript('./ride-otp-completion-fix.js?v='+V,'data-dbest-ride-otp-fix');
  if(/\/vaahak\.html$/i.test(location.pathname)){
    loadScript('./vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('./vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
  }
})();
