(() => {
  'use strict';
  const VERSION='1.0-live-member-ui';
  function polish(){
    const host=document.getElementById('dbest-ai-test-host');
    const root=host?.shadowRoot;if(!root)return false;
    const badge=root.querySelector('.badge');if(badge)badge.textContent='MEMBER AI';
    const sub=root.querySelector('.sub');if(sub)sub.textContent='Auto language • Same-language replies • Voice assistance';
    const hello=root.querySelector('.hello');if(hello)hello.innerHTML='<b>Speak or type naturally in your own language.</b><br>DBest AI can guide you to the right service, carry known details forward and help you continue faster.';
    root.querySelectorAll('.aihead').forEach(x=>{x.textContent=String(x.textContent||'').replace(/\s*•\s*TEST\b/g,'')});
    const msgs=root.querySelector('#msgs');if(msgs&&!msgs.__dbestLivePolish){
      msgs.__dbestLivePolish=true;
      new MutationObserver(()=>root.querySelectorAll('.aihead').forEach(x=>{x.textContent=String(x.textContent||'').replace(/\s*•\s*TEST\b/g,'')})).observe(msgs,{childList:true,subtree:true});
    }
    return true;
  }
  function install(){if(!polish())setTimeout(install,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.__DBEST_AI_LIVE_UI__={version:VERSION,polish};
})();