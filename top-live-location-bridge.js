(function(){
'use strict';
const VERSION='1.1.0';
const CACHE_KEY='dbest_top_live_location_v1';
const MAX_CACHE_MS=20*60*1000;
let busy=false,lastRequestAt=0;
function bar(){return document.querySelector('.top .w')}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function setLabel(label,state){
  const el=bar();if(!el)return;
  const place=clean(label)||'India';
  el.innerHTML='📍 <span id="dbestLiveTopLocation"></span> • <span id="secure">Secure DBest Platform</span>';
  const p=el.querySelector('#dbestLiveTopLocation');if(p)p.textContent=place;
  el.dataset.locationState=state||'';
  el.title='Tap to refresh your current location';
  el.style.cursor='pointer';
}
function cached(){try{const x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return x&&x.label&&x.at?x:null}catch(e){return null}}
function saveCache(label,lat,lng){try{localStorage.setItem(CACHE_KEY,JSON.stringify({label,lat,lng,at:Date.now()}))}catch(e){}}
function publish(label,lat,lng,accuracy,state){window.DBEST_TOP_LIVE_LOCATION={...(window.DBEST_TOP_LIVE_LOCATION||{}),version:VERSION,label:label||'Your current area',lat:Number(lat),lng:Number(lng),accuracy:Number(accuracy||0),state:state||'live',updatedAt:new Date().toISOString(),refresh:()=>requestLocation(true)};try{window.dispatchEvent(new CustomEvent('dbest-location-changed',{detail:{label:label||'',lat:Number(lat),lng:Number(lng),accuracy:Number(accuracy||0),state:state||'live'}}))}catch(e){}}
function bestPlace(d){
  if(!d||typeof d!=='object')return '';
  const locality=clean(d.locality||d.city||d.localityInfo?.administrative?.[0]?.name||'');
  const city=clean(d.city||'');
  const state=clean(d.principalSubdivision||'');
  const district=clean(d.localityInfo?.administrative?.find?.(x=>/district/i.test(String(x.description||x.adminLevel||'')))?.name||'');
  let first=locality||city||district;
  if(first&&state&&first.toLowerCase()!==state.toLowerCase())return first+', '+state;
  return first||state||'India';
}
async function reverse(lat,lng){
  try{
    const u='https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lng)+'&localityLanguage=en';
    const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('reverse_failed');
    return bestPlace(await r.json());
  }catch(e){
    try{
      if(typeof window.reverseGeoLabel==='function'){
        const s=clean(await window.reverseGeoLabel(lat,lng));
        const a=s.split(',').map(clean).filter(Boolean).filter(x=>!/^[0-9]{5,6}$/.test(x)&&!/^India$/i.test(x));
        if(a.length>=2)return a[0]+', '+a[1];
        if(a.length)return a[0];
      }
    }catch(_e){}
    return '';
  }
}
async function requestLocation(force){
  if(busy||!navigator.geolocation)return;
  if(!force&&Date.now()-lastRequestAt<60000)return;
  busy=true;lastRequestAt=Date.now();
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const lat=Number(pos.coords.latitude),lng=Number(pos.coords.longitude);
      const label=await reverse(lat,lng);
      if(label){setLabel(label,'live');saveCache(label,lat,lng)}else{setLabel('Your current area','coords-only');saveCache('Your current area',lat,lng)}
      publish(label||'Your current area',lat,lng,pos.coords.accuracy,'live');
    }finally{busy=false}
  },err=>{
    busy=false;
    const c=cached();if(c&&Date.now()-c.at<24*60*60*1000){setLabel(c.label,'cached');publish(c.label,c.lat,c.lng,0,'cached')}else setLabel('India','unavailable');
    window.DBEST_TOP_LIVE_LOCATION={...(window.DBEST_TOP_LIVE_LOCATION||{}),version:VERSION,error:err?.code||'location_unavailable',refresh:()=>requestLocation(true)};
  },{enableHighAccuracy:false,timeout:9000,maximumAge:5*60*1000});
}
function init(){
  const el=bar();if(!el)return;
  const c=cached();
  if(c&&Date.now()-c.at<MAX_CACHE_MS){setLabel(c.label,'cached');publish(c.label,c.lat,c.lng,0,'cached')}
  else setLabel('India','loading');
  el.onclick=()=>requestLocation(true);
  requestLocation(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80),{once:true});else setTimeout(init,80);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){const c=cached();if(!c||Date.now()-c.at>MAX_CACHE_MS)requestLocation(false)}});
window.DBEST_TOP_LIVE_LOCATION={version:VERSION,refresh:()=>requestLocation(true)};
})();