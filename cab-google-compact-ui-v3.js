(function(){
'use strict';
const c=window.DBEST_CAB_GOOGLE;
if(!c||typeof c.open!=='function'||c.__compactV3)return;
const originalOpen=c.open;
function compact(){
  const by=id=>document.getElementById(id);
  const set=(sel,txt)=>{const el=document.querySelector(sel);if(el)el.textContent=txt};
  set('[data-mode="ride"]','Ride');
  set('[data-mode="rental"]','Rental');
  const p=by('dbcgP'),d=by('dbcgD');
  if(p)p.placeholder='Pickup';
  if(d)d.placeholder='Drop';
  set('#dbcgGps','◎ Current');
  set('#dbcgSwap','⇅');
  set('[data-sch="now"]','Now');
  set('[data-sch="later"]','Later');
  set('[data-rider="self"]','Me');
  set('[data-rider="other"]','Other');
  set('#dbcgGo','Choose Vehicle →');
  const provider=by('dbcgProvider');if(provider)provider.style.display='none';
  const s=document.getElementById('dbcg-compact-ui-v3')||document.createElement('style');
  s.id='dbcg-compact-ui-v3';
  s.textContent=`
    .dbcgCard{padding:13px!important}
    .dbcgTabs,.dbcgSeg{margin:7px 0!important}
    .dbcgTabs button,.dbcgSeg button{min-height:42px!important;padding:9px 6px!important;font-size:14px!important}
    .dbcgField{margin:8px 0!important}
    .dbcgField input,.dbcgField select{min-height:48px!important;padding:11px 14px!important}
    .dbcgTools{grid-template-columns:1fr auto!important;gap:7px!important;margin:6px 0!important}
    .dbcgTools button{min-height:42px!important;padding:8px 12px!important}
    #dbcgSwap{width:48px!important;font-size:20px!important}
    .dbcgGo{min-height:50px!important;margin-top:8px!important}
    .dbcgProvider{display:none!important}
    @media(max-width:600px){
      .dbcgMap{height:230px!important}
      .dbcgCard{margin:-22px 6px 0!important;padding:12px!important}
      .dbcgTabs button,.dbcgSeg button{font-size:13px!important}
    }
  `;
  if(!s.parentNode)document.head.appendChild(s);
}
c.open=function(){const r=originalOpen.apply(this,arguments);requestAnimationFrame(compact);setTimeout(compact,120);return r};
c.__compactV3=true;
})();