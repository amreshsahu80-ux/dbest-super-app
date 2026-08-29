(function(){
'use strict';
const BUILD='20260829-1455-cab-text-lite';
let installed=false;
function installStyle(){
  if(document.getElementById('dbestCabTextLiteStyle'))return;
  const s=document.createElement('style');
  s.id='dbestCabTextLiteStyle';
  s.textContent=`
    .cabxHero,.cabxNote{display:none!important}
    .cabx{padding-bottom:24px!important}
    .cabxMap{margin-top:4px!important;height:340px!important;border-radius:22px!important;box-shadow:0 12px 28px rgba(20,50,100,.10)!important}
    .cabxPanel{margin:-18px 12px 0!important;padding:12px!important;border-radius:22px!important}
    .cabxField{min-height:62px!important;border-radius:16px!important;padding:5px 8px 5px 12px!important;background:#fff!important;box-shadow:0 5px 14px rgba(24,54,105,.05)!important}
    .cabxField input{font-size:15px!important;font-weight:750!important;padding:12px 3px!important}
    .cabxClear{width:32px!important;height:32px!important;border-radius:10px!important;background:#f6f8fc!important}
    .cabxSwap{border-radius:15px!important;background:#f2f6ff!important;min-width:44px!important}
    .cabxRecent{padding:8px 0 0!important;gap:6px!important}
    .cabxRecent .cabxChip{padding:7px 10px!important;font-size:10px!important;background:#f6f9ff!important}
    .cabxSchedule{margin-top:7px!important;gap:6px!important}
    .cabxSchedule button{padding:8px 12px!important;font-size:10.5px!important}
    .cabxActions{display:flex!important;flex-direction:column!important;gap:8px!important;margin-top:9px!important}
    #cabxFind{order:1!important;width:100%!important;min-height:56px!important;border-radius:17px!important;background:linear-gradient(135deg,#0868ff,#2750f4)!important;color:#fff!important;font-size:15px!important;font-weight:950!important;box-shadow:0 10px 22px rgba(23,92,255,.22)!important}
    #cabxGps{display:none!important}
    .cabxStats{margin-top:9px!important;gap:7px!important}
    .cabxStat{padding:9px!important;border-radius:13px!important}
    .cabxStat small{font-size:8.5px!important}.cabxStat b{font-size:13px!important}
    .cabxVehicles{margin-top:12px!important}.cabxHead small{display:none!important}
    @media(max-width:700px){
      .sectionContent{padding-left:9px!important;padding-right:9px!important}
      .cabxMap{height:300px!important;border-radius:20px!important}
      .cabxPanel{margin:-15px 7px 0!important;padding:10px!important;border-radius:20px!important}
      .cabxField{min-height:58px!important;border-radius:15px!important}
      .cabxField input{font-size:14px!important}
    }
    @media(max-width:390px){.cabxMap{height:275px!important}.cabxField{min-height:55px!important}}
  `;
  document.head.appendChild(s);
}
function trimHeader(){
  document.querySelectorAll('small,div,span,p').forEach(el=>{
    if(el.children.length)return;
    const t=(el.textContent||'').trim();
    if(t==='Live route • Upfront fare • In-app Ride PIN')el.textContent='Ride • Rental';
  });
}
function trimButtons(){
  const find=document.getElementById('cabxFind');
  if(find)find.textContent='🚕 Continue → Choose Vehicle';
  const gpsChip=document.getElementById('cabxGpsChip');
  if(gpsChip)gpsChip.textContent='📍 Use Current Location';
}
function decorate(){
  if(!document.querySelector('.cabx'))return;
  installStyle();trimHeader();trimButtons();installed=true;
}
[0,80,180,350,700,1300,2200].forEach(ms=>setTimeout(decorate,ms));
const mo=new MutationObserver(()=>setTimeout(decorate,0));
mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_CAB_TEXT_LITE={build:BUILD,decorate};
})();