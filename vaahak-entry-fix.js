(function(){
  function isVaahakPortal(){return new URLSearchParams(location.search).get('portal')==='vaahak';}
  function openPortal(){
    try{
      if(typeof window.openVaahakPortal==='function'){
        window.openVaahakPortal();
        return true;
      }
    }catch(e){}
    return false;
  }
  function portalVisible(){
    const t=(document.body&&document.body.innerText)||'';
    return /DBest Vaahak|Vaahak Login|Vaahak Registration|Vaahak Dashboard/i.test(t);
  }
  function forcePortal(){
    if(!isVaahakPortal())return;
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(portalVisible()){clearInterval(timer);return;}
      openPortal();
      if(tries>=30)clearInterval(timer);
    },250);
  }
  function makeButtonReliable(){
    const b=document.getElementById('dbestVaahakFloat');
    if(b){
      b.style.zIndex='2147483647';
      b.style.pointerEvents='auto';
      b.style.touchAction='manipulation';
      b.onclick=function(ev){
        ev.preventDefault();ev.stopPropagation();
        const u=new URL(location.href);u.searchParams.set('portal','vaahak');u.searchParams.set('v',Date.now().toString());
        location.href=u.toString();
      };
    }
  }
  document.addEventListener('click',function(ev){
    const el=ev.target&&ev.target.closest?ev.target.closest('#dbestVaahakFloat,.vhFloat'):null;
    if(!el)return;
    ev.preventDefault();ev.stopPropagation();
    const u=new URL(location.href);u.searchParams.set('portal','vaahak');u.searchParams.set('v',Date.now().toString());
    location.href=u.toString();
  },true);
  const mo=new MutationObserver(makeButtonReliable);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){makeButtonReliable();forcePortal();});
  else {makeButtonReliable();forcePortal();}
  setTimeout(makeButtonReliable,1000);
  setTimeout(forcePortal,1200);
})();
