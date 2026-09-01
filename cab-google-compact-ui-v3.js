(function(){
'use strict';
const c=window.DBEST_CAB_GOOGLE;
if(!c||typeof c.open!=='function'||c.__compactV6)return;
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
  const rental=by('dbcgRentalPkg');
  if(rental && ![...rental.options].some(o=>o.value==='12|120')){const o=document.createElement('option');o.value='12|120';o.textContent='12 Hours / 120 km';rental.appendChild(o)}
  const self=document.querySelector('[data-rider="self"]');
  const riderSeg=self&&self.parentElement;
  if(riderSeg && !by('dbcgForLabel')){const lab=document.createElement('div');lab.id='dbcgForLabel';lab.textContent='For';riderSeg.parentNode.insertBefore(lab,riderSeg)}
  [...document.querySelectorAll('*')].forEach(el=>{const t=(el.textContent||'').trim();if(t==='Reliable map + route booking')el.style.display='none'});
  const s=document.getElementById('dbcg-compact-ui-v6')||document.createElement('style');
  s.id='dbcg-compact-ui-v6';
  s.textContent=`
    .dbcg{max-width:900px!important;padding:0 10px 38px!important;background:linear-gradient(180deg,#f6f9ff 0,#ffffff 58%)!important}
    .dbcgMap{height:254px!important;border-radius:26px!important;box-shadow:0 22px 54px rgba(37,99,235,.20)!important;border:1px solid rgba(99,102,241,.16)!important}
    .dbcgCard{margin:-31px 10px 0!important;padding:15px!important;border-radius:28px!important;background:linear-gradient(180deg,rgba(255,255,255,.995),rgba(247,250,255,.99))!important;box-shadow:0 28px 64px rgba(67,56,202,.20)!important;border:1px solid rgba(255,255,255,.98)!important}
    .dbcgTabs,.dbcgSeg{margin:8px 0!important;padding:5px!important;border-radius:18px!important;background:linear-gradient(145deg,#edf3ff,#f5f1ff)!important;border:1px solid #e4e8fb!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 5px 16px rgba(99,102,241,.07)!important}
    .dbcgTabs button,.dbcgSeg button{position:relative!important;overflow:hidden!important;min-height:44px!important;padding:10px 8px!important;font-size:14px!important;border-radius:14px!important;color:#334155!important;font-weight:900!important;letter-spacing:.1px!important;transition:transform .16s ease,box-shadow .16s ease,filter .16s ease!important}
    .dbcgTabs button:active,.dbcgSeg button:active,#dbcgSwap:active,.dbcgGo:active{transform:translateY(1px) scale(.985)!important}
    .dbcgTabs button.on{background:linear-gradient(135deg,#135df8 0%,#425df5 45%,#7c3aed 100%)!important;color:#fff!important;box-shadow:0 11px 24px rgba(79,70,229,.32),inset 0 1px 0 rgba(255,255,255,.28)!important;border:1px solid rgba(255,255,255,.22)!important}
    .dbcgTabs button.on:before,.dbcgGo:before{content:'';position:absolute;top:-55%;left:-30%;width:36%;height:210%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.36),transparent);transform:rotate(18deg);pointer-events:none}
    .dbcgTabs button.on:hover:before,.dbcgGo:hover:before{left:110%;transition:left .65s ease}
    .dbcgSeg button.on{background:linear-gradient(180deg,#ffffff,#f5f8ff)!important;color:#2548da!important;box-shadow:0 8px 19px rgba(37,99,235,.14),inset 0 1px 0 #fff!important;border:1px solid #dbe5ff!important}
    .dbcgField{margin:8px 0!important}
    .dbcgField input,.dbcgField select{min-height:51px!important;padding:12px 14px!important;border-radius:17px!important;font-size:15px!important;background:linear-gradient(180deg,#fff,#fbfdff)!important;border:1px solid #d9e4f4!important;box-shadow:0 6px 16px rgba(37,99,235,.07),inset 0 1px 0 rgba(255,255,255,.95)!important}
    .dbcgField input:focus,.dbcgField select:focus{border-color:#6676ff!important;box-shadow:0 0 0 4px rgba(99,102,241,.11),0 9px 22px rgba(37,99,235,.10)!important}
    #dbcgP{border-left:5px solid #20c77a!important}
    #dbcgD{border-left:5px solid #ff5b76!important}
    .dbcgTools{display:flex!important;justify-content:flex-end!important;margin:-4px 0 4px!important;min-height:0!important}
    #dbcgGps{display:none!important}
    #dbcgSwap{position:relative!important;overflow:hidden!important;width:46px!important;height:40px!important;min-height:40px!important;padding:0!important;border-radius:999px!important;font-size:20px!important;background:linear-gradient(145deg,#ffffff,#e8efff)!important;border:1px solid #ccd9ff!important;color:#315efb!important;box-shadow:0 8px 18px rgba(49,94,251,.16),inset 0 1px 0 #fff!important;font-weight:900!important}
    #dbcgSwap:hover{filter:brightness(1.03)!important;box-shadow:0 10px 22px rgba(49,94,251,.20),inset 0 1px 0 #fff!important}
    #dbcgForLabel{font-size:12px!important;font-weight:900!important;color:#64748b!important;margin:9px 2px -1px!important;letter-spacing:.42px!important;text-transform:uppercase!important}
    .dbcgGo{position:relative!important;overflow:hidden!important;min-height:55px!important;margin-top:11px!important;border-radius:19px!important;background:linear-gradient(135deg,#0e5cf7 0%,#3f5df6 43%,#6d43ea 74%,#8b3cf0 100%)!important;border:1px solid rgba(255,255,255,.18)!important;box-shadow:0 17px 36px rgba(79,70,229,.34),inset 0 1px 0 rgba(255,255,255,.30),inset 0 -1px 0 rgba(51,31,126,.20)!important;font-size:15.5px!important;font-weight:950!important;letter-spacing:.15px!important;text-shadow:0 1px 1px rgba(30,41,59,.18)!important}
    .dbcgGo:hover{filter:saturate(1.08) brightness(1.03)!important;box-shadow:0 20px 42px rgba(79,70,229,.38),inset 0 1px 0 rgba(255,255,255,.34),inset 0 -1px 0 rgba(51,31,126,.20)!important}
    .dbcgGo:after{content:'  →';font-weight:950}
    .dbcgProvider{display:none!important}
    @media(max-width:600px){.dbcgMap{height:218px!important;border-radius:23px!important}.dbcgCard{margin:-25px 6px 0!important;padding:12px!important;border-radius:25px!important}.dbcgTabs button,.dbcgSeg button{font-size:13px!important;min-height:43px!important}.dbcgGo{position:sticky!important;bottom:10px!important;z-index:30!important;min-height:54px!important}}
  `;
  if(!s.parentNode)document.head.appendChild(s);
}
c.open=function(){const r=originalOpen.apply(this,arguments);requestAnimationFrame(compact);setTimeout(compact,120);return r};
c.__compactV6=true;
})();