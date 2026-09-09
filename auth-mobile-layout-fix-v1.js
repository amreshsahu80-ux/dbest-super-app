(() => {
  'use strict';
  const STYLE_ID='dbest-auth-mobile-layout-fix-v1';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      .dbestAuthLayoutFix .sectionHero{
        position:static!important;inset:auto!important;top:auto!important;left:auto!important;right:auto!important;
        transform:none!important;z-index:auto!important;max-height:none!important;overflow:visible!important;
        margin:0 0 12px!important;
      }
      .dbestAuthLayoutFix .form{position:relative!important;z-index:2!important;margin-top:0!important}
      .dbestAuthLayoutFix .notice{position:static!important;inset:auto!important;transform:none!important;z-index:auto!important}
      @media(max-width:760px){
        .dbestAuthLayoutFix .sectionContent{padding:10px 12px 30px!important}
        .dbestAuthLayoutFix .sectionHero{padding:12px 14px!important;border-radius:16px!important;box-shadow:none!important}
        .dbestAuthLayoutFix .sectionHero b{font-size:18px!important}
        .dbestAuthLayoutFix .sectionHero small{font-size:11px!important;line-height:1.4!important}
        .dbestMemberLoginFix .sectionHero{display:none!important}
        .dbestAuthLayoutFix .form{
          display:grid!important;grid-template-columns:1fr!important;gap:12px!important;width:100%!important;max-width:760px!important;
          margin:0 auto!important;padding:14px!important;background:#fff!important;border:1px solid #e2e8f2!important;
          border-radius:16px!important;box-shadow:0 8px 24px rgba(19,33,58,.08)!important;
        }
        .dbestAuthLayoutFix .form .f,.dbestAuthLayoutFix .form .full{grid-column:1!important;width:100%!important;min-width:0!important}
        .dbestAuthLayoutFix .form input,.dbestAuthLayoutFix .form select,.dbestAuthLayoutFix .form textarea{width:100%!important;min-width:0!important;font-size:16px!important}
        .dbestAuthLayoutFix .form .btn{width:100%!important;min-height:46px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function apply(){
    const page=document.querySelector('#m .sectionPage');
    if(!page)return;
    const title=String(page.querySelector('.sectionTop .sectionTitle b')?.textContent||'').trim().toLowerCase();
    const auth=/login|register|registration|verify owner otp/.test(title);
    page.classList.toggle('dbestAuthLayoutFix',auth);
    page.classList.toggle('dbestMemberLoginFix',/member\s*\/\s*promoter login|member login/.test(title));
    if(auth){
      const ov=page.closest('.sectionOverlay');
      if(ov&&ov.scrollTop<8)ov.scrollTop=0;
    }
  }

  const root=document.getElementById('m')||document.body;
  new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  window.addEventListener('resize',apply,{passive:true});
  setInterval(apply,700);
  apply();
  window.__DBEST_AUTH_LAYOUT_FIX__={version:'1.0',apply};
})();