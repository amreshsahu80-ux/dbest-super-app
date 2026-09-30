(function(){
'use strict';
const VERSION='1.3.0-member-isolation';
const VTK='dbest_vendor_live_token';
let mounting=false,lastMountAt=0;
function hasVendorToken(){try{return !!localStorage.getItem(VTK)}catch(_){return false}}
function directVendor(){const p=location.pathname.toLowerCase().replace(/\/$/,'');if(!(p==='/vendor'||p.endsWith('/vendor.html')))return false;const d=document.getElementById('dash');return !!d&&!d.classList.contains('hidden')&&hasVendorToken()}
function memberScreen(){try{const s=window.DBEST_SESSION_COMPAT?.read?.()||window.session||{};if(['starter','guest','promoter','prime','leader'].includes(String(s.role||'').toLowerCase())&&s.id)return true}catch(_){}return !!document.querySelector('.classicDash')||[...document.querySelectorAll('.sectionContent')].some(x=>/My Account|My Dashboard|Member Business Dashboard|Membership and KYC details/i.test(String(x.innerText||'')))}
function integratedVendor(){
  if(memberScreen()||!hasVendorToken())return false;
  let id='';
  try{if(typeof vendorSession!=='undefined'&&vendorSession)id=String(vendorSession.vendorId||'');else id=String(window.vendorSession?.vendorId||'')}catch(_){}
  if(!id)return false;
  const strong=!!(document.getElementById('dbestLiveVendorOrders')||document.getElementById('dbestMultiCatalogCard'));
  const heading=[...document.querySelectorAll('.sectionContent h1,.sectionContent h2,.sectionContent h3')].some(x=>/vendor dashboard|catalogue proposals|submit new catalogue item|marketplace vendor/i.test(String(x.textContent||'')));
  return strong||heading;
}
function allowed(){return directVendor()||integratedVendor()}
function purge(){const card=document.getElementById('dbestVendorGrowthCard');if(card&&!allowed())card.remove()}
function guardApi(){const api=window.DBEST_VENDOR_GROWTH;if(!api||api.__scopeGuarded)return;api.__scopeGuarded=true;if(typeof api.refreshVendorGrowth==='function'){const old=api.refreshVendorGrowth;api.refreshVendorGrowth=async function(){if(!allowed()){purge();return null}return old.apply(this,arguments)}}}
async function mount(){
  purge();guardApi();
  if(!allowed()||document.getElementById('dbestVendorGrowthCard')||mounting||Date.now()-lastMountAt<1500)return;
  const api=window.DBEST_VENDOR_GROWTH;if(!api||typeof api.refreshVendorGrowth!=='function')return;
  mounting=true;lastMountAt=Date.now();
  try{await api.refreshVendorGrowth()}catch(e){console.warn('DBest Vendor Promotion Center mount',e)}finally{setTimeout(()=>{mounting=false},250)}
}
function hookDashboard(){
  const fn=window.vendorDashboard;if(typeof fn!=='function'||fn.__dbestVendorGrowthMountWrapped)return;
  const wrapped=function(){const r=fn.apply(this,arguments);setTimeout(mount,120);return r};
  wrapped.__dbestVendorGrowthMountWrapped=true;wrapped.__dbestOriginal=fn;window.vendorDashboard=wrapped;
}
function run(){purge();guardApi();hookDashboard();if(allowed())mount()}
[0,100,300,700,1200,2500,5000,9000,15000].forEach(ms=>setTimeout(run,ms));
window.addEventListener('focus',()=>setTimeout(run,20));
window.addEventListener('popstate',()=>setTimeout(run,20));
document.addEventListener('click',()=>setTimeout(run,80),true);
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestVendorScopeTimer);window.__dbestVendorScopeTimer=setTimeout(run,40)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.DBEST_VENDOR_GROWTH_SCOPE={version:VERSION,allowed,run,mount};
})();