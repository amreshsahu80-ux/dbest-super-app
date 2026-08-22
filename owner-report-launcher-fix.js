(function(){
  function ownerToken(){
    try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}
  }
  function isOwner(){
    try{
      if(window.session?.role==='owner')return true;
      const text=(document.body?.innerText||'').slice(0,12000);
      return !!ownerToken() && /Project Owner|Owner Operations|Master Control|Owner Console|Owner Dashboard/i.test(text);
    }catch(e){return false}
  }
  function openReports(){
    if(typeof window.ownerReportCenter==='function')return window.ownerReportCenter();
    try{window.toast?.('Reports module is loading. Please tap again.')}catch(e){}
  }
  function ensureFloating(){
    let b=document.getElementById('dbestOwnerReportsFloating');
    if(!isOwner()){
      b?.remove();
      document.getElementById('dbestOwnerReportsProminent')?.remove();
      return;
    }
    if(!b){
      b=document.createElement('button');
      b.id='dbestOwnerReportsFloating';
      b.type='button';
      b.setAttribute('aria-label','Open Owner Reports and Excel');
      b.innerHTML='📊 <b>Reports & Excel</b>';
      b.style.cssText='position:fixed;right:14px;bottom:14px;z-index:11950;border:0;border-radius:16px;padding:13px 16px;background:linear-gradient(135deg,#175cff,#745cff);color:#fff;font:800 14px system-ui,Arial;box-shadow:0 12px 30px rgba(23,92,255,.35);cursor:pointer;display:flex;align-items:center;gap:7px';
      b.onclick=openReports;
      document.body.appendChild(b);
    }
  }
  function ensureProminent(){
    if(!isOwner()||document.getElementById('dbestOwnerReportsProminent'))return;
    const candidates=[...document.querySelectorAll('.sectionContent')];
    const root=candidates.find(el=>/Project Owner|Owner Operations|Master Control|Owner Console|Users, Network & Reports/i.test(el.innerText||''));
    if(!root)return;
    const wrap=document.createElement('div');
    wrap.id='dbestOwnerReportsProminent';
    wrap.style.cssText='margin:0 0 14px;padding:14px;border:1px solid #cfe0ff;border-radius:16px;background:linear-gradient(135deg,#f5f9ff,#f7f4ff);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';
    wrap.innerHTML='<div><b style="font-size:16px">📊 Owner Reports & Excel</b><small style="display:block;margin-top:4px;color:#687386">Download all onboardings, payments, transactions, members, vendors, Vaahaks and ride reports in Excel.</small></div><button type="button" class="btn" data-open-owner-reports>Open Reports & Excel</button>';
    wrap.querySelector('[data-open-owner-reports]').onclick=openReports;
    root.prepend(wrap);
  }
  function refresh(){
    ensureFloating();
    ensureProminent();
  }
  const obs=new MutationObserver(()=>setTimeout(refresh,30));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(refresh,80),true);
  window.addEventListener('load',refresh);
  setTimeout(refresh,150);
  setTimeout(refresh,600);
  setTimeout(refresh,1500);
  window.DBEST_OWNER_REPORT_LAUNCHER={refresh,open:openReports};
})();
