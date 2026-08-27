(function(){
'use strict';
const VERSION='1.4.0',BUILD='20260827-1840-marketplace-stable-switching';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',API=BASE+'/functions/v1/marketplace-local-catalog-live';
const cache=window.DBEST_MARKETPLACE_TYPE_CACHE||{};window.DBEST_MARKETPLACE_TYPE_CACHE=cache;
const loading={},applied={};
function persist(){try{typeof save==='function'&&save()}catch(_){}}
function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))}
function marketplaceOverlay(){try{return document.querySelector('#m .sectionOverlay')}catch(_){return null}}
function marketplaceOpen(){try{return !!document.querySelector('#m .shopPage')}catch(_){return false}}
function captureMarketUi(){
 const ov=marketplaceOverlay(),input=document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('shopSearch')?document.activeElement:null;
 return {active:marketplaceOpen(),scrollTop:ov?ov.scrollTop:0,searchFocused:!!input,selectionStart:input&&Number.isFinite(input.selectionStart)?input.selectionStart:null,selectionEnd:input&&Number.isFinite(input.selectionEnd)?input.selectionEnd:null};
}
function restoreMarketUi(s){
 if(!s||!s.active)return;
 const restore=()=>{
  const ov=marketplaceOverlay();if(ov)ov.scrollTop=s.scrollTop||0;
  if(s.searchFocused){const inp=document.querySelector('#m .shopSearch');if(inp){try{inp.focus({preventScroll:true})}catch(_){try{inp.focus()}catch(__){}}try{if(s.selectionStart!==null)inp.setSelectionRange(s.selectionStart,s.selectionEnd??s.selectionStart)}catch(_){}}}
 };
 restore();if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{restore();requestAnimationFrame(restore)});setTimeout(restore,40);
}
function stableRender(fn){const ui=captureMarketUi();let out;try{out=fn()}finally{restoreMarketUi(ui)}return out}
function installMarketplaceLocationUiCleanup(){
 try{
  if(!document.getElementById('dbestMarketplaceGpsDiagHide')){
   const s=document.createElement('style');s.id='dbestMarketplaceGpsDiagHide';
   s.textContent='.shopPage #commerceGpsDiag,.shopPage .gpsDiag{display:none!important}';
   (document.head||document.documentElement).appendChild(s);
  }
 }catch(_){}
 cleanMarketplaceGpsDiagnostics();
}
function cleanMarketplaceGpsDiagnostics(){
 try{document.querySelectorAll('.shopPage #commerceGpsDiag').forEach(el=>el.remove())}catch(_){}
}
function customerLocation(){
 try{if(typeof commerceLocation!=='undefined'&&finite(commerceLocation?.lat)&&finite(commerceLocation?.lng))return {lat:Number(commerceLocation.lat),lng:Number(commerceLocation.lng),source:'marketplace'}}catch(_){}
 try{const x=window.DBEST_TOP_LIVE_LOCATION;if(finite(x?.lat)&&finite(x?.lng))return {lat:Number(x.lat),lng:Number(x.lng),source:'live'}}catch(_){}
 try{const x=JSON.parse(localStorage.getItem('dbest_top_live_location_v1')||'null');if(finite(x?.lat)&&finite(x?.lng))return {lat:Number(x.lat),lng:Number(x.lng),source:'cached'}}catch(_){}
 return null;
}
function locSig(type){if(String(type)==='digital')return 'digital';const l=customerLocation();return l?Number(l.lat).toFixed(4)+','+Number(l.lng).toFixed(4):'no-location'}
async function call(body={}){const h={'apikey':KEY,'Content-Type':'application/json'};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action:'public_catalog',...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'marketplace_local_catalog_error');return d}
function detail(p){const d=String(p.description||'').trim();let category='General',unit='';if(d.includes(' • ')){const a=d.split(' • ');category=String(a.shift()||'General').trim()||'General';unit=a.join(' • ').trim()}else if(d.includes('|')){const a=d.split('|');category=String(a.shift()||'General').trim()||'General';unit=a.join(' | ').trim()}else if(d)category=d.length<=40?d:'General';return {category,unit}}
function liveRow(p){const x=detail(p);return {id:p.id,type:String(p.market_type||'').trim().toLowerCase(),vendorId:p.vendor_id,name:p.name,category:x.category,unit:x.unit,description:p.description||'',price:Number(p.price||0),mrp:Number(p.mrp||p.base_price||p.price||0),stock:Number(p.stock||0),offer:Number(p.effective_offer_percent??p.offer_percent??0),active:p.active!==false,image:p.image_url||'',ownerApproved:true,approvalStatus:'Approved',liveBackend:true}}
function liveVendor(v){return {id:v.id,name:v.name,type:String(v.type||'').trim().toLowerCase(),city:v.city||'',active:true,ownerApproval:'Approved',liveBackend:true,canPrice:true,canStock:true,canOffer:true,distanceKm:v.distance_km==null?null:Number(v.distance_km),serviceRadiusKm:v.service_radius_km==null?null:Number(v.service_radius_km),agreement:{partnerSigned:true,ownerSigned:true,status:'Fully Signed'}}}
function applyType(type,bundle){if(!bundle||typeof commerceConfig==='undefined')return false;const ps=(bundle.products||[]).map(liveRow),vs=(bundle.vendors||[]).map(liveVendor);commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];commerceConfig.products=commerceConfig.products.filter(p=>String(p.type||'').toLowerCase()!==type);commerceConfig.vendors=commerceConfig.vendors.filter(v=>String(v.type||'').toLowerCase()!==type);commerceConfig.products.push(...ps);commerceConfig.vendors.push(...vs);const sig=locSig(type);cache[type]={products:bundle.products||[],vendors:bundle.vendors||[],locationSig:sig,serviceRadius:bundle.serviceRadius||null,at:Date.now()};applied[type]=sig;persist();return true}
function bodyFor(type){const l=customerLocation(),b={marketType:type};if(type!=='digital'&&l){b.customerLat=l.lat;b.customerLng=l.lng}return b}
async function ensureType(type,repaint=false){
 type=String(type||'').toLowerCase();if(!BASE||!KEY||!type||type==='medicine'||loading[type])return;
 const sig=locSig(type);if(cache[type]?.locationSig===sig){if(applied[type]!==sig)applyType(type,cache[type]);return}
 loading[type]=true;
 try{
  const d=await call(bodyFor(type));applyType(type,d);window.DBEST_MARKETPLACE_RADIUS_RULE=d.serviceRadius||window.DBEST_MARKETPLACE_RADIUS_RULE;
  if(repaint&&typeof marketState!=='undefined'&&String(marketState.type||'').toLowerCase()===type&&marketplaceOpen()&&typeof window.openMarketplace==='function')setTimeout(()=>window.openMarketplace(type,marketState.category||'All',marketState.vendor||'All'),0);
 }catch(e){console.warn('Marketplace local type load',type,e)}finally{loading[type]=false}
}
async function enforce(repaint=true){
 if(!BASE||!KEY||typeof commerceConfig==='undefined')return;
 try{
  const l=customerLocation(),body={};if(l){body.customerLat=l.lat;body.customerLng=l.lng}
  const d=await call(body),ps=Array.isArray(d.products)?d.products:[],vs=Array.isArray(d.vendors)?d.vendors:[];
  const returned=[...new Set([...ps.map(p=>String(p.market_type||'').toLowerCase()),...vs.map(v=>String(v.type||'').toLowerCase())].filter(Boolean))];
  const known=[...new Set(['restaurant','grocery','digital',...returned,...Object.keys(cache)])].filter(t=>t&&t!=='medicine');
  for(const type of known)applyType(type,{products:ps.filter(p=>String(p.market_type||'').toLowerCase()===type),vendors:vs.filter(v=>String(v.type||'').toLowerCase()===type),serviceRadius:d.serviceRadius});
  window.DBEST_MARKETPLACE_RADIUS_RULE=d.serviceRadius||null;window.DBEST_LIVE_CATALOG_READY={version:VERSION,build:BUILD,types:returned,productCount:ps.length,vendorCount:vs.length,locationRequired:!!d.locationRequired,serviceRadius:d.serviceRadius||null};
  const current=typeof marketState!=='undefined'?String(marketState.type||'').toLowerCase():'';
  if(repaint&&current&&current!=='medicine'&&typeof window.openMarketplace==='function'&&marketplaceOpen())setTimeout(()=>window.openMarketplace(current,marketState.category||'All',marketState.vendor||'All'),0);
 }catch(e){console.warn('Live local Marketplace catalogue authority',e)}
}
function installSwitch(){
 if(window.__DBEST_MARKETPLACE_BASE_OPEN||typeof window.openMarketplace!=='function')return;
 const base=window.openMarketplace;window.__DBEST_MARKETPLACE_BASE_OPEN=base;
 window.openMarketplace=function(type,category=null,vendor=null){
  const t=String(type||'grocery').toLowerCase(),sig=locSig(t);
  if(t!=='medicine'&&cache[t]?.locationSig===sig&&applied[t]!==sig)applyType(t,cache[t]);
  const out=stableRender(()=>base(t,category,vendor));cleanMarketplaceGpsDiagnostics();setTimeout(cleanMarketplaceGpsDiagnostics,0);
  if(t!=='medicine'&&cache[t]?.locationSig!==sig)ensureType(t,true);
  return out;
 }
}
function refreshForLocation(){for(const k of Object.keys(cache)){if(k!=='digital')cache[k].locationSig='stale';if(k!=='digital')applied[k]='stale'}enforce(true);['restaurant','grocery','digital'].forEach(t=>ensureType(t,false));cleanMarketplaceGpsDiagnostics()}
function quietFocusRefresh(){installMarketplaceLocationUiCleanup();installSwitch();const current=typeof marketState!=='undefined'?String(marketState.type||'').toLowerCase():'';if(current&&current!=='medicine')ensureType(current,false)}
installMarketplaceLocationUiCleanup();
setTimeout(()=>{installMarketplaceLocationUiCleanup();installSwitch();enforce(false);['restaurant','grocery','digital'].forEach(t=>ensureType(t,false))},60);
setTimeout(()=>{installMarketplaceLocationUiCleanup();installSwitch()},1200);
window.addEventListener('focus',()=>setTimeout(quietFocusRefresh,90));window.addEventListener('dbest-location-changed',refreshForLocation);
const mo=new MutationObserver(()=>{if(document.querySelector('.shopPage #commerceGpsDiag'))cleanMarketplaceGpsDiagnostics()});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_MARKETPLACE_LIVE_CATALOG={version:VERSION,enforce,ensureType,cache,refreshForLocation,customerLocation,cleanMarketplaceGpsDiagnostics};
try{if(!document.querySelector('script[data-dbest-meds-preview]')){const s=document.createElement('script');s.src='./dbest-meds-preview-catalog.js?v='+BUILD;s.setAttribute('data-dbest-meds-preview','1');(document.body||document.documentElement).appendChild(s)}}catch(e){console.warn('DBest Meds preview loader',e)}
})();