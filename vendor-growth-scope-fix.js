(function(){
'use strict';
const VERSION='1.0.0';
function directVendor(){const p=location.pathname.toLowerCase().replace(/\/$/,'');if(!(p==='/vendor'||p.endsWith('/vendor.html')))return false;const d=document.getElementById('dash');return !!d&&!d.classList.contains('hidden')}
function integratedVendor(){let id='';try{id=String(window.vendorSession?.vendorId||'')}catch(_){}if(!id)return false;return !!(document.getElementById('dbestMultiCatalogCard')||document.getElementById('dbestLiveVendorOrders')||[...document.querySelectorAll('.sectionContent h2,.sectionContent h3')].some(x=>/submit new catalogue item|vendor dashboard|marketplace vendor/i.test(String(x.textContent||''))))}
function allowed(){return directVendor()||integratedVendor()}
function purge(){const card=document.getElementById('dbestVendorGrowthCard');if(card&&!allowed())card.remove()}
function guardApi(){const api=window.DBEST_VENDOR_GROWTH;if(!api||api.__scopeGuarded)return;api.__scopeGuarded=true;if(typeof api.refreshVendorGrowth==='function'){const old=api.refreshVendorGrowth;api.refreshVendorGrowth=async function(){if(!allowed()){purge();return null}return old.apply(this,arguments)}}}
function run(){purge();guardApi()}
[0,100,300,700,1200,2500,5000,9000,15000].forEach(ms=>setTimeout(run,ms));
window.addEventListener('focus',()=>setTimeout(run,20));
window.addEventListener('popstate',()=>setTimeout(run,20));
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestVendorScopeTimer);window.__dbestVendorScopeTimer=setTimeout(run,25)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
window.DBEST_VENDOR_GROWTH_SCOPE={version:VERSION,allowed,run};
})();