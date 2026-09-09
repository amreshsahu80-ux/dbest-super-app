(() => {
  'use strict';
  const VERSION='2.0-modern-membership-hard-guard';
  const STYLE_ID='dbest-membership-flow-guard-v2';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #m .registrationPage .sectionHero,
      #m .dbestAuthLayoutFix .sectionHero{display:none!important}
      #m .dbestAuthLayoutFix .sectionContent{padding-top:10px!important}
      #m .dbestAuthLayoutFix .form{position:relative!important;z-index:3!important}
      #m .dbj-shell{position:relative!important;z-index:5!important}
      @media(max-width:760px){
        #m .sectionOverlay{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important}
        #m .dbj-wrap{padding-top:8px!important}
      }
    `;
    document.head.appendChild(s);
  }

  let patched=false;
  let oldAccount=null, oldOpenService=null;

  function modern(){ return window.__DBEST_MODERN_JOIN__||null; }
  function plans(){
    const m=modern();
    if(m&&typeof m.plans==='function') return m.plans();
    if(typeof window.dbestModernJoin==='function') return window.dbestModernJoin('guest');
  }
  function joinTier(tier){
    if(typeof window.dbestModernJoin==='function') return window.dbestModernJoin(tier);
    const m=modern();
    if(m&&typeof m.plans==='function') return m.plans();
  }
  function visitor(){
    try{return !window.session || window.session.role==='visitor' || !window.session.id}catch{return true}
  }

  function inferTier(){
    const title=String(document.querySelector('#m .sectionTop .sectionTitle')?.textContent||document.querySelector('#m')?.textContent||'').toLowerCase();
    try{
      for(const [k,t] of Object.entries(window.tiers||{})){
        const name=String(t?.name||k).toLowerCase();
        if(title.includes(name)||title.includes(k))return k;
      }
    }catch{}
    return 'guest';
  }

  function suppressLegacy(){
    const root=document.getElementById('m');if(!root)return;
    root.querySelectorAll('.sectionHero').forEach(h=>{
      const page=h.closest('.sectionPage');
      const title=String(page?.querySelector('.sectionTitle')?.textContent||'').toLowerCase();
      if(/login|register|registration|choose membership|member/.test(title))h.style.setProperty('display','none','important');
    });
    const old=root.querySelector('.registrationPage');
    const modernShell=root.querySelector('.dbj-shell');
    if(old&&!modernShell&&typeof window.dbestModernJoin==='function'){
      const tier=inferTier();
      setTimeout(()=>joinTier(tier),0);
    }
  }

  function patch(){
    if(patched||!modern()||typeof window.dbestModernJoin!=='function')return false;
    patched=true;
    oldAccount=window.account;
    oldOpenService=window.openService;

    window.registerChoice=plans;
    window.registrationChoice=plans;
    window.reg=joinTier;

    if(typeof oldAccount==='function'){
      window.account=function(){
        if(visitor())return plans();
        return oldAccount.apply(this,arguments);
      };
    }
    if(typeof oldOpenService==='function'){
      window.openService=function(id){
        if(String(id)==='join'&&visitor())return plans();
        return oldOpenService.apply(this,arguments);
      };
    }
    suppressLegacy();
    return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b||!visitor())return;
    const oc=String(b.getAttribute('onclick')||'');
    if(/registerChoice\s*\(/.test(oc)||/registrationChoice\s*\(/.test(oc)){
      e.preventDefault();e.stopImmediatePropagation();plans();return;
    }
    const m=oc.match(/\breg\(['\"](leader|prime|promoter|guest)['\"]\)/i);
    if(m){e.preventDefault();e.stopImmediatePropagation();joinTier(m[1].toLowerCase());}
  },true);

  const root=document.getElementById('m')||document.body;
  new MutationObserver(()=>{patch();suppressLegacy();}).observe(root,{childList:true,subtree:true});
  let tries=0;const timer=setInterval(()=>{tries++;patch();suppressLegacy();if(patched||tries>30)clearInterval(timer)},100);
  patch();
  window.__DBEST_MEMBERSHIP_FLOW_GUARD__={version:VERSION,patch,plans};
})();