(function(){
'use strict';
function paint(){document.querySelectorAll('.ownerPanelCard,.orderStatusCard,#dbestThreePortalTracking').forEach(card=>{if(!/Delivered\s*\/\s*Completed/i.test(String(card.textContent||'')))return;card.querySelectorAll('span').forEach(s=>{if(String(s.textContent||'').trim()==='Delivered'){s.style.background='#e5f7ec';s.style.color='#17633f'}})})}
const mo=new MutationObserver(()=>paint());
function start(){paint();mo.observe(document.body,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(function(){
  const V='20260827-1340-vendor-csv-bulk';
  const load=()=>{if(document.querySelector('script[data-dbest-vendor-csv-bulk]'))return;const s=document.createElement('script');s.src='./vendor-catalog-csv-bulk.js?v='+V;s.setAttribute('data-dbest-vendor-csv-bulk','1');(document.body||document.documentElement).appendChild(s)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();