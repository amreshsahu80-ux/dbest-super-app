(function(){
  // Make duplicate-registration blocks explicit instead of silently stopping.
  function installDuplicateAlert(){
    if(typeof window.toast!=='function')return false;
    if(window.toast.__dbestDuplicateAlertWrapped)return true;
    const original=window.toast;
    function wrapped(message){
      const text=String(message||'');
      if(/already registered with DBest/i.test(text)){
        try{window.alert(text);}catch(e){}
      }
      return original.apply(this,arguments);
    }
    wrapped.__dbestDuplicateAlertWrapped=true;
    window.toast=wrapped;
    return true;
  }

  // Reduce unnecessary network/CPU use from the many service-tile videos.
  function optimizeVideo(v){
    if(!(v instanceof HTMLVideoElement)||v.dataset.dbestOptimized==='1')return;
    v.dataset.dbestOptimized='1';
    v.preload='metadata';
    v.setAttribute('playsinline','');
    try{v.pause();}catch(e){}
  }

  function setupVideoObserver(){
    const videos=[...document.querySelectorAll('video')];
    videos.forEach(optimizeVideo);
    if(!('IntersectionObserver' in window))return;
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const v=entry.target;
        if(entry.isIntersecting && entry.intersectionRatio>0.15){
          if(v.autoplay || v.hasAttribute('autoplay'))v.play().catch(()=>{});
        }else{
          try{v.pause();}catch(e){}
        }
      });
    },{rootMargin:'120px 0px',threshold:[0,0.15]});
    videos.forEach(v=>io.observe(v));
    const mo=new MutationObserver(muts=>{
      for(const m of muts){
        for(const n of m.addedNodes){
          if(!(n instanceof Element))continue;
          if(n.matches&&n.matches('video')){optimizeVideo(n);io.observe(n)}
          n.querySelectorAll&&n.querySelectorAll('video').forEach(v=>{optimizeVideo(v);io.observe(v)});
        }
      }
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }

  function start(){
    if(!installDuplicateAlert()){
      let tries=0;const t=setInterval(()=>{tries++;if(installDuplicateAlert()||tries>40)clearInterval(t)},100);
    }
    setupVideoObserver();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
