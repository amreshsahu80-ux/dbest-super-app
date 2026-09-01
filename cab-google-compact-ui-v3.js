(function(){
'use strict';
const c=window.DBEST_CAB_GOOGLE;
if(!c||typeof c.open!=='function'||c.__compactV5)return;
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
  if(rental && ![...rental.options].some(o=>o.value==='12|120')){
    const o=document.createElement('option');o.value='12|120';o.textContent='12 Hours / 120 km';rental.appendChild(o);
  }

  const self=document.querySelector('[data-rider="self"]');
  const riderSeg=self&&self.parentElement;
  if(riderSeg && !by('dbcgForLabel')){
    const lab=document.createElement('div');lab.id='dbcgForLabel';lab.textContent='For';
    riderSeg.parentNode.insertBefore(lab,riderSeg);
  }

  [...document.querySelectorAll('*')].forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t==='Reliable map + route booking')el.style.display='none';
  });

  const s=document.getElementById('dbcg-compact-ui-v5')||document.createElement('style');
  s.id='dbcg-compact-ui-v5';
  s.textContent=`
    .dbcg{max-width:900px!important;padding:0 10px 36px!important;background:linear-gradient(180deg,#f8fbff 0,#ffffff 55%)!important}
    .dbcgMap{height:252px!important;border-radius:25px!important;box-shadow:0 18px 44px rgba(37,99,235,.18)!important;border:1px solid rgba(37,99,235,.13)!important}
    .dbcgCard{margin:-30px 10px 0!important;padding:15px!important;border-radius:27px!important;background:linear-gradient(180deg,rgba(255,255,255,.99),rgba(248,251,255,.99))!important;box-shadow:0 24px 56px rgba(37,99,235,.19)!important;border:1px solid rgba(255,255,255,.98)!important}
    .dbcgTabs,.dbcgSeg{margin:7px 0!important;padding:4px!important;border-radius:17px!important;background:linear-gradient(135deg,#eef4ff,#f6f3ff)!important;border:1px solid #e5ecfb!important}
    .dbcgTabs button,.dbcgSeg button{min-height:42px!important;padding:9px 6px!important;font-size:14px!important;border-radius:13px!important;color:#334155!important}
    .dbcgTabs button.on{background:linear-gradient(135deg,#0f5cf5,#5b4cf0)!important;color:#fff!important;box-shadow:0 9px 20px rgba(79,70,229,.27)!important}
    .dbcgSeg button.on{background:linear-gradient(135deg,#ffffff,#f8fbff)!important;color:#175cff!important;box-shadow:0 6px 16px rgba(37,99,235,.12)!important}
    .dbcgField{margin:8px 0!important}
    .dbcgField input,.dbcgField select{min-height:50px!important;padding:12px 14px!important;border-radius:16px!important;font-size:15px!important;background:#fff!important;border:1px solid #d9e4f4!important;box-shadow:0 5px 14px rgba(37,99,235,.06)!important}
    .dbcgField input:focus,.dbcgField select:focus{border-color:#6d7cff!important;box-shadow:0 0 0 4px rgba(79,70,229,.10),0 7px 18px rgba(37,99,235,.08)!important}
    #dbcgP{border-left:5px solid #22c55e!important}
    #dbcgD{border-left:5px solid #ff5a6f!important}
    .dbcgTools{display:flex!important;justify-content:flex-end!important;margin:-4px 0 3px!important;min-height:0!important}
    #dbcgGps{display:none!important}
    #dbcgSwap{width:44px!important;height:38px!important;min-height:38px!important;padding:0!important;border-radius:999px!important;font-size:19px!important;background:linear-gradient(135deg,#eaf2ff,#eeeaff)!important;border:1px solid #d6e2ff!important;color:#315efb!important;box-shadow:0 5px 12px rgba(49,94,251,.12)!important}
    #dbcgForLabel{font-size:12px!important;font-weight:900!important;color:#64748b!important;margin:8px 2px -2px!important;letter-spacing:.35px!important;text-transform:uppercase!important}
    .dbcgGo{min-height:53px!important;margin-top:10px!important;border-radius:18px!important;background:linear-gradient(135deg,#0f5cf5 0%,#315efb 45%,#7c3aed 100%)!important;box-shadow:0 14px 30px rgba(79,70,229,.30)!important;font-size:15px!important;letter-spacing:.1px!important}
    .dbcgGo:after{content:'  →';font-weight:900}
    .dbcgProvider{display:none!important}
    @media(max-width:600px){
      .dbcgMap{height:216px!important;border-radius:22px!important}
      .dbcgCard{margin:-24px 6px 0!important;padding:12px!important;border-radius:24px!important}
      .dbcgTabs button,.dbcgSeg button{font-size:13px!important}
      .dbcgGo{position:sticky!important;bottom:10px!important;z-index:30!important}
    }
  `;
  if(!s.parentNode)document.head.appendChild(s);
}
c.open=function(){const r=originalOpen.apply(this,arguments);requestAnimationFrame(compact);setTimeout(compact,120);return r};
c.__compactV5=true;
})();