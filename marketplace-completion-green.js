(function(){
'use strict';
function paint(){document.querySelectorAll('.ownerPanelCard,.orderStatusCard,#dbestThreePortalTracking').forEach(card=>{if(!/Delivered\s*\/\s*Completed/i.test(String(card.textContent||'')))return;card.querySelectorAll('span').forEach(s=>{if(String(s.textContent||'').trim()==='Delivered'){s.style.background='#e5f7ec';s.style.color='#17633f'}})})}
const mo=new MutationObserver(()=>paint());
function start(){paint();mo.observe(document.body,{subtree:true,childList:true,characterData:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();