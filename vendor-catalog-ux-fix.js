(function(){
'use strict';
const VERSION='1.1.0';
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
function statusBox(form){
  let box=document.getElementById('dbestCatalogPublishStatus');
  if(!box){
    box=document.createElement('div');box.id='dbestCatalogPublishStatus';
    box.style.cssText='display:none;margin-top:10px;padding:11px 13px;border-radius:12px;font-size:13px;line-height:1.4;font-weight:700';
    const actions=form.querySelector('button[data-dbest-publish-all]')?.parentElement||form.lastElementChild||form;
    actions.insertAdjacentElement('afterend',box);
  }
  return box;
}
function setStatus(form,msg,kind='info'){
  const box=statusBox(form);box.style.display='block';box.textContent=msg;
  const styles={info:['#eef4ff','#184f9e','#cbdcff'],ok:['#ecf9f0','#17623a','#c9ead5'],error:['#fff0ef','#a52e2e','#f0cdca']};
  const s=styles[kind]||styles.info;box.style.background=s[0];box.style.color=s[1];box.style.border='1px solid '+s[2];
}
function imageData(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve('');if(!/^image\//i.test(file.type||''))return reject(new Error('Please choose an image file.'));
    const reader=new FileReader();reader.onerror=()=>reject(new Error('Image could not be read.'));reader.onload=()=>{
      const img=new Image();img.onerror=()=>reject(new Error('Image could not be opened.'));img.onload=()=>{
        let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;const max=1000,scale=Math.min(1,max/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
        const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);
        let q=.74,out=c.toDataURL('image/jpeg',q);while(out.length>360000&&q>.38){q-=.08;out=c.toDataURL('image/jpeg',q)}
        if(out.length>550000)return reject(new Error('Image is too large. Please choose a smaller image or use Image URL.'));resolve(out);
      };img.src=String(reader.result||'');
    };reader.readAsDataURL(file);
  });
}
async function publishForm(form,btn){
  if(!form||form.dataset.dbestPublishing==='1')return;
  const rows=[...form.querySelectorAll('.dbestMultiProductRow')];if(!rows.length)return setStatus(form,'Add at least one product.','error');
  if(!token())return setStatus(form,'Vendor session expired. Please logout and login again.','error');
  form.dataset.dbestPublishing='1';
  if(btn){btn.disabled=true;btn.dataset.old=btn.textContent||'Publish All Items';btn.textContent='Publishing…'}
  try{
    let done=0;
    setStatus(form,'Preparing catalogue item'+(rows.length===1?'':'s')+'…','info');
    for(let i=0;i<rows.length;i++){
      const row=rows[i];
      const name=text(row.querySelector('[name="name"]')?.value),unit=text(row.querySelector('[name="unit"]')?.value),subcategory=text(row.querySelector('[name="category"]')?.value)||vendorCategory();
      const price=Number(row.querySelector('[name="price"]')?.value||0),mrpRaw=Number(row.querySelector('[name="mrp"]')?.value||0),stock=Number(row.querySelector('[name="stock"]')?.value||0),offer=Number(row.querySelector('[name="offer"]')?.value||0);
      if(!name||!unit)throw new Error('Product '+(i+1)+': enter Item Name and Unit.');
      if(!Number.isFinite(price)||price<=0)throw new Error('Product '+(i+1)+': enter a valid Price above ₹0.');
      if(!Number.isFinite(stock)||stock<0)throw new Error('Product '+(i+1)+': enter valid Stock.');
      let imageUrl=text(row.querySelector('[name="imageUrl"]')?.value);const file=row.querySelector('[name="imageFile"]')?.files?.[0]||null;
      setStatus(form,'Publishing product '+(i+1)+' of '+rows.length+'…','info');
      if(!imageUrl&&file)imageUrl=await imageData(file);
      await call('vendor_catalog_save',{name,description:[subcategory,unit].filter(Boolean).join(' • '),price,mrp:mrpRaw>0?mrpRaw:price,stock,offerPercent:Number.isFinite(offer)?Math.max(0,Math.min(90,offer)):0,imageUrl,active:true});
      done++;
    }
    setStatus(form,'✓ '+done+' product'+(done===1?'':'s')+' published successfully and sent to the live Marketplace.','ok');
    notify(done+' product'+(done===1?'':'s')+' published successfully.');
    setTimeout(()=>{
      try{if(typeof vendorDashboard==='function')vendorDashboard()}catch(_){}
      setTimeout(()=>{try{window.DBEST_VENDOR_GROWTH?.refreshVendorGrowth?.()}catch(_){}},300);
    },650);
  }catch(err){
    console.warn('DBest vendor catalogue publish',err);
    setStatus(form,'Could not publish: '+(err.message||'Please check the product details.'),'error');
    notify('Could not publish: '+(err.message||'Please check the product details.'));
  }finally{
    delete form.dataset.dbestPublishing;
    if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=btn.dataset.old||'Publish All Items'}
  }
}
function fix(){
  const card=document.getElementById('dbestMultiCatalogCard'),form=document.getElementById('dbestMultiProductForm'),host=document.getElementById('dbestMultiProductRows');if(!card||!form||!host||!token())return;
  host.querySelectorAll('.dbestMultiProductRow').forEach(r=>prepareRow(r,false));
  const title=card.querySelector('h3');if(title)title.textContent='Add Catalogue Items';
  const notice=card.querySelector('.notice');if(notice)notice.innerHTML='<b>Approved Vendor self-publishing.</b> Add one or more items and publish directly. Item category is taken automatically from your Vendor business category; you do not need to enter it for every product.';
  const add=[...card.querySelectorAll('button')].find(b=>/Add Another Product/i.test(b.textContent||''));if(add){add.dataset.dbestFixed='1';add.type='button';add.removeAttribute('onclick');add.onclick=function(e){e.preventDefault();e.stopPropagation();addRow()}}
  const submit=[...card.querySelectorAll('button')].find(b=>/Publish All Items|Submit All for Owner Approval/i.test(b.textContent||''));
  if(submit){
    submit.textContent='Publish All Items';submit.type='button';submit.dataset.dbestPublishAll='1';submit.removeAttribute('onclick');
    submit.onclick=function(e){e.preventDefault();e.stopPropagation();publishForm(form,submit)};
  }
  form.noValidate=true;
  form.onsubmit=function(e){e.preventDefault();if(submit)publishForm(form,submit);return false};
  statusBox(form);
}
[0,100,300,700,1400,2800,5000,9000].forEach(ms=>setTimeout(fix,ms));
const mo=new MutationObserver(()=>{clearTimeout(window.__dbestCatalogUxTimer);window.__dbestCatalogUxTimer=setTimeout(fix,40)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_CATALOG_UX={version:VERSION,fix,addRow,publish:()=>{const f=document.getElementById('dbestMultiProductForm'),b=f?.querySelector('[data-dbest-publish-all]');return publishForm(f,b)}};
})();