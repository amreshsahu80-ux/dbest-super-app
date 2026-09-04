(function(){
  function go(){
    try{
      if(typeof window.openVaahakPortal==='function')return window.openVaahakPortal();
      if(typeof openVaahakPortal==='function')return openVaahakPortal();
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