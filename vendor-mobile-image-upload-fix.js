(function(){
'use strict';
if(window.DBEST_VENDOR_MOBILE_IMAGE_FIX?.version)return;
const VERSION='1.0.0',BUILD='20260827-2035-mobile-vendor-image-fix';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
const GROWTH=BASE+'/functions/v1/vendor-growth-live',IMAGE=BASE+'/functions/v1/vendor-image-live',VTK='dbest_vendor_live_token';
const text=v=>String(v??'').trim();
const token=()=>{try{return localStorage.getItem(VTK)||''}catch(_){return''}};
const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};

async function post(url,body){
  const tk=token();if(!BASE||!KEY||!tk)throw new Error('Vendor session expired. Please login again.');
  const r=await fetch(url,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-vendor-token':tk},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));return d;
}
const growth=(action,body={})=>post(GROWTH,{action,...body});

function status(form,msg,kind='info'){
  let b=form.querySelector('#dbestCatalogPublishStatus,.dbestStorageStatus,.dbestImagePublishStatus');
  if(!b){b=document.createElement('div');b.id='dbestCatalogPublishStatus';form.appendChild(b)}
  b.style.cssText='display:block;margin-top:10px;padding:11px 13px;border-radius:12px;font-size:13px;line-height:1.4;font-weight:750';
  b.textContent=msg;
  const m={info:['#eef4ff','#184f9e','#cbdcff'],ok:['#ecf9f0','#17623a','#c9ead5'],error:['#fff0ef','#a52e2e','#f0cdca']}[kind]||['#eef4ff','#184f9e','#cbdcff'];
  b.style.background=m[0];b.style.color=m[1];b.style.border='1px solid '+m[2];
}
function vendorCategory(){
  try{const v=typeof marketVendor==='function'?marketVendor(window.vendorSession?.vendorId):null,t=text(v?.type).toLowerCase();return ({restaurant:'Restaurants & Food',food:'Restaurants & Food',grocery:'Grocery',medicine:'Medicines',pharmacy:'Medicines',fashion:'Fashion',electronics:'Electronics',digital:'Digital Items'})[t]||text(v?.type)||'General'}catch(_){return'General'}
}
function imageLike(file){
  const type=text(file?.type).toLowerCase(),name=text(file?.name).toLowerCase();
  return type.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}
async function decodeImage(file){
  if(!file||!imageLike(file))throw new Error('Please choose a product image.');
  if(typeof createImageBitmap==='function'){
    try{const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});if(bmp&&bmp.width&&bmp.height)return {source:bmp,width:bmp.width,height:bmp.height,close:()=>{try{bmp.close()}catch(_){}}}}catch(_){}
    try{const bmp=await createImageBitmap(file);if(bmp&&bmp.width&&bmp.height)return {source:bmp,width:bmp.width,height:bmp.height,close:()=>{try{bmp.close()}catch(_){}}}}catch(_){}
  }
  const objectUrl=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('This phone image format could not be opened. Please choose a JPG, PNG or WebP photo.'));im.src=objectUrl});
    return {source:img,width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,close:()=>{}};
  }finally{setTimeout(()=>{try{URL.revokeObjectURL(objectUrl)}catch(_){}},1000)}
}
async function compressMobile(file){
  const decoded=await decodeImage(file);try{
    let w=Number(decoded.width||0),h=Number(decoded.height||0);if(!w||!h)throw new Error('Image dimensions could not be read.');
    const max=1200,scale=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});if(!x)throw new Error('Image processing is unavailable on this phone.');
    x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(decoded.source,0,0,w,h);
    let q=.82,out=c.toDataURL('image/jpeg',q);while(out.length>820000&&q>.38){q-=.07;out=c.toDataURL('image/jpeg',q)}
    if(!/^data:image\/jpeg;base64,/i.test(out))throw new Error('Image conversion failed.');
    if(out.length>900000)throw new Error('Photo is too large. Please use a smaller photo.');
    return out;
  }finally{try{decoded.close?.()}catch(_){}}
}
async function uploadImage(file,itemId='new'){
  const dataUrl=await compressMobile(file);
  const d=await post(IMAGE,{action:'upload_product_image',dataUrl,fileName:text(file.name)||'product.jpg',itemId});
  const u=text(d.url);if(!/^https:\/\//i.test(u))throw new Error('Product image storage failed.');return u;
}
function isPublishButton(btn){return !!(btn&&btn.closest('#dbestMultiProductForm')&&(btn.matches('[data-dbest-publish-all]')||/Publish All Items|Submit All for Owner Approval/i.test(btn.textContent||'')))}
async function publish(form,btn){
  if(!form||form.dataset.dbestMobilePublish==='1')return;
  const rows=[...form.querySelectorAll('.dbestMultiProductRow')];if(!rows.length)return status(form,'Add at least one product.','error');
  if(!token())return status(form,'Vendor session expired. Please logout and login again.','error');
  form.dataset.dbestMobilePublish='1';if(btn){btn.disabled=true;btn.dataset.mobileOld=btn.textContent||'Publish All Items';btn.textContent='Uploading & Publishing…'}
  try{
    let done=0;for(let i=0;i<rows.length;i++){
      const row=rows[i],name=text(row.querySelector('[name="name"]')?.value),unit=text(row.querySelector('[name="unit"]')?.value),category=text(row.querySelector('[name="category"]')?.value)||vendorCategory();
      const price=Number(row.querySelector('[name="price"]')?.value||0),mrpRaw=Number(row.querySelector('[name="mrp"]')?.value||0),stock=Number(row.querySelector('[name="stock"]')?.value||0),offer=Number(row.querySelector('[name="offer"]')?.value||0);
      const file=row.querySelector('[name="imageFile"]')?.files?.[0]||null;let imageUrl=text(row.querySelector('[name="imageUrl"]')?.value);
      if(!name||!unit)throw new Error('Product '+(i+1)+': enter Item Name and Unit.');if(!Number.isFinite(price)||price<=0)throw new Error('Product '+(i+1)+': enter a valid Price above ₹0.');if(!Number.isFinite(stock)||stock<0)throw new Error('Product '+(i+1)+': enter valid Stock.');
      if(imageUrl&&!/^https:\/\//i.test(imageUrl))throw new Error('Product '+(i+1)+': Image URL must start with https://');
      if(file){status(form,'Product '+(i+1)+' of '+rows.length+': processing phone photo…','info');imageUrl=await uploadImage(file,'new')}
      status(form,'Product '+(i+1)+' of '+rows.length+': publishing item…','info');
      await growth('vendor_catalog_save',{name,description:[category,unit].filter(Boolean).join(' • '),price,mrp:mrpRaw>0?mrpRaw:price,stock:Math.max(0,stock),offerPercent:Number.isFinite(offer)?Math.max(0,Math.min(90,offer)):0,imageUrl,active:true});done++;
    }
    status(form,'✓ '+done+' product'+(done===1?'':'s')+' published successfully with stored images.','ok');notify(done+' product'+(done===1?'':'s')+' published successfully.');
    try{await window.DBEST_MARKETPLACE_CONTROLLER_V3?.loadSnapshot?.(true)}catch(_){}try{await window.DBEST_MARKETPLACE_LIVE_CATALOG?.enforce?.(false)}catch(_){}
    setTimeout(()=>{try{if(typeof vendorDashboard==='function')vendorDashboard()}catch(_){}},650);
  }catch(e){console.warn('DBest mobile Vendor publish',e);status(form,'Could not publish: '+(e.message||'Please try again.'),'error');notify('Could not publish: '+(e.message||'Please try again.'))}
  finally{delete form.dataset.dbestMobilePublish;if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.mobileOld||'Publish All Items'}}
}
function enhance(){
  const form=document.getElementById('dbestMultiProductForm');if(!form)return;
  form.querySelectorAll('[name="imageFile"]').forEach(file=>{file.setAttribute('accept','image/jpeg,image/png,image/webp,image/*');if(!file.dataset.mobileHelp){file.dataset.mobileHelp='1';const s=document.createElement('small');s.style.cssText='display:block;margin:5px 0;color:#58708e;font-weight:650';s.textContent='Phone photos supported. JPG, PNG or WebP recommended.';file.insertAdjacentElement('afterend',s)}});
}
document.addEventListener('click',e=>{const btn=e.target?.closest?.('button');if(!isPublishButton(btn))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();publish(btn.closest('#dbestMultiProductForm'),btn)},true);
document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement)||form.id!=='dbestMultiProductForm')return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const btn=form.querySelector('[data-dbest-publish-all]')||[...form.querySelectorAll('button')].find(isPublishButton);publish(form,btn)},true);
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestMobileImageFixTimer);window.__dbestMobileImageFixTimer=setTimeout(enhance,60)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});[0,120,500,1200,3000].forEach(ms=>setTimeout(enhance,ms));
window.DBEST_VENDOR_MOBILE_IMAGE_FIX={version:VERSION,build:BUILD,publish,uploadImage,compressMobile};
})();