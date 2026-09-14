(function(){
  const CLEAN='/vaahak-live-dashboard-stable.js?v=20260914-vaahak-force-clean-v5';
  let loading=null;
  function loadClean(){
    if(window.DBEST_VAAHAK_STABLE_DASHBOARD?.version==='3.0.0-clean-dispatch')return Promise.resolve();
    if(loading)return loading;
    loading=new Promise(resolve=>{
      const old=document.querySelector('script[data-dbest-vaahak-clean-force]');
      if(old){old.remove();}
      const s=document.createElement('script');
      s.src=CLEAN;s.async=false;s.dataset.dbestVaahakCleanForce='1';
      s.onload=()=>resolve();s.onerror=()=>resolve();
      (document.body||document.documentElement).appendChild(s);
    });
    return loading;
  }
  async function go(){
    try{
      await loadClean();
      if(typeof window.openVaahakPortal==='function')window.openVaahakPortal();
      else if(typeof openVaahakPortal==='function')openVaahakPortal();
      setTimeout(()=>{try{window.vaahakDashboard?.()}catch(e){}},120);
      return;
    }catch(e){}
    try{typeof toast==='function'&&toast('Vaahak portal is loading. Please retry in a moment.')}catch(e){}
  }
  function bind(){
    const b=document.getElementById('dbestVaahakFloat');
    if(b){b.onclick=go;b.addEventListener('touchend',function(e){e.preventDefault();go()},{passive:false})}
    document.querySelectorAll('button,a').forEach(el=>{if(/vaahak partner/i.test(el.textContent||'')){el.onclick=go}})
  }
  const p=new URLSearchParams(location.search);
  if(p.get('portal')==='vaahak'){setTimeout(go,350)}
  setTimeout(bind,500);setTimeout(bind,1500);setTimeout(bind,3000);
})();