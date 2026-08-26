(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const API=BASE+'/functions/v1/vendor-growth-live';
const VTK='dbest_vendor_live_token';
const text=v=>String(v??'').trim();
const notify=(m)=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
function token(){try{return localStorage.getItem(VTK)||''}catch(_){return''}}
function vendor(){try{return typeof marketVendor==='function'?marketVendor(window.vendorSession?.vendorId):null}catch(_){return null}}
function vendorCategory(){
  const v=vendor(),t=text(v?.type).toLowerCase();
  const map={restaurant:'Restaurants & Food',food:'Restaurants & Food',grocery:'Grocery',medicine:'Medicines',pharmacy:'Medicines',fashion:'Fashion',electronics:'Electronics',services:'Services'};
  return map[t]||text(v?.type)||'General';
}
async function call(action,body={}){
  if(!BASE||!KEY||!token())throw new Error('Vendor session not found. Please login again.');
  const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-vendor-token':token()},body:JSON.stringify({action,...body})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));
  return d;
}
function renumber(host){[...host.querySelectorAll('.dbestMultiProductRow')].forEach((r,i)=>{r.dataset.row=String(i);const b=r.querySelector('b');if(b)b.textContent='Product '+(i+1)})}
function prepareRow(row,clear){
  if(!row)return;
  const cat=row.querySelector('[name="category"]');
  if(cat){cat.required=false;cat.value=vendorCategory();const sf=cat.closest('.sf');if(sf)sf.style.display='none'}
  if(clear){
    ['name','unit','price','mrp','imageUrl'].forEach(n=>{const el=row.querySelector('[name="'+n+'"]');if(el)el.value=''});
    const stock=row.querySelector('[name="stock"]');if(stock)stock.value='10';
    const offer=row.querySelector('[name="offer"]');if(offer)offer.value='0';
    const file=row.querySelector('[name="imageFile"]');if(file)file.value='';
    const rx=row.querySelector('[name="rx"]');if(rx)rx.checked=false;
  }
  const remove=row.querySelector('button');
  if(remove){remove.removeAttribute('onclick');remove.onclick=function(){const host=document.getElementById('dbestMultiProductRows');if(!host)return;const rows=host.querySelectorAll('.dbestMultiProductRow');if(rows.length<=1)return notify('Keep at least one product.');row.remove();renumber(host)}}
}
function addRow(){
  const host=document.getElementById('dbestMultiProductRows');if(!host)return notify('Catalogue form is not ready. Please reopen Vendor Dashboard.');
  const first=host.querySelector('.dbestMultiProductRow');if(!first)return notify('Catalogue product row is missing.');
  const row=first.cloneNode(true);prepareRow(row,true);host.appendChild(row);renumber(host);row.scrollIntoView({behavior:'smooth',block:'center'});
}
function imageData(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve('');if(!/^image\//i.test(file.type||''))return reject(new Error('Please choose an image file.'));
    const reader=new FileReader();reader.onerror=()=>reject(new Error('Image could not be read.'));reader.onload=()=>{
      const img=new Image();img.onerror=()=>reject(new Error('Image could not be opened.'));img.onload=()=>{
        let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const max=1100,scale=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
        const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);
        let q=.78,out=c.toDataURL('image/jpeg',q);while(out.length>430000&&q>.42){q-=.08;out=c.toDataURL('image/jpeg',q)}
        if(out.length>650000)return reject(new Error('Image is too large. Please choose a smaller image or use Image URL.'));resolve(out);
      };img.src=String(reader.result||'');
    };reader.readAsDataURL(file);
  });
}
async function publishAll(e){
  e.preventDefault();const form=e.currentTarget||e.target,rows=[...form.querySelectorAll('.dbestMultiProductRow')];if(!rows.length)return notify('Add at least one product.');
  const btn=form.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.dataset.old=btn.textContent;btn.textContent='Publishing…'}
  try{
    let done=0;
    for(const row of rows){
      const name=text(row.querySelector('[name="name"]')?.value),unit=text(row.querySelector('[name="unit"]')?.value),subcategory=text(row.querySelector('[name="category"]')?.value)||vendorCategory();
      const price=Number(row.querySelector('[name="price"]')?.value||0),mrpRaw=Number(row.querySelector('[name="mrp"]')?.value||0),stock=Number(row.querySelector('[name="stock"]')?.value||0),offer=Number(row.querySelector('[name="offer"]')?.value||0);
      if(!name||!unit)throw new Error('Please enter Item Name and Unit for every product.');
      if(!Number.isFinite(price)||price<0)throw new Error('Please enter a valid Price for every product.');
      if(!Number.isFinite(stock)||stock<0)throw new Error('Please enter valid Stock for every product.');
      let imageUrl=text(row.querySelector('[name="imageUrl"]')?.value);const file=row.querySelector('[name="imageFile"]')?.files?.[0]||null;if(!imageUrl&&file)imageUrl=await imageData(file);
      await call('vendor_catalog_save',{name,description:[subcategory,unit].filter(Boolean).join(' • '),price,mrp:mrpRaw>0?mrpRaw:price,stock,offerPercent:Number.isFinite(offer)?Math.max(0,Math.min(90,offer)):0,imageUrl,active:true});done++;
    }
    notify(done+' product'+(done===1?'':'s')+' published successfully.');
    if(typeof vendorDashboard==='function')vendorDashboard();
    setTimeout(()=>{try{window.DBEST_VENDOR_GROWTH?.refreshVendorGrowth?.()}catch(_){}},350);
  }catch(err){notify('Could not publish: '+(err.message||'Please check the product details.'))}
  finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.old||'Publish All Items'}}
}
function fix(){
  const card=document.getElementById('dbestMultiCatalogCard'),form=document.getElementById('dbestMultiProductForm'),host=document.getElementById('dbestMultiProductRows');if(!card||!form||!host||!token())return;
  host.querySelectorAll('.dbestMultiProductRow').forEach(r=>prepareRow(r,false));
  const title=card.querySelector('h3');if(title)title.textContent='Add Catalogue Items';
  const notice=card.querySelector('.notice');if(notice)notice.innerHTML='<b>Approved Vendor self-publishing.</b> Add one or more items and publish directly. Item category is taken automatically from your Vendor business category; you do not need to enter it for every product.';
  const add=[...card.querySelectorAll('button')].find(b=>/Add Another Product/i.test(b.textContent||''));if(add&&!add.dataset.dbestFixed){add.dataset.dbestFixed='1';add.removeAttribute('onclick');add.onclick=addRow}
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Publish All Items';
  if(form.dataset.dbestCatalogUx!=='1'){form.dataset.dbestCatalogUx='1';form.onsubmit=publishAll}
}
[0,100,300,700,1400,2800,5000,9000].forEach(ms=>setTimeout(fix,ms));
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestCatalogUxTimer);window.__dbestCatalogUxTimer=setTimeout(fix,40)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_CATALOG_UX={version:VERSION,fix,addRow};
})();