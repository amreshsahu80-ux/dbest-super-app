(function(){
'use strict';
const VERSION='1.0.0',BUILD='20260829-0705-vendor-clean-catalog-tools';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const BULK=BASE+'/functions/v1/vendor-catalog-bulk-live';
const VTK='dbest_vendor_live_token';
let mode='single',csvRows=[],busy=false,installed=false;

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>{try{return localStorage.getItem(VTK)||''}catch(_){return''}};
function currentVendor(){try{return vendor||null}catch(_){return null}}
function notify(msg,ok=true){try{if(typeof note==='function'){note(msg,ok);return}}catch(_){}try{alert(String(msg).replace(/<[^>]+>/g,''))}catch(_){}}
function refresh(){try{if(typeof loadDashboard==='function')loadDashboard(true)}catch(_){}}
async function bulkCall(action,body={}){
  if(!BASE||!KEY||!token())throw new Error('Vendor session expired. Please login again.');
  const r=await fetch(BULK,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-vendor-token':token()},body:JSON.stringify({action,...body})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.detail||d.error||('HTTP '+r.status));
  return d;
}
function vendorType(){return String(currentVendor()?.type||'marketplace').toLowerCase()}
function activeValue(v){return !['no','false','0','off','inactive','hidden'].includes(String(v??'yes').trim().toLowerCase())}
function key(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
const aliases={sku:'sku',item_id:'id',id:'id',name:'name',item_name:'name',product_name:'name',category:'category',unit:'unit',pack:'unit',price:'price',base_price:'price',mrp:'mrp',stock:'stock',qty:'stock',quantity:'stock',offer:'offer_percent',offer_percent:'offer_percent',discount:'offer_percent',discount_percent:'offer_percent',active:'active',image:'image_url',image_url:'image_url',photo_url:'image_url'};
function normaliseRow(r){
  const price=Number(r.price),stock=Number(r.stock),mrp=r.mrp===''||r.mrp===undefined?price:Number(r.mrp),offer=r.offer_percent===''||r.offer_percent===undefined?0:Number(r.offer_percent);
  return {sku:String(r.sku||'').trim(),name:String(r.name||'').trim(),category:String(r.category||'').trim(),unit:String(r.unit||'').trim(),price,mrp,stock,offer_percent:offer,active:activeValue(r.active),image_url:String(r.image_url||'').trim(),__row:r.__row};
}
function validate(rows){
  const errors=[],skuSet=new Set();
  rows.forEach((raw,i)=>{
    const r=normaliseRow(raw),n=raw.__row||i+1;
    if(!r.name)errors.push(`Row ${n}: Item Name required`);
    if(!r.category)errors.push(`Row ${n}: Category required`);
    if(!r.unit)errors.push(`Row ${n}: Unit required`);
    if(!(r.price>0))errors.push(`Row ${n}: Price must be above 0`);
    if(!Number.isFinite(r.stock)||r.stock<0)errors.push(`Row ${n}: Stock must be 0 or more`);
    if(!(r.mrp>0)||r.mrp<r.price)errors.push(`Row ${n}: MRP must be equal to or above Price`);
    if(!Number.isFinite(r.offer_percent)||r.offer_percent<0||r.offer_percent>90)errors.push(`Row ${n}: Offer % must be 0–90`);
    if(r.image_url&&!/^https:\/\//i.test(r.image_url))errors.push(`Row ${n}: Image URL must start with https://`);
    if(r.sku){const s=r.sku.toLowerCase();if(skuSet.has(s))errors.push(`Row ${n}: Duplicate SKU ${r.sku}`);skuSet.add(s)}
  });
  return errors;
}
function samples(type){
  if(type==='restaurant')return [
    ['FOOD001','Chicken Biryani','Biryani','1 plate',180,220,30,10,'yes',''],
    ['FOOD002','Paneer Masala','Main Course','1 plate',160,190,25,10,'yes',''],
    ['FOOD003','Veg Chowmein','Noodles','1 plate',100,120,35,8,'yes',''],
    ['FOOD004','Masala Chai','Beverages','1 cup',30,35,80,5,'yes',''],
    ['FOOD005','Cold Coffee','Beverages','1 glass',90,110,40,10,'yes','']
  ];
  if(type==='medicine')return [
    ['MED001','Crocin Advance 500mg','Pain & Fever','20 tablets',16.41,19.31,50,15,'yes',''],
    ['MED002','Electral ORS','Hydration','21.8 g sachet',19.59,23.05,60,15,'yes',''],
    ['MED003','ENO Lemon','Acidity & Digestion','100 g',157.25,185,25,15,'yes',''],
    ['MED004','Vicks VapoRub','Cold & Cough','50 ml',169.15,199,30,15,'yes',''],
    ['MED005','Boroline','First Aid & Skin','20 g',35.87,42.20,40,15,'yes','']
  ];
  if(type==='grocery')return [
    ['GRO001','Fortune Atta','Staples','5 kg',280,310,25,5,'yes',''],
    ['GRO002','Tata Salt','Staples','1 kg',28,30,50,5,'yes',''],
    ['GRO003','Amul Butter','Dairy','500 g',285,295,20,3,'yes',''],
    ['GRO004','Surf Excel Easy Wash','Home Care','1 kg',150,165,30,8,'yes',''],
    ['GRO005','Parle-G Biscuits','Snacks','800 g',75,80,45,5,'yes','']
  ];
  if(type==='electronics')return [
    ['ELE001','USB Type-C Cable','Mobile Accessories','1 piece',249,399,30,20,'yes',''],
    ['ELE002','20W Fast Charger','Mobile Accessories','1 piece',699,999,18,20,'yes',''],
    ['ELE003','Bluetooth Speaker','Audio','1 piece',899,1299,12,15,'yes',''],
    ['ELE004','Wireless Mouse','Computer Accessories','1 piece',499,699,20,10,'yes',''],
    ['ELE005','Power Bank 10000mAh','Mobile Accessories','1 piece',1099,1499,15,15,'yes','']
  ];
  if(type==='fashion')return [
    ['FAS001','Cotton T-Shirt','Men Clothing','1 piece',399,599,25,15,'yes',''],
    ['FAS002','Women Kurti','Women Clothing','1 piece',699,999,18,15,'yes',''],
    ['FAS003','Kids T-Shirt','Kids Clothing','1 piece',299,449,30,10,'yes',''],
    ['FAS004','Casual Shirt','Men Clothing','1 piece',599,899,20,15,'yes',''],
    ['FAS005','Leggings','Women Clothing','1 piece',349,499,25,10,'yes','']
  ];
  return [
    ['SKU001','Sample Product 1','General','1 piece',100,120,25,10,'yes',''],
    ['SKU002','Sample Product 2','General','500 g',180,200,40,10,'yes',''],
    ['SKU003','Sample Product 3','Beverages','1 bottle',60,70,50,15,'yes',''],
    ['SKU004','Sample Product 4','Snacks','1 pack',45,50,75,10,'yes',''],
    ['SKU005','Sample Product 5','Personal Care','1 unit',210,240,20,12,'yes','']
  ];
}
const headers=['sku','name','category','unit','price','mrp','stock','offer_percent','active','image_url'];
const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
function csvText(filled){const rows=filled?samples(vendorType()):[['SKU001','Sample Item','General','1 piece',100,120,25,10,'yes','']];return '\uFEFF'+[headers,...rows].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n'}
function downloadCsv(filled){const type=vendorType(),blob=new Blob([csvText(filled)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filled?`DBest_${type}_Filled_Sample_Inventory.csv`:`DBest_${type}_Catalogue_Template.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function parseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=ch}else if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell=''}else if(ch!=='\r')cell+=ch}
  if(cell.length||row.length){row.push(cell);rows.push(row)}
  return rows.filter(r=>r.some(c=>String(c).trim()!==''));
}
function rowsFromCSV(text){
  const grid=parseCSV(text);if(grid.length<2)throw new Error('CSV must contain a header row and at least one item.');
  const hs=grid[0].map(h=>aliases[key(h)]||key(h)),needed=['name','category','unit','price','stock'];
  for(const n of needed)if(!hs.includes(n))throw new Error('Missing required column: '+n);
  if(grid.length-1>500)throw new Error('Maximum 500 items are allowed in one CSV file.');
  return grid.slice(1).map((r,i)=>{const o={__row:i+2};hs.forEach((h,j)=>{if(h)o[h]=String(r[j]??'').trim()});return o});
}
function sampleTable(){return `<div class="dbestSampleTable"><table><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Unit</th><th>Price</th><th>Stock</th></tr></thead><tbody>${samples(vendorType()).slice(0,5).map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>₹${esc(r[4])}</td><td>${esc(r[6])}</td></tr>`).join('')}</tbody></table></div>`}
function modeName(t){return t==='restaurant'?'Restaurant / Food':t==='medicine'?'Medicines / Pharmacy':t==='grocery'?'Grocery':t==='fashion'?'Fashion':t==='electronics'?'Electronics':'Marketplace'}
function rowHtml(index){return `<div class="dbestMultiRow" data-row="${index}"><div class="dbestMultiHead"><b>Product ${index+1}</b><button type="button" class="dbestMini danger" data-remove-row>Remove</button></div><div class="dbestToolGrid"><div class="field"><label>SKU</label><input name="sku" placeholder="Optional"></div><div class="field"><label>Product / Item Name *</label><input name="name" required></div><div class="field"><label>Category *</label><input name="category" required></div><div class="field"><label>Unit *</label><input name="unit" placeholder="1 piece / plate / kg" required></div><div class="field"><label>Selling Price ₹ *</label><input name="price" type="number" min="0.01" step="0.01" required></div><div class="field"><label>MRP ₹</label><input name="mrp" type="number" min="0.01" step="0.01"></div><div class="field"><label>Stock *</label><input name="stock" type="number" min="0" value="1" required></div><div class="field"><label>Offer %</label><input name="offer" type="number" min="0" max="90" value="0"></div><div class="field full"><label>Image URL</label><input name="imageUrl" placeholder="https://... (optional)"></div><div class="full dbestCheck"><label><input type="checkbox" name="active" checked> Available for sale</label></div></div></div>`}
function renumberRows(){document.querySelectorAll('#dbestMultiRows .dbestMultiRow').forEach((r,i)=>{r.dataset.row=String(i);const b=r.querySelector('.dbestMultiHead b');if(b)b.textContent='Product '+(i+1)})}
function addMultiRow(){const host=document.getElementById('dbestMultiRows');if(!host)return;const count=host.querySelectorAll('.dbestMultiRow').length;if(count>=50)return notify('Maximum 50 products can be entered manually. Please use CSV for larger inventory.',false);const w=document.createElement('div');w.innerHTML=rowHtml(count);const row=w.firstElementChild;host.appendChild(row);row.querySelector('[data-remove-row]').onclick=()=>removeMultiRow(row);renumberRows();row.scrollIntoView({behavior:'smooth',block:'nearest'})}
function removeMultiRow(row){const host=document.getElementById('dbestMultiRows');if(!host||!row)return;const rows=host.querySelectorAll('.dbestMultiRow');if(rows.length<=1)return notify('Keep at least one product row.',false);row.remove();renumberRows()}
function collectMultiRows(){return [...document.querySelectorAll('#dbestMultiRows .dbestMultiRow')].map((row,i)=>({__row:i+1,sku:row.querySelector('[name="sku"]')?.value||'',name:row.querySelector('[name="name"]')?.value||'',category:row.querySelector('[name="category"]')?.value||'',unit:row.querySelector('[name="unit"]')?.value||'',price:row.querySelector('[name="price"]')?.value||'',mrp:row.querySelector('[name="mrp"]')?.value||'',stock:row.querySelector('[name="stock"]')?.value||'',offer_percent:row.querySelector('[name="offer"]')?.value||'',image_url:row.querySelector('[name="imageUrl"]')?.value||'',active:row.querySelector('[name="active"]')?.checked?'yes':'no'}))}
async function submitMultiple(e){
  e.preventDefault();if(busy)return;const rows=collectMultiRows(),errs=validate(rows);if(errs.length)return notify(errs.slice(0,4).join('\n'),false);
  busy=true;const btn=document.getElementById('dbestMultiSave');if(btn){btn.disabled=true;btn.textContent='Saving…'};
  try{const d=await bulkCall('bulk_save',{items:rows.map(normaliseRow)});notify(`✓ Saved ${Number(d.saved??rows.length)} product(s). ${Number(d.created||0)} new, ${Number(d.updated||0)} updated.`);const host=document.getElementById('dbestMultiRows');if(host){host.innerHTML=rowHtml(0);host.querySelector('[data-remove-row]').onclick=()=>removeMultiRow(host.querySelector('.dbestMultiRow'))}refresh()}catch(e2){notify('Multiple product save failed: '+(e2.message||'Please try again.'),false)}finally{busy=false;if(btn){btn.disabled=false;btn.textContent='Save All Products'}}
}
function csvStatus(msg,kind='info'){const el=document.getElementById('dbestCsvStatus');if(!el)return;el.innerHTML=msg;el.className='dbestToolStatus '+kind}
function renderCsvPreview(){
  const box=document.getElementById('dbestCsvPreview'),btn=document.getElementById('dbestCsvImport');if(!box||!btn)return;const errs=validate(csvRows);btn.disabled=!csvRows.length||!!errs.length;btn.textContent=csvRows.length?`Import ${csvRows.length} Items`:'Import Items';
  if(errs.length){box.innerHTML='<div class="dbestErrors">'+errs.slice(0,12).map(esc).join('<br>')+(errs.length>12?`<br>+ ${errs.length-12} more error(s)`:``)+'</div>';csvStatus(`CSV has ${errs.length} validation error(s). Please correct them before import.`,'bad');return}
  if(!csvRows.length){box.innerHTML='';return}
  const show=csvRows.slice(0,8).map(normaliseRow);box.innerHTML=`<div class="dbestSampleTable"><table><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Unit</th><th>Price</th><th>Stock</th></tr></thead><tbody>${show.map(r=>`<tr><td>${esc(r.sku||'—')}</td><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${esc(r.unit)}</td><td>₹${esc(r.price)}</td><td>${esc(r.stock)}</td></tr>`).join('')}</tbody></table></div>${csvRows.length>8?`<small class="dbestHint">Previewing first 8 of ${csvRows.length} rows.</small>`:''}`;csvStatus(`✓ ${csvRows.length} item(s) ready to import.`,'good')
}
async function chooseCsv(file){if(!file)return;try{if(!/\.csv$/i.test(file.name)&&!/^text\//i.test(file.type||''))throw new Error('Please select a CSV file.');csvRows=rowsFromCSV(await file.text());renderCsvPreview()}catch(e){csvRows=[];renderCsvPreview();csvStatus(esc(e.message||'Could not read CSV.'),'bad')}}
async function importCsv(){
  if(busy||!csvRows.length)return;const errs=validate(csvRows);if(errs.length)return renderCsvPreview();busy=true;const btn=document.getElementById('dbestCsvImport');if(btn){btn.disabled=true;btn.textContent='Importing…'};csvStatus(`Importing ${csvRows.length} items. Please keep this page open…`,'info');
  try{const d=await bulkCall('bulk_save',{items:csvRows.map(normaliseRow)});let msg=`✓ Saved ${Number(d.saved??csvRows.length)} of ${Number(d.requested??csvRows.length)} item(s): ${Number(d.created||0)} new, ${Number(d.updated||0)} updated.`;if(d.failed)msg+=`<br>${Number(d.failed)} row(s) were skipped.`;csvStatus(msg,d.failed?'info':'good');notify(`${Number(d.saved??csvRows.length)} catalogue item(s) imported successfully.`);csvRows=[];const f=document.getElementById('dbestCsvFile');if(f)f.value='';renderCsvPreview();refresh()}catch(e){csvStatus('Import failed: '+esc(e.message||'Please try again.'),'bad');notify('CSV import failed: '+(e.message||'Please try again.'),false)}finally{busy=false;if(btn){btn.disabled=!csvRows.length;btn.textContent=csvRows.length?`Import ${csvRows.length} Items`:'Import Items'}}
}
function setMode(next){
  mode=next;document.querySelectorAll('[data-dbest-catalog-mode]').forEach(b=>b.classList.toggle('on',b.dataset.dbestCatalogMode===next));
  const single=document.getElementById('catalogForm'),multi=document.getElementById('dbestMultiPanel'),csv=document.getElementById('dbestCsvPanel');
  if(single)single.style.display=next==='single'?'':'none';if(multi)multi.classList.toggle('hidden',next!=='multiple');if(csv)csv.classList.toggle('hidden',next!=='csv');
}
function installStyle(){if(document.getElementById('dbestCleanCatalogToolsStyle'))return;const s=document.createElement('style');s.id='dbestCleanCatalogToolsStyle';s.textContent=`
#dbestCatalogTools{margin:0 0 14px}.dbestCatalogModeTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:11px}.dbestCatalogModeTabs button{border:1px solid #dce5f1;background:#fff;color:#41526b;border-radius:12px;padding:11px 6px;font-size:12px;font-weight:900;cursor:pointer}.dbestCatalogModeTabs button.on{background:#175cff;color:#fff;border-color:#175cff}.dbestToolsPanel{border:1px solid #dce5f1;border-radius:16px;padding:12px;background:#fbfcff;margin-bottom:12px}.dbestToolGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dbestMultiRow{border:1px solid #e0e7f1;border-radius:14px;background:#fff;padding:11px;margin:9px 0}.dbestMultiHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.dbestMini{border:0;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:850;background:#edf3ff;color:#1753bc;cursor:pointer}.dbestMini.danger{background:#fff0ef;color:#a52e2e}.dbestCheck{font-size:12px;font-weight:800}.dbestToolActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.dbestToolActions .btn,.dbestToolActions .dbestMini{flex:1;min-width:145px}.dbestToolStatus{padding:10px 11px;border-radius:11px;border:1px solid #cbdcff;background:#eef4ff;color:#184f9e;font-size:12px;font-weight:700;margin-top:9px}.dbestToolStatus.good{background:#ecf9f0;color:#17623a;border-color:#c9ead5}.dbestToolStatus.bad{background:#fff0ef;color:#a52e2e;border-color:#f0cdca}.dbestSampleTable{overflow:auto;margin-top:9px}.dbestSampleTable table{border-collapse:collapse;min-width:650px;width:100%;font-size:11px}.dbestSampleTable th,.dbestSampleTable td{text-align:left;padding:7px;border-bottom:1px solid #e4eaf2;white-space:nowrap}.dbestSampleTable th{background:#f1f5fb;color:#44546b}.dbestHint{display:block;margin-top:7px;color:#61708a}.dbestErrors{color:#a52e2e;font-size:12px;font-weight:750;line-height:1.55;margin-top:8px}.dbestFileLabel{display:inline-flex;align-items:center;justify-content:center;gap:6px;text-align:center}.dbestIntro{font-size:12px;color:#526177;line-height:1.55;margin:3px 0 8px}
@media(max-width:650px){.dbestToolGrid{grid-template-columns:1fr}.dbestCatalogModeTabs button{font-size:11px;padding:10px 3px}.dbestToolActions{display:grid;grid-template-columns:1fr}.dbestToolActions .btn,.dbestToolActions .dbestMini{width:100%}}
`;document.head.appendChild(s)}
function install(){
  if(installed)return;const panel=document.getElementById('panel-catalogue'),form=document.getElementById('catalogForm');if(!panel||!form)return;const card=form.closest('.card')||panel.querySelector('.card');if(!card)return;
  installStyle();const tools=document.createElement('div');tools.id='dbestCatalogTools';tools.innerHTML=`<div class="dbestCatalogModeTabs"><button type="button" class="on" data-dbest-catalog-mode="single">＋ Single</button><button type="button" data-dbest-catalog-mode="multiple">＋ Multiple</button><button type="button" data-dbest-catalog-mode="csv">📄 CSV</button></div><section id="dbestMultiPanel" class="dbestToolsPanel hidden"><h3>＋ Add Multiple Products</h3><div class="dbestIntro">Add several products together. For more than 50 items, use CSV upload.</div><form id="dbestMultiForm"><div id="dbestMultiRows">${rowHtml(0)}</div><div class="dbestToolActions"><button type="button" class="btn soft" id="dbestAddRow">＋ Add Another Product</button><button type="submit" class="btn" id="dbestMultiSave">Save All Products</button></div></form></section><section id="dbestCsvPanel" class="dbestToolsPanel hidden"><h3>📄 Upload Catalogue by CSV</h3><div class="dbestIntro"><b>${esc(modeName(vendorType()))} sample shown below.</b> Download it, edit in Excel/Google Sheets, save as CSV and upload. Up to 500 items per file.</div><div id="dbestCsvSample">${sampleTable()}</div><div class="dbestToolActions"><button type="button" class="dbestMini" id="dbestFilledSample">⬇ Filled Sample CSV</button><button type="button" class="dbestMini" id="dbestStarterTemplate">⬇ Starter Template</button><label class="dbestMini dbestFileLabel">📤 Choose CSV File<input id="dbestCsvFile" type="file" accept=".csv,text/csv" style="display:none"></label><button type="button" class="btn" id="dbestCsvImport" disabled>Import Items</button></div><div class="dbestHint"><b>Columns:</b> sku, name, category, unit, price, mrp, stock, offer_percent, active, image_url</div><div id="dbestCsvStatus" class="dbestToolStatus">Download the filled sample or starter template, complete your inventory, then choose the CSV file.</div><div id="dbestCsvPreview"></div></section>`;
  form.parentNode.insertBefore(tools,form);tools.querySelectorAll('[data-dbest-catalog-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.dbestCatalogMode));tools.querySelector('#dbestAddRow').onclick=addMultiRow;tools.querySelector('#dbestMultiForm').onsubmit=submitMultiple;tools.querySelector('#dbestMultiRows [data-remove-row]').onclick=()=>removeMultiRow(tools.querySelector('#dbestMultiRows .dbestMultiRow'));tools.querySelector('#dbestFilledSample').onclick=()=>downloadCsv(true);tools.querySelector('#dbestStarterTemplate').onclick=()=>downloadCsv(false);tools.querySelector('#dbestCsvFile').onchange=e=>chooseCsv(e.target.files?.[0]);tools.querySelector('#dbestCsvImport').onclick=importCsv;installed=true;setMode(mode)
}
[0,150,400,900,1600,3000].forEach(ms=>setTimeout(install,ms));
const mo=new MutationObserver(()=>{if(!installed)setTimeout(install,60)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_CLEAN_CATALOG_TOOLS={version:VERSION,build:BUILD,install,setMode,addMultiRow,downloadFilledSample:()=>downloadCsv(true),downloadStarterTemplate:()=>downloadCsv(false)};
})();
