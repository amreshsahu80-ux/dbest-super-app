window.DBEST_RUNTIME_CONFIG = Object.freeze({
  ownerEmail: "amresh.sahu80@gmail.com",
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  integrationBranch: "backend-integration"
});

(function(){
  if(!/\/vaahak\.html$/i.test(location.pathname)) return;
  const load=()=>{
    if(document.querySelector('script[data-dbest-vaahak-history]')) return;
    const s=document.createElement('script');
    s.src='./vaahak-ride-history.js';
    s.setAttribute('data-dbest-vaahak-history','1');
    document.body.appendChild(s);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
})();
