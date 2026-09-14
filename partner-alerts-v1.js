(function(){
'use strict';
function load(src,attr){return new Promise((resolve,reject)=>{const old=document.querySelector('script['+attr+']');if(old)return resolve();const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');s.onload=resolve;s.onerror=reject;(document.head||document.documentElement).appendChild(s)})}
load('/partner-alerts-core-v1.js?v=20260914-vaahak-actions-v1','data-dbest-partner-alerts-core').then(()=>{if(/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return load('/vaahak-compact-actions-v1.js?v=20260914-vaahak-activity-v1','data-dbest-vaahak-compact-actions')}).catch(e=>console.warn('DBest partner alerts loader',e));
})();
