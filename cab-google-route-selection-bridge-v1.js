(function(){
'use strict';
const V='20260906-google-primary-selected-cab-v3-stable-map';
if(window.DBEST_GOOGLE_PRIMARY_BRIDGE?.version===V)return;
let lastDirections=null,directionsRevision=0,lastRequestKey='',patchedDirections=false,googleLoadPromise=null,refreshTimer=null;
let searchState={el:null,map:null,marker:null,gpsRequested:false};
let routeState={el:null,map:null,renderer:null,marker:null,gpsRequested:false,appliedRevision:-1};
const getCfg=()=>window.DBEST_RUNTIME_CONFIG||{};
const googleKey=()=>String(getCfg().googleMapsApiKey||'').trim();
const googleReady=()=>!!(window.google&&window.google.maps&&window.google.maps.Map&&window.google.maps.DirectionsService);
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
function triggerResize(map){try{if(map&&google.maps.event)google.maps.event.trigger(map,'resize')}catch(e){}}
function gpsPosition(timeout=6500){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:Number(p.coords.latitude),lng:Number(p.coords.longitude)}),()=>resolve(null),{enableHighAccuracy:true,timeout,maximumAge:30000});
  });
}
async function updateSearchGps(){
  const state=searchState;if(!state.map)return;
  const pos=await gpsPosition(7000);if(!pos||state!==searchState||!state.map)return;
  try{state.map.setCenter(pos);state.map.setZoom(15);if(state.marker)state.marker.setPosition(pos);else state.marker=new google.maps.Marker({map:state.map,position:pos})}catch(e){}
}
function paintSearchMap(){
  if(!googleReady())return;
  const el=document.getElementById('cab13SearchMap');if(!el)return;
  try{
    if(searchState.el!==el||!searchState.map){
      searchState={el,map:null,marker:null,gpsRequested:false};
      el.dataset.ready='1';el.dataset.dbestGoogleMap='1';el.innerHTML='';
      searchState.map=new google.maps.Map(el,{center:{lat:22.5937,lng:78.9629},zoom:5,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'greedy'});
      window.DBEST_CAB_GOOGLE_SEARCH_MAP=searchState.map;
    }else triggerResize(searchState.map);
    if(!searchState.gpsRequested){searchState.gpsRequested=true;updateSearchGps()}
  }catch(e){console.warn('DBest Google pickup map warning',e)}
}
function ensureRouteRenderer(){
  if(!routeState.map)return null;
  if(!routeState.renderer){
    routeState.renderer=new google.maps.DirectionsRenderer({map:routeState.map,preserveViewport:false,suppressMarkers:false,polylineOptions:{strokeColor:'#00bde8',strokeWeight:7,strokeOpacity:1}});
    window.DBEST_CAB_GOOGLE_DIRECTIONS_RENDERER=routeState.renderer;
  }
  return routeState.renderer;
}
async function updateRouteGps(){
  const state=routeState;if(!state.map||lastDirections)return;
  const pos=await gpsPosition(6000);if(!pos||state!==routeState||!state.map||lastDirections)return;
  try{state.map.setCenter(pos);state.map.setZoom(14);if(state.marker)state.marker.setPosition(pos);else state.marker=new google.maps.Marker({map:state.map,position:pos})}catch(e){}
}
function paintRouteMap(){
  if(!googleReady())return;
  const el=document.getElementById('cab13Map');if(!el)return;
  try{
    if(routeState.el!==el||!routeState.map){
      routeState={el,map:null,renderer:null,marker:null,gpsRequested:false,appliedRevision:-1};
      el.dataset.dbestGoogleMap='1';el.dataset.dbestGoogleFallback='';el.innerHTML='';
      routeState.map=new google.maps.Map(el,{center:{lat:22.5937,lng:78.9629},zoom:5,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'greedy'});
      window.DBEST_CAB_GOOGLE_ROUTE_MAP=routeState.map;
      ensureRouteRenderer();
    }else{
      triggerResize(routeState.map);
      ensureRouteRenderer();
    }
    if(lastDirections&&routeState.appliedRevision!==directionsRevision){
      try{routeState.marker?.setMap(null)}catch(e){}routeState.marker=null;
      routeState.renderer.setDirections(lastDirections);
      routeState.appliedRevision=directionsRevision;
    }else if(!lastDirections&&!routeState.gpsRequested){routeState.gpsRequested=true;updateRouteGps()}
  }catch(e){console.warn('DBest Google route map warning',e)}
}
function refreshMaps(){paintSearchMap();paintRouteMap()}
function requestPart(v){
  if(!v)return'';
  try{if(typeof v==='string')return v;if(typeof v.lat==='function'&&typeof v.lng==='function')return v.lat().toFixed(6)+','+v.lng().toFixed(6);if(Number.isFinite(Number(v.lat))&&Number.isFinite(Number(v.lng)))return Number(v.lat).toFixed(6)+','+Number(v.lng).toFixed(6);if(v.placeId)return String(v.placeId)}catch(e){}
  return String(v||'');
}
function routeRequestKey(r){return requestPart(r?.origin)+'>'+requestPart(r?.destination)+'|'+String(r?.travelMode||'')}
function routeStarting(request){
  const key=routeRequestKey(request);
  if(key&&key!==lastRequestKey){
    lastRequestKey=key;lastDirections=null;directionsRevision++;
    try{routeState.renderer?.set('directions',null)}catch(e){}
    routeState.appliedRevision=-1;
  }
}
function routeSucceeded(res){
  if(!res?.routes?.[0])return;
  lastDirections=res;directionsRevision++;
  setTimeout(paintRouteMap,60);setTimeout(paintRouteMap,320);setTimeout(paintRouteMap,850);
}
function patchDirections(){
  if(patchedDirections||!googleReady())return;
  const proto=google.maps.DirectionsService?.prototype;if(!proto||typeof proto.route!=='function')return;
  const original=proto.route;
  proto.route=function(request,callback){
    routeStarting(request);
    if(typeof callback==='function'){
      return original.call(this,request,(res,status)=>{try{if(status==='OK')routeSucceeded(res)}catch(e){}return callback(res,status)});
    }
    const out=original.call(this,request);
    if(out&&typeof out.then==='function')return out.then(res=>{try{routeSucceeded(res)}catch(e){}return res});
    return out;
  };
  patchedDirections=true;
}
function ensureGoogle(){
  installConfigProxy();const key=googleKey();if(!key)return Promise.resolve(false);
  if(googleReady()){patchDirections();refreshMaps();return Promise.resolve(true)}
  if(googleLoadPromise)return googleLoadPromise;
  googleLoadPromise=new Promise(resolve=>{
    const existing=Array.from(document.scripts||[]).find(s=>String(s.src||'').includes('maps.googleapis.com/maps/api/js'));
    let settled=false;const done=()=>{if(settled)return;settled=true;installConfigProxy();patchDirections();refreshMaps();resolve(googleReady())};
    if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',done,{once:true});setTimeout(done,3500);return}
    const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly';s.async=true;s.defer=true;s.onload=done;s.onerror=done;(document.head||document.documentElement).appendChild(s);setTimeout(done,4500);
  }).finally(()=>{googleLoadPromise=null});
  return googleLoadPromise;
}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{ensureGoogle().then(ok=>{if(ok)refreshMaps()})},80)}
function observeCabDom(){
  const mo=new MutationObserver(muts=>{for(const m of muts){if(m.addedNodes?.length||m.removedNodes?.length){scheduleRefresh();break}}});
  const start=()=>{if(document.body)mo.observe(document.body,{childList:true,subtree:true})};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
}
document.addEventListener('click',e=>{
  scheduleRefresh();
  if(e.target?.closest?.('#cab6Gps'))setTimeout(updateSearchGps,80);
},true);
window.addEventListener('pageshow',scheduleRefresh);
window.addEventListener('resize',scheduleRefresh,{passive:true});
window.addEventListener('orientationchange',scheduleRefresh,{passive:true});
observeCabDom();
ensureGoogle();
window.DBEST_CAB_PRIMARY_ROUTER='GOOGLE';
window.DBEST_GOOGLE_PRIMARY_BRIDGE={version:V,ensureGoogle,refreshMaps,status:()=>({primary:'Google Maps',googleConfigured:!!googleKey(),googleReady:googleReady(),visualMap:'Google Maps',routeRefresh:'stable',fallback:'Mappls / OSM'})};
})();