(function(){
  const CLEAN='/vaahak-live-dashboard-stable.js?v=20260914-vaahak-force-clean-v6';
  const FINAL='/vaahak-clean-ui-final-v1.js?v=20260914-vaahak-force-clean-v6';
  let loading=null;
  function loadScript(src,attr){
    return new Promise(resolve=>{
      const old=document.querySelector('script['+attr+']');
      if(old)old.remove();
      const s=document.createElement('script');
      s.src=src;s.async=false;s.setAttribute(attr,'1');
      s.onload=()=>resolve();s.onerror=()=>resolve();
      (document.body||document.documentElement).appendChild(s);
    });
  }
  function loadClean(){
    if(loading)return loading;
    loading=(async()=>{
      if(!window.DBEST_VAAHAK_STABLE_DASHBOARD?.version)await loadScript(CLEAN,'data-dbest-vaahak-clean-force');
      await loadScript(FINAL,'data-dbest-vaahak-clean-final-force');
    })();
    return loading;
  }
  async function go(){
    try{
      await loadClean();
      if(window.DBEST_VAAHAK_CLEAN_UI_FINAL?.openClean?.())return;
      if(typeof window.vaahakDashboard==='function'){window.vaahakDashboard();return;}
      if(typeof window.openVaahakPortal==='function'){window.openVaahakPortal();return;}
    }catch(e){}
    try{typeof toast==='function'&&toast('Vaahak portal is loading. Please retry in a moment.')}catch(e){}
  }
  function bind(){
    const b=document.getElementById('dbestVaahakFloat');
    if(b){b.onclick=go;b.addEventListener('touchend',function(e){e.preventDefault();go()},{passive:false})}
    document.querySelectorAll('button,a').forEach(el=>{if(/vaahak partner/i.test(el.textContent||'')){el.onclick=go}})
  }
  const p=new URLSearchParams(location.search);
  const standalone=/\/vaahak\/?$/i.test(location.pathname)||p.get('portal')==='vaahak';
  if(standalone)setTimeout(go,350);
  setTimeout(bind,500);setTimeout(bind,1500);setTimeout(bind,3000);
})();