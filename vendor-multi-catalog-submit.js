(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const BRIDGE=BASE+'/functions/v1/marketplace-vendor-legacy-bridge';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
function getVendor(){try{return typeof marketVendor==='function'?marketVendor(vendorSession?.vendorId):null}catch(e){return null}}
function products(){try{return typeof commerceConfig!=='undefined'&&Array.isArray(commerceConfig.products)?commerceConfig.products:[]}catch(e){return []}}
function persist(){try{typeof save==='function'&&save()}catch(e){}}
function uniqueProductId(){let id='';do{id='MKT'+Date.now().toString().slice(-8)+Math.floor(Math.random()*1000).toString().padStart(3,'0')}while(products().some(p=>String(p.id)===id));return id}
async function fileMeta(file){
  if(!file)return null;
  try{if(typeof productImageMeta==='function')return await productImageMeta(file)}catch(e){}
  const out={name:file.name,type:file.type||'',size:file.size||0,selected:true};
  if(/^image\//i.test(file.type||'')&&file.size<=350000){try{out.preview=await new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>res(String(r.result||''));r.readAsDataURL(file)})}catch(e){}}
  return out;
}
function rowHtml(v,index){return `<div class="dbestMultiProductRow" data-row="${index}" style="border:1px solid #dce5f2;border-radius:16px;padding:12px;margin:10px 0;background:#fbfcff">
  <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px"><b>Product ${index+1}</b><button type="button" class="mini" onclick="DBEST_VENDOR_MULTI_CATALOG.removeRow(this)">Remove</button></div>
  <div class="serviceFormGrid">
    <div class="sf"><label>Item Name *</label><input name="name" required></div>
    <div class="sf"><label>Category *</label><input name="category" required></div>
    <div class="sf"><label>Unit *</label><input name="unit" placeholder="1 kg / piece / plate" required></div>
    <div class="sf"><label>Price ₹ *</label><input name="price" type="number" min="0" step="0.01" required></div>
    <div class="sf"><label>MRP ₹</label><input name="mrp" type="number" min="0" step="0.01"></div>
    <div class="sf"><label>Stock *</label><input name="stock" type="number" min="0" value="10" required></div>
    <div class="sf"><label>Discount / Offer %</label><input name="offer" type="number" min="0" max="90" value="0"></div>
    ${v?.type==='medicine'?'<div class="sf"><label><input name="rx" type="checkbox"> Prescription required</label></div>':''}
    <div class="sf full"><label>Product / Menu Image</label><input name="imageFile" type="file" accept="image/*"></div>
    <div class="sf full"><label>Or Image URL</label><input name="imageUrl" placeholder="https://..."></div>
  </div>
</div>`}
function renumber(host){[...host.querySelectorAll('.dbestMultiProductRow')].forEach((r,i)=>{r.dataset.row=String(i);const b=r.querySelector('b');if(b)b.textContent='Product '+(i+1)})}
function addRow(){const host=document.getElementById('dbestMultiProductRows'),v=getVendor();if(!host||!v)return;const wrap=document.createElement('div');wrap.innerHTML=rowHtml(v,host.querySelectorAll('.dbestMultiProductRow').length);host.appendChild(wrap.firstElementChild);renumber(host)}
function removeRow(btn){const host=document.getElementById('dbestMultiProductRows');if(!host)return;const rows=host.querySelectorAll('.dbestMultiProductRow');if(rows.length<=1)return notify('Keep at least one product row.');btn.closest('.dbestMultiProductRow')?.remove();renumber(host)}
async function submitBatch(e){
  e.preventDefault();const v=getVendor();if(!v)return notify('Vendor session not found. Please login again.');
  const rows=[...e.target.querySelectorAll('.dbestMultiProductRow')];if(!rows.length)return notify('Add at least one product.');
  const pending=[];
  try{
    for(const row of rows){
      const name=String(row.querySelector('[name="name"]')?.value||'').trim(),category=String(row.querySelector('[name="category"]')?.value||'').trim(),unit=String(row.querySelector('[name="unit"]')?.value||'').trim();
      const price=Number(row.querySelector('[name="price"]')?.value||0),mrpRaw=Number(row.querySelector('[name="mrp"]')?.value||0),stock=Number(row.querySelector('[name="stock"]')?.value||0),offer=Number(row.querySelector('[name="offer"]')?.value||0);
      const file=row.querySelector('[name="imageFile"]')?.files?.[0]||null,imageUrl=String(row.querySelector('[name="imageUrl"]')?.value||'').trim();
      if(!name||!category||!unit||!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0)throw new Error('Complete all required fields for every product.');
      if(!file&&!imageUrl)throw new Error('Add an image file or image URL for every product.');
      const img=await fileMeta(file),id=uniqueProductId();
      pending.push({id,type:v.type,vendorId:v.id,name,category,unit,price,mrp:mrpRaw>0?mrpRaw:price,stock,offer:Number.isFinite(offer)?Math.max(0,Math.min(90,offer)):0,active:false,rx:v.type==='medicine'&&!!row.querySelector('[name="rx"]')?.checked,image:imageUrl||img?.preview||'',imageRecord:img,approvalStatus:'Pending Owner Approval',ownerApproved:false,submittedAt:new Date().toISOString(),submittedBy:v.id});
    }
    commerceConfig.products.push(...pending);persist();notify(`${pending.length} product${pending.length===1?'':'s'} submitted together for Project Owner approval.`);if(typeof vendorDashboard==='function')vendorDashboard();
  }catch(err){notify(err.message||'Products could not be submitted. Please check the entries.')}
}
function enhanceVendor(){
  const v=getVendor();if(!v||document.getElementById('dbestMultiCatalogCard'))return;
  const cards=[...document.querySelectorAll('.sectionContent .ownerPanelCard')];
  const single=cards.find(c=>/Submit New Catalogue Item/i.test(c.querySelector('h3')?.textContent||''));if(!single)return;
  const card=document.createElement('div');card.id='dbestMultiCatalogCard';card.className='ownerPanelCard';card.style.marginTop='14px';card.innerHTML=`<h3>Submit Multiple Catalogue Items</h3><div class="notice"><b>Bulk catalogue submission enabled.</b> Add as many products as required and submit them together. Every product stays separate in the Owner approval queue and nothing becomes customer-visible before approval.</div><form id="dbestMultiProductForm"><div id="dbestMultiProductRows">${rowHtml(v,0)}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn soft" onclick="DBEST_VENDOR_MULTI_CATALOG.addRow()">＋ Add Another Product</button><button type="submit" class="btn">Submit All for Owner Approval</button></div></form>`;
  card.querySelector('form').onsubmit=submitBatch;single.parentNode.insertBefore(card,single);single.style.display='none';
}
async function publishApproved(p){
  if(!BASE||!KEY||!p)return;
  let token='';try{token=window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){}
  if(!token)return;
  const v=typeof marketVendor==='function'?marketVendor(p.vendorId):null;
  const r=await fetch(BRIDGE,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-owner-token':token},body:JSON.stringify({action:'owner_publish_catalog',id:p.id,vendorId:p.vendorId,marketType:p.type,name:p.name,description:[p.category,p.unit].filter(Boolean).join(' • '),price:p.price,mrp:p.mrp,stock:p.stock,offerPercent:p.offer||0,active:p.active!==false,imageUrl:p.image||'',vendorName:v?.name||''})});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'catalog_publish_failed')}
}
async function approveProduct(id,approve){
  const p=products().find(x=>String(x.id)===String(id));if(!p)return notify('Product not found.');
  const wasApproved=p.ownerApproved===true&&p.approvalStatus==='Approved';
  if(approve){
    const q=p.pendingProposal;if(q){p.price=Number(q.price??p.price);p.mrp=Number(q.mrp??p.mrp);p.stock=Number(q.stock??p.stock);p.offer=Number(q.offer??p.offer);p.active=q.active!==false;if(q.imageRecord){p.imageRecord=q.imageRecord;if(q.imageRecord.preview)p.image=q.imageRecord.preview}}
    else p.active=true;
    p.pendingProposal=null;p.proposalStatus='Approved';p.approvalStatus='Approved';p.ownerApproved=true;p.approvedAt=new Date().toISOString();persist();
    try{await publishApproved(p);notify('Product approved and published to the live catalogue.')}catch(e){notify('Product approved locally. Live catalogue publish will retry when Owner backend session is available.')}
  }else{
    if(p.pendingProposal&&wasApproved){p.pendingProposal=null;p.proposalStatus='Rejected / Revision Required';p.lastProposalRejectedAt=new Date().toISOString()}
    else{p.approvalStatus='Rejected';p.ownerApproved=false;p.active=false;p.rejectedAt=new Date().toISOString()}
    persist();notify('Product proposal rejected / sent back for revision.');
  }
  if(typeof ownerMarketplaceControl==='function')ownerMarketplaceControl();
}
function enhanceOwner(){
  let list;try{list=products()}catch(e){return}if(!list.length)return;
  const forms=[...document.querySelectorAll('.ownerProductGrid form.ownerProduct')];
  forms.forEach(form=>{
    const attr=form.getAttribute('onsubmit')||'',m=attr.match(/saveOwnerMarketItem\(event,'([^']+)'\)/);if(!m)return;const p=list.find(x=>String(x.id)===m[1]);if(!p||form.querySelector('[data-dbest-product-approval]'))return;
    const pending=p.approvalStatus!=='Approved'||!!p.pendingProposal;if(!pending)return;
    const box=document.createElement('div');box.dataset.dbestProductApproval='1';box.style.cssText='margin-top:9px;padding-top:9px;border-top:1px solid #e1e8f3';box.innerHTML=`<div style="margin-bottom:7px"><b>${esc(p.pendingProposal?'Pending Change':'Pending New Listing')}</b></div><button type="button" class="mini" data-act="approve">✓ Approve Listing</button> <button type="button" class="mini" data-act="reject">✕ Reject / Revise</button>`;
    box.querySelector('[data-act="approve"]').onclick=()=>approveProduct(p.id,true);box.querySelector('[data-act="reject"]').onclick=()=>approveProduct(p.id,false);form.appendChild(box);
  });
}
function wrap(name,after){const fn=window[name];if(typeof fn!=='function'||fn.__dbestMultiCatalogWrapped)return;const w=function(){const r=fn.apply(this,arguments);setTimeout(after,40);return r};w.__dbestMultiCatalogWrapped=true;w.__dbestOriginal=fn;window[name]=w}
function install(){wrap('vendorDashboard',enhanceVendor);wrap('ownerMarketplaceControl',enhanceOwner);if(document.querySelector('.vendorDashboardHead'))enhanceVendor();if(document.querySelector('.ownerProductGrid'))enhanceOwner()}
[0,150,500,1200].forEach(ms=>setTimeout(install,ms));
window.DBEST_VENDOR_MULTI_CATALOG={version:VERSION,install,addRow,removeRow,submitBatch,approveProduct};
})();