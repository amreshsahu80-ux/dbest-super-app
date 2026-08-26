(function(){
'use strict';
const VERSION='1.1.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
let seq=0,pending=null,lastFetch=0;
function selectedVendorKey(){
  try{
    const v=String(window.marketState?.vendor||'All').trim();
    return v&&v!=='All'?v:'';
  }catch(_){return''}
}
function publicData(){return window.DBEST_VENDOR_PROMOTIONS_PUBLIC||null}
function promoLabel(p){return p?.promotion_type==='fixed'?money(p.discount_value)+' OFF':Number(p?.discount_value||0)+'% OFF'}
function removeBanner(){const b=document.getElementById('dbestVendorPromoBanner');if(b)b.remove()}
function liveNow(p,vendorId){
  if(String(p?.vendor_id||'')!==String(vendorId||''))return false;
  if(p?.active===false)return false;
  const now=Date.now(),s=new Date(p?.start_at||0).getTime(),e=new Date(p?.end_at||0).getTime();
  if(Number.isFinite(s)&&s>now)return false;
  if(Number.isFinite(e)&&e>0&&e<now)return false;
  return true;
}
async function ensurePublic(force=false){
  const existing=publicData();
  if(!force&&existing)return existing;
  const growth=window.DBEST_VENDOR_GROWTH;
  if(!growth||typeof growth.hydratePublic!=='function')return existing;
  if(pending)return pending;
  if(!force&&Date.now()-lastFetch<5000)return existing;
  lastFetch=Date.now();
  pending=Promise.resolve(growth.hydratePublic(!!force)).catch(()=>null).finally(()=>{pending=null});
  const d=await pending;
  return d||publicData()||existing;
}
async function enforce(force=false){
  const ticket=++seq;
  const page=document.querySelector('.shopPage');
  if(!page)return removeBanner();
  const key=selectedVendorKey();
  if(!key)return removeBanner();
  let d=publicData();
  if(force||!d)d=await ensurePublic(force);
  if(ticket!==seq)return;
  if(!document.querySelector('.shopPage')||selectedVendorKey()!==key)return;
  if(!d)return removeBanner();
  const vendors=Array.isArray(d.vendors)?d.vendors:[];
  const vendor=vendors.find(v=>String(v?.id||'')===key)||vendors.find(v=>String(v?.name||'').trim().toLowerCase()===key.toLowerCase());
  if(!vendor)return removeBanner();
  const vendorId=String(vendor.id||'');
  const promos=(Array.isArray(d.promotions)?d.promotions:[]).filter(p=>liveNow(p,vendorId));
  if(!promos.length)return removeBanner();
  let box=document.getElementById('dbestVendorPromoBanner');
  if(!box){box=document.createElement('div');box.id='dbestVendorPromoBanner'}
  box.dataset.vendorId=vendorId;
  box.setAttribute('aria-label',(vendor.name||'Vendor')+' offers');
  box.innerHTML=promos.slice(0,4).map(p=>`<div class="vgBanner dbestVendorScopedPromo">🔥 <b>${esc(p.title)}</b> • ${promoLabel(p)}</div>`).join('');
  const strip=page.querySelector('.vendorStrip');
  if(strip&&strip.parentNode){
    if(box.parentNode!==strip.parentNode||box.previousElementSibling!==strip)strip.insertAdjacentElement('afterend',box);
  }else if(!box.parentNode)page.insertBefore(box,page.firstChild);
}
function wrapMarketplace(){
  const fn=window.openMarketplace;if(typeof fn!=='function'||fn.__dbestVendorPromoScopedV2)return;
  const w=function(){
    const r=fn.apply(this,arguments);
    [0,70,180,360,700].forEach(ms=>setTimeout(()=>enforce(false),ms));
    setTimeout(()=>enforce(true),140);
    return r;
  };
  w.__dbestVendorPromoScopedV2=true;window.openMarketplace=w;
}
function installStyle(){
  if(document.getElementById('dbestVendorScopedPromoStyle'))return;
  const s=document.createElement('style');s.id='dbestVendorScopedPromoStyle';
  s.textContent='.dbestVendorScopedPromo{margin:10px 0!important;padding:11px 14px!important;border-radius:14px!important;font-size:15px!important;line-height:1.25!important}.vendorStrip+#dbestVendorPromoBanner{margin:4px 0 8px}';
  document.head.appendChild(s);
}
function loadDirectCatalog(){
  if(document.querySelector('script[data-dbest-vendor-direct-catalog]'))return;
  const s=document.createElement('script');s.src='/vendor-direct-catalog-finalizer.js?v=20260827-0020-vendor-promo-scope';s.setAttribute('data-dbest-vendor-direct-catalog','1');document.body.appendChild(s);
}
function install(){installStyle();wrapMarketplace();enforce(false);loadDirectCatalog()}
[0,100,300,700,1400,2800,5000,9000].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',e=>{if(e.target?.closest?.('.vendorChip'))setTimeout(()=>enforce(true),100)},true);
window.addEventListener('focus',()=>setTimeout(()=>enforce(true),100));
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestVendorPromoScopeTimer);window.__dbestVendorPromoScopeTimer=setTimeout(()=>enforce(false),60)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_PROMOTION_STORE_SCOPE={version:VERSION,enforce:()=>enforce(true)};
})();