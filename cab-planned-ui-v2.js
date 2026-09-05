(function(){
'use strict';
const V='20260905-selected-realmap-v6';
let api=null,loading=null;
function bind(a){
 if(!a||typeof a.open!=='function')return;
 api=a;
 const guard=name=>{try{Object.defineProperty(window,name,{configurable:true,enumerable:true,get(){return api},set(v){if(v===api)api=v}})}catch(e){try{window[name]=api}catch(_){}}};
 guard('DBEST_CAB_GOOGLE');guard('DBEST_CAB_MAPPLS_RENTAL');
 try{Object.defineProperty(window,'openRidePlatform',{configurable:true,enumerable:true,get(){return api.open},set(v){}})}catch(e){window.openRidePlatform=api.open}
 window.DBEST_CAB_SELECTED_UI=api;window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V6';
}
function ensure(){
 if(window.DBEST_CAB_SELECTED_UI?.version===V){bind(window.DBEST_CAB_SELECTED_UI);return Promise.resolve(window.DBEST_CAB_SELECTED_UI)}
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const old=document.getElementById('dbest-selected-cab-v6-script');if(old)old.remove();const s=document.createElement('script');s.id='dbest-selected-cab-v6-script';s.src='/cab-selected-ui-v3.js?v='+V+'&t='+Date.now();s.async=false;s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a?.version===V){bind(a);resolve(a)}else reject(new Error('selected cab v6 unavailable'))};s.onerror=reject;document.body.appendChild(s)}).catch(e=>{loading=null;console.warn('DBest selected cab loader',e);throw e});return loading;
}
ensure().catch(()=>{});
const t=setInterval(()=>{if(api)bind(api);else ensure().catch(()=>{})},200);setTimeout(()=>{clearInterval(t);setInterval(()=>api&&bind(api),1800)},22000);
addEventListener('pageshow',()=>api&&bind(api));document.addEventListener('visibilitychange',()=>{if(!document.hidden)api&&bind(api)});
window.DBEST_CAB_PLANNED_UI={version:V,ensure};
})();