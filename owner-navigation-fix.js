(function(){
  function validUrl(v){try{const u=new URL(v);return /^https?:$/.test(u.protocol)}catch(e){return false}}
  function install(){
    if(window.__dbestOwnerNavFixInstalled)return;
    if(typeof window.saveLink==='function'){
      window.saveLink=function(e,id){
        e.preventDefault();
        try{
          const f=new FormData(e.target),url=String(f.get('url')||'').trim();
          if(url&&!validUrl(url))return window.toast?.('Enter a valid https:// partner URL');
          const partner=String(f.get('partner')||'').trim();
          window.links[id]={partner,url,buttonLabel:String(f.get('buttonLabel')||'').trim(),enabled:f.get('enabled')==='on'&&!!url};
          if(typeof window.save==='function')window.save();
          window.toast?.('Partner deeplink saved');
          setTimeout(()=>{if(typeof window.ownerDeeplinkStudio==='function')window.ownerDeeplinkStudio();},30);
        }catch(err){window.toast?.('Could not save deeplink: '+(err.message||'Unknown error'))}
      };
    }
    document.addEventListener('click',function(e){
      const b=e.target.closest?.('button');if(!b)return;
      const txt=(b.textContent||'').trim().toLowerCase();
      if((txt==='back'||txt.startsWith('← back'))&&document.getElementById('dbestShowcaseOwnerModal')){
        document.getElementById('dbestShowcaseOwnerModal')?.remove();
      }
    },true);
    window.__dbestOwnerNavFixInstalled=true;
  }
  let tries=0;const t=setInterval(()=>{install();if(window.__dbestOwnerNavFixInstalled||++tries>20)clearInterval(t)},150);
})();