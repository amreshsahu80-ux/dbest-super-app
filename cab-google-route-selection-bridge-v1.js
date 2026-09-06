(function(){
'use strict';
if(window.DBEST_GOOGLE_PRIMARY_BRIDGE)return;
const V='20260906-google-primary-selected-cab-v2';
let lastDirections=null,patchedDirections=false;
const getCfg=()=>window.DBEST_RUNTIME_CONFIG||{};
const googleKey=()=>String(getCfg().googleMapsApiKey||'').trim();
const googleReady=()=>!!(window.google&&window.google.maps&&window.google.maps.DirectionsService);
function selectedCabCaller(){try{return String(new Error().stack||'').includes('cab-planned-ui-v2.js')}catch(e){return false}}
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
function paintSearchMap(){
  if(!googleReady())return;
  const el=document.getElementById('cab13SearchMap');
  if(!el||el.dataset.dbestGoogleMap==='1')return;
  try{
    el.dataset.ready='1';el.dataset.dbestGoogleMap='1';el.innerHTML='';
    const map=new google.maps.Map(el,{center:{lat:22.5937,lng:78.9629},zoom:5,streetViewControl:false,mapTypeControl:false,fullscreenControl:false});
    window.DBEST_CAB_GOOGLE_SEARCH_MAP=map;
    if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{
      const pos={lat:Number(p.coords.latitude),lng:Number(p.coords.longitude)};
      map.setCenter(pos);map.setZoom(15);
      try{new google.maps.Marker({map,position:pos})}catch(e){}
    },()=>{}, {enableHighAccuracy:true,timeout:7000,maximumAge:30000});
  }catch(e){console.warn('DBest Google pickup map warning',e)}
}
function paintRouteMap(){
  if(!googleReady())return;
  const el=document.getElementById('cab13Map');
  if(!el||el.dataset.dbestGoogleMap==='1')return;
  try{
    el.dataset.dbestGoogleMap='1';el.innerHTML='';
    const map=new google.maps.Map(el,{center:{lat:22.5937,lng:78.9629},zoom:5,streetViewControl:false,mapTypeControl:false,fullscreenControl:false});
    window.DBEST_CAB_GOOGLE_ROUTE_MAP=map;
    if(lastDirections){
      const renderer=new google.maps.DirectionsRenderer({map,preserveViewport:false,polylineOptions:{strokeColor:'#00bde8',strokeWeight:7,strokeOpacity:1}});
      renderer.setDirections(lastDirections);
      window.DBEST_CAB_GOOGLE_DIRECTIONS_RENDERER=renderer;
    }else if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(p=>{
        const pos={lat:Number(p.coords.latitude),lng:Number(p.coords.longitude)};
        map.setCenter(pos);map.setZoom(14);
        try{new google.maps.Marker({map,position:pos})}catch(e){}
      },()=>{}, {enableHighAccuracy:true,timeout:6000,maximumAge:30000});
    }
  }catch(e){console.warn('DBest Google route map warning',e)}
}
function refreshMaps(){paintSearchMap();paintRouteMap()}
function patchDirections(){
  if(patchedDirections||!googleReady())return;
  const proto=google.maps.DirectionsService&&google.maps.DirectionsService.prototype;
  if(!proto||typeof proto.route!=='function')return;
  const original=proto.route;
  proto.route=function(request,callback){
    if(typeof callback==='function'){
      return original.call(this,request,(res,status)=>{
        try{if(status==='OK'&&res&&res.routes&&res.routes[0]){lastDirections=res;setTimeout(paintRouteMap,350);setTimeout(paintRouteMap,900)}}catch(e){}
        return callback(res,status);
      });
    }
    const out=original.call(this,request);
    if(out&&typeof out.then==='function')return out.then(res=>{try{if(res&&res.routes&&res.routes[0]){lastDirections=res;setTimeout(paintRouteMap,350)}}catch(e){}return res});
    return out;
  };
  patchedDirections=true;
}
function ensureGoogle(){
  installConfigProxy();
  const key=googleKey();
  if(!key)return Promise.resolve(false);
  if(googleReady()){patchDirections();refreshMaps();return Promise.resolve(true)}
  return new Promise(resolve=>{
    const existing=Array.from(document.scripts||[]).find(s=>String(s.src||'').includes('maps.googleapis.com/maps/api/js'));
    const done=()=>{installConfigProxy();patchDirections();refreshMaps();resolve(googleReady())};
    if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>resolve(false),{once:true});setTimeout(done,2200);return}
    const s=document.createElement('script');
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly';
    s.async=true;s.defer=true;s.onload=done;s.onerror=()=>resolve(false);
    (document.head||document.documentElement).appendChild(s);
    setTimeout(done,3200);
  });
}
function scheduleRefresh(){setTimeout(refreshMaps,250);setTimeout(refreshMaps,800);setTimeout(refreshMaps,1600)}
document.addEventListener('click',e=>{
  scheduleRefresh();
  if(e.target&&e.target.closest&&e.target.closest('#cab6Gps')&&window.DBEST_CAB_GOOGLE_SEARCH_MAP&&navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=>{const pos={lat:Number(p.coords.latitude),lng:Number(p.coords.longitude)};window.DBEST_CAB_GOOGLE_SEARCH_MAP.setCenter(pos);window.DBEST_CAB_GOOGLE_SEARCH_MAP.setZoom(15)},()=>{}, {enableHighAccuracy:true,timeout:7000,maximumAge:30000});
  }
},true);
window.addEventListener('pageshow',scheduleRefresh);
window.addEventListener('load',()=>ensureGoogle(),{once:true});
ensureGoogle();
window.DBEST_CAB_PRIMARY_ROUTER='GOOGLE';
window.DBEST_GOOGLE_PRIMARY_BRIDGE={version:V,ensureGoogle,refreshMaps,status:()=>({primary:'Google Maps',googleConfigured:!!googleKey(),googleReady:googleReady(),visualMap:'Google Maps when available',fallback:'Mappls / OSM'})};
})();