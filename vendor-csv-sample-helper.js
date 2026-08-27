(function(){
'use strict';
const VERSION='1.0.0',BUILD='20260827-1333-vendor-csv-sample';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function vendorType(){try{return String(marketVendor(vendorSession?.vendorId)?.type||'marketplace').toLowerCase()}catch(_){return'marketplace'}}
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
 if(type==='digital')return [
  ['DIG001','Website Design Starter','Web Services','1 service',4999,5999,99,10,'yes',''],
  ['DIG002','Logo Design','Design Services','1 service',999,1499,99,15,'yes',''],
  ['DIG003','Social Media Poster Pack','Design Services','10 posters',1499,1999,99,10,'yes',''],
  ['DIG004','Business Email Setup','IT Services','1 setup',799,999,99,10,'yes','']
 ];
 return [
  ['SKU001','Sample Product 1','General','1 piece',100,120,25,10,'yes',''],
  ['SKU002','Sample Product 2','General','500 g',180,200,40,10,'yes',''],
  ['SKU003','Sample Product 3','Beverages','1 bottle',60,70,50,15,'yes',''],
  ['SKU004','Sample Product 4','Snacks','1 pack',45,50,75,10,'yes',''],
  ['SKU005','Sample Product 5','Personal Care','1 unit',210,240,20,12,'yes','']
 ];
}
function csv(type){const head=['sku','name','category','unit','price','mrp','stock','offer_percent','active','image_url'],rows=samples(type),q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\uFEFF'+[head,...rows].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n'}
function downloadSample(){const type=vendorType(),blob=new Blob([csv(type)],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`DBest_${type}_Filled_Sample_Inventory.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function table(type){const rows=samples(type).slice(0,5);return `<div style="overflow:auto;margin-top:8px"><table style="min-width:780px"><tr><th>SKU</th><th>Item Name</th><th>Category</th><th>Unit</th><th>Price</th><th>MRP</th><th>Stock</th><th>Offer</th></tr>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>₹${esc(r[4])}</td><td>₹${esc(r[5])}</td><td>${esc(r[6])}</td><td>${esc(r[7])}%</td></tr>`).join('')}</table></div>`}
function enhance(){const card=document.getElementById('dbestCsvBulkCard');if(!card||card.dataset.sampleReady==='1')return;card.dataset.sampleReady='1';const type=vendorType(),controls=card.querySelector('#dbestCsvTemplateBtn')?.parentElement;const guide=document.createElement('div');guide.id='dbestCsvSampleGuide';guide.style.cssText='margin:10px 0;padding:12px;border:1px solid #dce5f2;border-radius:14px;background:#fbfcff';guide.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><div><b style="font-size:14px">Sample CSV — See Before You Upload</b><small style="display:block;color:#61708a;margin-top:3px">This sample is tailored for ${esc(type==='restaurant'?'Restaurants & Food':type==='medicine'?'Medicines':type==='grocery'?'Grocery':type==='digital'?'Digital Items':'Marketplace')} vendors.</small></div><button type="button" class="mini" id="dbestDownloadFilledSample">⬇ Download Filled Sample CSV</button></div>${table(type)}<div style="margin-top:10px;font-size:12px;line-height:1.65;color:#31465f"><b>How to submit a large inventory:</b><br>1. Download the filled sample CSV.<br>2. Open it in Excel or Google Sheets and replace the sample rows with your own items.<br>3. Keep the same column headings and use a unique SKU for each item.<br>4. Save/download the file as <b>CSV</b>.<br>5. Tap <b>Choose CSV</b>, review the preview, then tap <b>Import Items</b>.</div><div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:#eef4ff;color:#184f9e;font-size:11px;font-weight:650">Tip: image_url is optional. You can leave it blank and add/change product images later from your Vendor Dashboard.</div>`;
 if(controls)controls.parentNode.insertBefore(guide,controls);else card.appendChild(guide);
 guide.querySelector('#dbestDownloadFilledSample').onclick=downloadSample;
 const old=card.querySelector('#dbestCsvTemplateBtn');if(old)old.textContent='⬇ Download Starter Template';
 const note=card.querySelector('#dbestCsvBulkStatus');if(note)note.innerHTML='<b>Ready to upload?</b> Use the filled sample above or the starter template, complete your inventory, then choose the CSV file here.';
}
function install(){enhance()}
[80,250,600,1200,2500,5000].forEach(ms=>setTimeout(install,ms));const mo=new MutationObserver(()=>{clearTimeout(window.__dbestCsvSampleTimer);window.__dbestCsvSampleTimer=setTimeout(install,80)});if(document.documentElement)mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_CSV_SAMPLE={version:VERSION,build:BUILD,install,downloadSample};
})();