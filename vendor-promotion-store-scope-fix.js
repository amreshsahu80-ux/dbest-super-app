(function(){
'use strict';
const VERSION='1.0.1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function selectedVendor(){
  try{
    const v=String(window.marketState?.vendor||'All').trim();
    return v&&v!=='All'?v:'';
  }catch(_){return''}
}
function publicData(){return window.DBEST_VENDOR_PROMOTIONS_PUBLIC||null}
function promoLabel(p){return p?.promotion_type==='fixed'?money(p.discount_value)+' OFF':Number(p?.discount_value||0)+'% OFF'}
function removeBanner(){const b=document.getElementById('dbestVendorPromoBanner');if(b)b.remove()}
function enforce(){
  const page=document.querySelector('.shopPage');
  if(!page)return removeBanner();
  const vendorId=selectedVendor();
  if(!vendorId)return removeBanner();
  const d=publicData();if(!d)return removeBanner();
  const vendor=(Array.isArray(d.vendors)?d.vendors:[]).find(v=>String(v.id)===vendorId);
  const promos=(Array.isArray(d.promotions)?d.promotions:[]).filter(p=>String(p.vendor_id)===vendorId);
  if(!promos.length)return removeBanner();
  let box=document.getElementById('dbestVendorPromoBanner');
  if(!box){box=document.createElement('div');box.id='dbestVendorPromoBanner'}
  box.dataset.vendorId=vendorId;
  box.innerHTML=promos.slice(0,4).map(p=>`<div class="vgBanner"><div style="font-size:11px;opacity:.88;margin-bottom:3px">${esc(vendor?.name||'Vendor')} offer</div>🔥 <b>${esc(p.title)}</b> • ${promoLabel(p)}${p.banner_text?' — '+esc(p.banner_text):''}</div>`).join('');
  const strip=page.querySelector('.vendorStrip');
  if(strip&&strip.parentNode){
    if(box.parentNode!==strip.parentNode||box.previousElementSibling!==strip)strip.insertAdjacentElement('afterend',box);
  }else if(!box.parentNode)page.insertBefore(box,page.firstChild);
}
function wrapMarketplace(){
  const fn=window.openMarketplace;if(typeof fn!=='function'||fn.__dbestVendorPromoScoped)return;
  const w=function(){const r=fn.apply(this,arguments);[0,80,180,350,700].forEach(ms=>setTimeout(enforce,ms));return r};
  w.__dbestVendorPromoScoped=true;window.openMarketplace=w;
}
function loadDirectCatalog(){
  if(document.querySelector('script[data-dbest-vendor-direct-catalog]'))return;
  const s=document.createElement('script');s.src='/vendor-direct-catalog-finalizer.js?v=20260826-1920-vendor-direct-catalog';s.setAttribute('data-dbest-vendor-direct-catalog','1');document.body.appendChild(s);
}
function install(){wrapMarketplace();enforce();loadDirectCatalog()}
[0,100,300,700,1400,2800,5000,9000].forEach(ms=>setTimeout(install,ms));
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestVendorPromoScopeTimer);window.__dbestVendorPromoScopeTimer=setTimeout(enforce,50)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_PROMOTION_STORE_SCOPE={version:VERSION,enforce};
})();