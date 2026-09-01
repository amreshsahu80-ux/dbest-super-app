(function(){
'use strict';
const c=window.DBEST_CAB_GOOGLE;
if(!c||typeof c.open!=='function'||c.__compactV4)return;
const originalOpen=c.open;
function compact(){
  const by=id=>document.getElementById(id);
  const set=(sel,txt)=>{const el=document.querySelector(sel);if(el)el.textContent=txt};
  set('[data-mode="ride"]','Ride');
  set('[data-mode="rental"]','Rental');
  const p=by('dbcgP'),d=by('dbcgD');
  if(p)p.placeholder='Pickup';
  if(d)d.placeholder='Drop';
  set('#dbcgSwap','⇅');
  set('[data-sch="now"]','Now');
  set('[data-sch="later"]','Later');
  set('[data-rider="self"]','Me');
  set('[data-rider="other"]','Other');
  set('#dbcgGo','Choose Vehicle');
  const gps=by('dbcgGps');if(gps)gps.style.display='none';
  const provider=by('dbcgProvider');if(provider)provider.style.display='none';
  [...document.querySelectorAll('*')].forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t==='Reliable map + route booking')el.style.display='none';
  });
  const s=document.getElementById('dbcg-compact-ui-v4')||document.createElement('style');
  s.id='dbcg-compact-ui-v4';
  s.textContent=`
    .dbcg{max-width:900px!important;padding:0 10px 36px!important}
    .dbcgMap{height:250px!important;border-radius:24px!important;box-shadow:0 16px 38px rgba(15,23,42,.12)!important}
    .dbcgCard{margin:-28px 10px 0!important;padding:14px!important;border-radius:26px!important;background:rgba(255,255,255,.98)!important;box-shadow:0 22px 50px rgba(37,99,235,.16)!important;border:1px solid rgba(255,255,255,.95)!important}
    .dbcgTabs,.dbcgSeg{margin:7px 0!important;padding:4px!important;border-radius:16px!important;background:#f3f6fb!important}
    .dbcgTabs button,.dbcgSeg button{min-height:42px!important;padding:9px 6px!important;font-size:14px!important;border-radius:12px!important}
    .dbcgTabs button.on{background:linear-gradient(135deg,#1459e8,#2d6df6)!important;color:#fff!important;box-shadow:0 8px 18px rgba(37,99,235,.22)!important}
    .dbcgSeg button.on{background:#fff!important;color:#1459e8!important;box-shadow:0 5px 14px rgba(15,23,42,.08)!important}
    .dbcgField{margin:8px 0!important}
    .dbcgField input,.dbcgField select{min-height:50px!important;padding:12px 14px!important;border-radius:16px!important;font-size:15px!important;box-shadow:0 4px 12px rgba(15,23,42,.04)!important}
    #dbcgP{border-left:4px solid #16a34a!important}
    #dbcgD{border-left:4px solid #ef4444!important}
    .dbcgTools{display:flex!important;justify-content:flex-end!important;margin:-4px 0 3px!important;min-height:0!important}
    #dbcgGps{display:none!important}
    #dbcgSwap{width:44px!important;height:38px!important;min-height:38px!important;padding:0!important;border-radius:999px!important;font-size:19px!important;background:#eef4ff!important;border:1px solid #d8e5ff!important;color:#1459e8!important;box-shadow:none!important}
    .dbcgGo{min-height:52px!important;margin-top:9px!important;border-radius:17px!important;background:linear-gradient(135deg,#0f5cf5,#315efb 55%,#5146e5)!important;box-shadow:0 13px 28px rgba(37,99,235,.28)!important;font-size:15px!important;letter-spacing:.1px!important}
    .dbcgGo:after{content:'  →';font-weight:900}
    .dbcgProvider{display:none!important}
    @media(max-width:600px){
      .dbcgMap{height:215px!important;border-radius:21px!important}
      .dbcgCard{margin:-23px 6px 0!important;padding:12px!important;border-radius:23px!important}
      .dbcgTabs button,.dbcgSeg button{font-size:13px!important}
      .dbcgGo{position:sticky!important;bottom:10px!important;z-index:30!important}
    }
  `;
  if(!s.parentNode)document.head.appendChild(s);
}
c.open=function(){const r=originalOpen.apply(this,arguments);requestAnimationFrame(compact);setTimeout(compact,120);return r};
c.__compactV4=true;
})();