(function(){
'use strict';
const VERSION='2.0.0',BUILD='20260827-1915-marketplace-deterministic-switching';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',API=BASE+'/functions/v1/marketplace-local-catalog-live';
const TYPES=['restaurant','grocery','digital'];
const cache=window.DBEST_MARKETPLACE_TYPE_CACHE||{};window.DBEST_MARKETPLACE_TYPE_CACHE=cache;
const applied={},inflight={},requestSeq={};
let observedLocationSig='__init__';

function persist(){try{typeof save==='function'&&save()}catch(_){}}
function finite(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))}
function marketplaceOverlay(){try{return document.querySelector('#m .sectionOverlay')}catch(_){return null}}
function marketplaceOpen(){try{return !!document.querySelector('#m .shopPage')}catch(_){return false}}
function currentType(){try{return String(marketState?.type||'').toLowerCase()}catch(_){return ''}}
function captureMarketUi(){
 const ov=marketplaceOverlay(),input=document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('shopSearch')?document.activeElement:null;
 return {active:marketplaceOpen(),scrollTop:ov?ov.scrollTop:0,searchFocused:!!input,selectionStart:input&&Number.isFinite(input.selectionStart)?input.selectionStart:null,selectionEnd:input&&Number.isFinite(input.selectionEnd)?input.selectionEnd:null};
}
function restoreMarketUi(s){
 if(!s||!s.active)return;
 const restore=()=>{
  const ov=marketplaceOverlay();if(ov)ov.scrollTop=Math.max(0,Number(s.scrollTop||0));
  if(s.searchFocused){const inp=document.querySelector('#m .shopSearch');if(inp){try{inp.focus({preventScroll:true})}catch(_){try{inp.focus()}catch(__){}}try{if(s.selectionStart!==null)inp.setSelectionRange(s.selectionStart,s.selectionEnd??s.selectionStart)}catch(_){}}}
 };
 restore();if(typeof requestAnimationFrame==='function')requestAnimationFrame(restore);setTimeout(restore,30);
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
}
function cleanMarketplaceGpsDiagnostics(){installMarketplaceLocationUiCleanup()}
function customerLocation(){
 try{if(typeof commerceLocation!=='undefined'&&finite(commerceLocation?.lat)&&finite(commerceLocation?.lng))return {lat:Number(commerceLocation.lat),lng:Number(commerceLocation.lng),source:'marketplace'}}catch(_){}
 try{const x=window.DBEST_TOP_LIVE_LOCATION;if(finite(x?.lat)&&finite(x?.lng))return {lat:Number(x.lat),lng:Number(x.lng),source:'live'}}catch(_){}
 try{const x=JSON.parse(localStorage.getItem('dbest_top_live_location_v1')||'null');if(finite(x?.lat)&&finite(x?.lng))return {lat:Number(x.lat),lng:Number(x.lng),source:'cached'}}catch(_){}
 return null;
}
function locationSig(){const l=customerLocation();return l?Number(l.lat).toFixed(3)+','+Number(l.lng).toFixed(3):'no-location'}
function locSig(type){return String(type)==='digital'?'digital':locationSig()}
async function call(body={}){
 const h={'apikey':KEY,'Content-Type':'application/json'};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;
 const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action:'public_catalog',...body})});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'marketplace_local_catalog_error');return d;
}
function detail(p){const d=String(p.description||'').trim();let category='General',unit='';if(d.includes(' • ')){const a=d.split(' • ');category=String(a.shift()||'General').trim()||'General';unit=a.join(' • ').trim()}else if(d.includes('|')){const a=d.split('|');category=String(a.shift()||'General').trim()||'General';unit=a.join(' | ').trim()}else if(d)category=d.length<=40?d:'General';return {category,unit}}
function liveRow(p){const x=detail(p);return {id:p.id,type:String(p.market_type||'').trim().toLowerCase(),vendorId:p.vendor_id,name:p.name,category:x.category,unit:x.unit,description:p.description||'',price:Number(p.price||0),mrp:Number(p.mrp||p.base_price||p.price||0),stock:Number(p.stock||0),offer:Number(p.effective_offer_percent??p.offer_percent??0),active:p.active!==false,image:p.image_url||'',ownerApproved:true,approvalStatus:'Approved',liveBackend:true}}
function liveVendor(v){return {id:v.id,name:v.name,type:String(v.type||'').trim().toLowerCase(),city:v.city||'',active:true,ownerApproval:'Approved',liveBackend:true,canPrice:true,canStock:true,canOffer:true,distanceKm:v.distance_km==null?null:Number(v.distance_km),serviceRadiusKm:v.service_radius_km==null?null:Number(v.service_radius_km),agreement:{partnerSigned:true,ownerSigned:true,status:'Fully Signed'}}}
function normalizeBundle(type,d){
 const ps=(Array.isArray(d?.products)?d.products:[]).filter(p=>String(p.market_type||'').toLowerCase()===type);
 const vs=(Array.isArray(d?.vendors)?d.vendors:[]).filter(v=>String(v.type||'').toLowerCase()===type);
 return {products:ps,vendors:vs,serviceRadius:d?.serviceRadius||null};
}
function applyType(type,bundle,sig=locSig(type)){
 if(!bundle||typeof commerceConfig==='undefined')return false;
 const ps=(bundle.products||[]).map(liveRow),vs=(bundle.vendors||[]).map(liveVendor);
 commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];
 commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];
 commerceConfig.products=commerceConfig.products.filter(p=>String(p.type||'').toLowerCase()!==type);
 commerceConfig.vendors=commerceConfig.vendors.filter(v=>String(v.type||'').toLowerCase()!==type);
 commerceConfig.products.push(...ps);commerceConfig.vendors.push(...vs);
 cache[type]={products:bundle.products||[],vendors:bundle.vendors||[],locationSig:sig,serviceRadius:bundle.serviceRadius||null,at:Date.now()};
 applied[type]=sig;persist();return true;
}
function bodyFor(type){const l=customerLocation(),b={marketType:type};if(type!=='digital'&&l){b.customerLat=l.lat;b.customerLng=l.lng}return b}
function repaintType(type){
 if(currentType()!==type||!marketplaceOpen()||typeof window.openMarketplace!=='function')return;
 const cat=typeof marketState!=='undefined'?marketState.category||'All':'All',vendor=typeof marketState!=='undefined'?marketState.vendor||'All':'All';
 setTimeout(()=>{if(currentType()===type&&marketplaceOpen())window.openMarketplace(type,cat,vendor)},0);
}
async function ensureType(type,opts={}){
 type=String(type||'').toLowerCase();const repaint=!!opts.repaint,force=!!opts.force;
 if(!BASE||!KEY||!type||type==='medicine')return false;
 const sig=locSig(type);
 if(type!=='digital'&&sig==='no-location')return false;
 if(!force&&cache[type]?.locationSig===sig){if(applied[type]!==sig)applyType(type,cache[type],sig);return true}
 if(inflight[type]&&inflight[type].sig===sig)return inflight[type].promise;
 const seq=(requestSeq[type]||0)+1;requestSeq[type]=seq;
 const promise=(async()=>{
  try{
   const d=await call(bodyFor(type));
   if(seq!==requestSeq[type])return false;
   if(type!=='digital'&&sig!==locSig(type))return false;
   const bundle=normalizeBundle(type,d);applyType(type,bundle,sig);
   window.DBEST_MARKETPLACE_RADIUS_RULE=d.serviceRadius||window.DBEST_MARKETPLACE_RADIUS_RULE;
   if(repaint)repaintType(type);
   return true;
  }catch(e){console.warn('Marketplace type load',type,e);return false}
  finally{if(inflight[type]?.seq===seq)delete inflight[type]}
 })();
 inflight[type]={sig,seq,promise};return promise;
}
async function preloadAll(repaintCurrent=false){
 const cur=currentType(),tasks=[];
 for(const t of TYPES){if(t!=='digital'&&!customerLocation())continue;tasks.push(ensureType(t,{repaint:repaintCurrent&&cur===t}))}
 return Promise.allSettled(tasks);
}
async function enforce(repaint=true){return preloadAll(repaint)}
function installGpsThrottle(){
 try{
  if(window.__DBEST_COMMERCE_GPS_BASE||typeof window.requestCommerceLocation!=='function')return;
  const base=window.requestCommerceLocation;window.__DBEST_COMMERCE_GPS_BASE=base;
  window.requestCommerceLocation=function(type,silent=false){
   try{
    if(silent&&typeof commerceLocation!=='undefined'&&finite(commerceLocation?.lat)&&finite(commerceLocation?.lng)){
     const ts=Number(commerceLocation.timestamp||0),fresh=ts>0&&(Date.now()-ts)<90000;
     if(fresh)return;
    }
   }catch(_){}
   return base(type,silent);
  };
 }catch(e){console.warn('Marketplace GPS throttle',e)}
}
function installSwitch(){
 if(window.__DBEST_MARKETPLACE_BASE_OPEN||typeof window.openMarketplace!=='function')return;
 const base=window.openMarketplace;window.__DBEST_MARKETPLACE_BASE_OPEN=base;
 window.openMarketplace=function(type,category=null,vendor=null){
  const t=String(type||'grocery').toLowerCase(),sig=locSig(t);
  if(t!=='medicine'&&cache[t]?.locationSig===sig&&applied[t]!==sig)applyType(t,cache[t],sig);
  const out=stableRender(()=>base(t,category,vendor));cleanMarketplaceGpsDiagnostics();
  if(t!=='medicine'&&cache[t]?.locationSig!==sig)ensureType(t,{repaint:true});
  return out;
 };
}
function onLocationChanged(){
 const sig=locationSig();if(sig===observedLocationSig)return;observedLocationSig=sig;
 if(sig==='no-location')return;
 for(const t of ['restaurant','grocery'])applied[t]='stale';
 preloadAll(true);
}
function quietFocusRefresh(){installMarketplaceLocationUiCleanup();installGpsThrottle();installSwitch();const cur=currentType();if(cur&&cur!=='medicine')ensureType(cur,{repaint:false})}
function boot(){installMarketplaceLocationUiCleanup();installGpsThrottle();installSwitch();onLocationChanged();preloadAll(false)}
boot();setTimeout(boot,80);setTimeout(boot,700);setTimeout(boot,1500);
setInterval(onLocationChanged,650);
window.addEventListener('focus',()=>setTimeout(quietFocusRefresh,90));
window.addEventListener('dbest-location-changed',()=>{observedLocationSig='__event__';onLocationChanged()});
window.DBEST_MARKETPLACE_LIVE_CATALOG={version:VERSION,build:BUILD,enforce,ensureType,cache,refreshForLocation:onLocationChanged,customerLocation,cleanMarketplaceGpsDiagnostics,preloadAll};
try{if(!document.querySelector('script[data-dbest-meds-preview]')){const s=document.createElement('script');s.src='./dbest-meds-preview-catalog.js?v='+BUILD;s.setAttribute('data-dbest-meds-preview','1');(document.body||document.documentElement).appendChild(s)}}catch(e){console.warn('DBest Meds preview loader',e)}
})();