(function(){
  const FLOAT_ID='dbestOwnerReportsFloatingV2';
  const CARD_ID='dbestOwnerReportsFirstClass';

  function ownerToken(){
    try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}
  }
  function ownerRole(){
    try{if(window.session&&window.session.role==='owner')return true}catch(e){}
    try{if(typeof session!=='undefined'&&session&&session.role==='owner')return true}catch(e){}
    return false;
  }
  function ownerScreen(){
    try{
      if(document.querySelector('.sectionContent.owner55,.sectionContent.ownerMasterPage,.owner55Groups'))return true;
      const text=(document.body?.innerText||'').slice(0,16000);
      return /Project Owner|Owner Operations|Owner Console|Master Control|Users, Network & Reports|Quick Add \/ Emergency Onboarding/i.test(text);
    }catch(e){return false}
  }
  function isOwnerContext(){return ownerRole()||(!!ownerToken()&&ownerScreen())}

  function openReports(){
    if(typeof window.ownerReportCenter==='function')return window.ownerReportCenter();
    try{window.toast?.('Owner Excel Report Center is loading. Please tap again.')}catch(e){}
  }

  function ensureFloating(){
    let b=document.getElementById(FLOAT_ID);
    if(!isOwnerContext()){
      b?.remove();
      return;
    }
    if(!b){
      b=document.createElement('button');
      b.id=FLOAT_ID;
      b.type='button';
      b.innerHTML='📊 <b>Reports & Excel</b>';
      b.setAttribute('aria-label','Open Owner Reports and Excel');
      b.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147482000;border:0;border-radius:16px;padding:13px 16px;background:linear-gradient(135deg,#175cff,#745cff);color:#fff;font:800 14px system-ui,Arial;box-shadow:0 12px 30px rgba(23,92,255,.35);cursor:pointer;display:flex;align-items:center;gap:7px';
      b.onclick=openReports;
      document.body.appendChild(b);
    }
  }

  function ensureDashboardCard(){
    if(!isOwnerContext())return;
    const root=document.querySelector('.sectionContent.owner55')||[...document.querySelectorAll('.sectionContent')].find(el=>/Owner Operations|Project Owner|Master Control|Users, Network & Reports/i.test(el.innerText||''));
    if(!root)return;

    let card=document.getElementById(CARD_ID);
    if(!card){
      card=document.createElement('div');
      card.id=CARD_ID;
      card.style.cssText='margin:0 0 14px;padding:15px;border:1px solid #cfe0ff;border-radius:18px;background:linear-gradient(135deg,#f5f9ff,#f8f5ff);box-shadow:0 8px 22px rgba(31,78,160,.08)';
      card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><b style="font-size:17px">📊 Owner Reports & Excel</b><small style="display:block;margin-top:5px;color:#687386">Download the complete Excel workbook for all onboardings, members, vendors, Vaahaks, payments, transactions, sections, subsections and ride jobs.</small></div><button type="button" class="btn" data-owner-excel-open>Open Reports & Excel</button></div>';
      card.querySelector('[data-owner-excel-open]').onclick=openReports;
      root.prepend(card);
    }else if(card.parentElement!==root){
      root.prepend(card);
    }

    root.querySelectorAll('button').forEach(b=>{
      const t=(b.innerText||'').trim();
      if(/Reports\s*&\s*CSV\s*\/\s*Excel|Reports\s*&\s*Excel|Download.*Excel/i.test(t)&&!b.hasAttribute('data-owner-excel-open')){
        b.onclick=openReports;
        b.setAttribute('data-dbest-owner-report-route','excel-center');
      }
    });
  }

  function removeLegacyDuplicate(){
    try{
      const old=document.getElementById('dbestOwnerReportsFloating');
      if(old)old.remove();
      const oldCard=document.getElementById('dbestOwnerReportsProminent');
      if(oldCard)oldCard.remove();
    }catch(e){}
  }

  function refresh(){
    removeLegacyDuplicate();
    if(!isOwnerContext()){
      document.getElementById(FLOAT_ID)?.remove();
      document.getElementById(CARD_ID)?.remove();
      return;
    }
    ensureFloating();
    ensureDashboardCard();
  }

  document.addEventListener('click',function(e){
    if(!isOwnerContext())return;
    const b=e.target.closest?.('button');if(!b)return;
    const t=(b.innerText||'').trim();
    if(/Reports\s*&\s*CSV\s*\/\s*Excel|Reports\s*&\s*Excel/i.test(t)&&b.id!==FLOAT_ID){
      e.preventDefault();e.stopImmediatePropagation();openReports();
    }
    setTimeout(refresh,60);
  },true);

  const obs=new MutationObserver(()=>setTimeout(refresh,25));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',refresh);
  setTimeout(refresh,100);
  setTimeout(refresh,400);
  setTimeout(refresh,1000);
  setTimeout(refresh,2000);

  window.DBEST_OWNER_REPORT_VISIBILITY_V2={refresh,open:openReports};
})();