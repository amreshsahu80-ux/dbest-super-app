(function(){'use strict';if(window.DBEST_RIDE_CONFIG_LIVE)return;
const VERSION='1.0.0',KEY='d2_ride_config';
const cfg=()=>window.DBEST_RUNTIME_CONFIG||{};
const endpoint=()=>String(cfg().supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/ride-config-live';
const headers=(owner=false)=>{const h={'apikey':cfg().supabasePublishableKey||'','Authorization':'Bearer '+(cfg().supabasePublishableKey||'')};if(owner){const t=sessionStorage.getItem('dbest_owner_session_token')||'';if(t)h['x-dbest-owner-token']=t;}return h};
let live=null;
async function load(){try{const r=await fetch(endpoint(),{headers:headers(),cache:'no-store'}),d=await r.json();if(!r.ok||!d.config)throw new Error(d.error||'ride_config_load_failed');live=d.config;localStorage.setItem(KEY,JSON.stringify(live));window.dispatchEvent(new CustomEvent('dbest:ride-config-updated',{detail:live}));return live}catch(e){console.warn('DBest live ride config fallback',e);try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}}}
async function publish(config){const r=await fetch(endpoint(),{method:'POST',headers:{...headers(true),'Content-Type':'application/json'},body:JSON.stringify({config})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'ride_config_publish_failed');live=d.config;localStorage.setItem(KEY,JSON.stringify(live));window.dispatchEvent(new CustomEvent('dbest:ride-config-updated',{detail:live}));return live}
function get(){return live}
window.DBEST_RIDE_CONFIG_LIVE={version:VERSION,load,publish,get};load();
function wrap(name){let tries=0,t=setInterval(()=>{tries++;const fn=window[name];if(typeof fn==='function'&&!fn.__dbestLiveRideConfig){const w=function(){const out=fn.apply(this,arguments);setTimeout(()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x)publish(x).catch(e=>console.error('Ride config publish failed',e))}catch(_){ }},50);return out};w.__dbestLiveRideConfig=true;window[name]=w;clearInterval(t)}if(tries>40)clearInterval(t)},250)}
['saveRideRules','saveRideVehicle','saveRoundTripRules'].forEach(wrap);
})();