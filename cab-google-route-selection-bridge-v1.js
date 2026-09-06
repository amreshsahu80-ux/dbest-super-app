(function(){
'use strict';
if(window.DBEST_GOOGLE_PRIMARY_BRIDGE)return;
const V='20260906-google-primary-selected-cab-v1';
const getCfg=()=>window.DBEST_RUNTIME_CONFIG||{};
const googleKey=()=>String(getCfg().googleMapsApiKey||'').trim();
const googleReady=()=>!!(window.google&&window.google.maps&&window.google.maps.DirectionsService);
function selectedCabCaller(){
  try{return String(new Error().stack||'').includes('cab-planned-ui-v2.js')}catch(e){return false}
}
function installConfigProxy(){
  const current=window.DBEST_RUNTIME_CONFIG;
  if(!current||current.__dbestGooglePrimaryProxy)return;
  try{
    window.DBEST_RUNTIME_CONFIG=new Proxy(current,{
      get(target,prop,receiver){
        if(prop==='__dbestGooglePrimaryProxy')return true;
        if(prop==='mapplsStaticKey'&&googleReady()&&selectedCabCaller())return '';
        return Reflect.get(target,prop,receiver);
      }
    });
  }catch(e){console.warn('DBest Google primary config bridge warning',e)}
}
function ensureGoogle(){
  installConfigProxy();
  const key=googleKey();
  if(!key)return Promise.resolve(false);
  if(googleReady())return Promise.resolve(true);
  return new Promise(resolve=>{
    const existing=Array.from(document.scripts||[]).find(s=>String(s.src||'').includes('maps.googleapis.com/maps/api/js'));
    if(existing){
      const done=()=>{installConfigProxy();resolve(googleReady())};
      existing.addEventListener('load',done,{once:true});
      existing.addEventListener('error',()=>resolve(false),{once:true});
      setTimeout(done,2200);
      return;
    }
    const s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly';
    s.async=true;
    s.defer=true;
    s.onload=()=>{installConfigProxy();resolve(googleReady())};
    s.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(s);
    setTimeout(()=>resolve(googleReady()),3200);
  });
}
ensureGoogle();
window.addEventListener('load',()=>ensureGoogle(),{once:true});
window.DBEST_CAB_PRIMARY_ROUTER='GOOGLE';
window.DBEST_GOOGLE_PRIMARY_BRIDGE={version:V,ensureGoogle,status:()=>({primary:'Google Maps',googleConfigured:!!googleKey(),googleReady:googleReady(),fallback:'Mappls / OSM'})};
})();