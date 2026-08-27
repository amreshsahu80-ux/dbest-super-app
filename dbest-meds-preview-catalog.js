(function(){
'use strict';
const VERSION='1.0.0',BUILD='20260827-dbest-meds-preview';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const API=BASE+'/functions/v1/dbest-meds-preview';
const VENDOR_ID='VMDDBEST001';
let installed=false;

function h(s){try{return typeof esc==='function'?esc(String(s||'')):String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}catch(_){return String(s||'')}}
function persist(){try{typeof save==='function'&&save()}catch(_){}}
function categoryFor(p){
  const d=String(p.description||''), n=String(p.name||''), t=(n+' '+d).toLowerCase();
  const lead=d.split('|')[0].trim();
  if(lead&&lead.length<45&&d.includes('|'))return lead;
  if(/baby|infant/.test(t))return 'Baby Care';
  if(/sanitary|whisper|stayfree|women|feminine/.test(t))return "Women's Care";
  if(/thermometer|glucometer|glucose strip|mask|sanitizer|hygiene/.test(t))return 'Health Devices & Hygiene';
  if(/sensodyne|listerine|mouthwash|oral|tooth/.test(t))return 'Oral Care';
  if(/vitamin|zinc|calcium|shelcal|limcee|becosules|zincovit|nutrition/.test(t))return 'Vitamins & Nutrition';
  if(/volini|moov|iodex|balm|spray|pain relief gel/.test(t))return 'Pain Relief Topical';
  if(/dettol|betadine|bandage|gauze|cotton|antiseptic|first aid/.test(t))return 'First Aid';
  if(/antacid|digene|gelusil|eno|pudin|digest|ors|electral|rehydrat/.test(t))return 'Acidity & Digestion';
  if(/cough|cold|vicks|strepsils|cofsils|nasivion|throat|lozenge/.test(t))return 'Cold & Cough';
  if(/pain|fever|crocin|dolo|saridon|paracetamol/.test(t))return 'Pain & Fever';
  return 'OTC & Wellness';
}
async function loadPreview(){
  if(!BASE||!KEY||typeof commerceConfig==='undefined')return;
  try{
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.vendor||!Array.isArray(d.products))throw new Error(d.error||'preview_unavailable');

    commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];
    commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];
    commerceConfig.vendors=commerceConfig.vendors.filter(v=>String(v.type||'').toLowerCase()!=='medicine');
    commerceConfig.products=commerceConfig.products.filter(p=>String(p.type||'').toLowerCase()!=='medicine');
    if(typeof commerceCarts!=='undefined'&&commerceCarts)commerceCarts.medicine=[];

    commerceConfig.vendors.push({
      id:VENDOR_ID,name:d.vendor.name||'DBest Meds',type:'medicine',city:d.vendor.city||'',active:true,
      ownerApproval:'Approved',canPrice:true,canStock:true,canOffer:true,previewOnly:true,
      complianceStatus:d.complianceStatus||'drug_licence_required',
      agreement:{partnerSigned:true,ownerSigned:true,status:'Fully Signed'}
    });

    for(const p of d.products){
      commerceConfig.products.push({
        id:String(p.id),type:'medicine',vendorId:VENDOR_ID,name:String(p.name||'Medicine'),
        category:categoryFor(p),unit:'OTC / Healthcare',description:String(p.description||''),
        price:Number(p.price||0),mrp:Number(p.mrp||p.price||0),stock:Number(p.stock||0),
        offer:Number(p.offer_percent||15),active:p.active!==false,image:String(p.image_url||''),
        ownerApproved:true,approvalStatus:'Approved',previewOnly:true,rx:false
      });
    }
    persist();
    window.DBEST_MEDS_PREVIEW_READY={version:VERSION,build:BUILD,count:d.products.length,vendor:VENDOR_ID};
    try{
      if(typeof marketState!=='undefined'&&String(marketState.type||'').toLowerCase()==='medicine'&&typeof openMarketplace==='function'){
        setTimeout(()=>openMarketplace('medicine'),0);
      }
    }catch(_){}
  }catch(e){console.warn('DBest Meds preview catalogue',e)}
}

function installGuards(){
  if(installed)return;installed=true;
  try{
    if(typeof marketProductCard==='function'){
      const originalCard=marketProductCard;
      window.marketProductCard=function(p){
        if(!p||!p.previewOnly)return originalCard(p);
        const v=(typeof marketVendor==='function')?marketVendor(p.vendorId):null;
        const discount=Number(p.offer||0);
        return `<div class="productCard"><div class="productImage"><img src="${h(p.image||'')}" alt="${h(p.name)}" onerror="this.style.display='none'"></div><div class="productBody"><b>${h(p.name)}</b><small>${h(p.unit||'OTC / Healthcare')} • ${h(p.category||'OTC')}</small><span class="vendorName">${h(v?.name||'DBest Meds')}</span>${discount?`<span class="offerTag">${discount}% OFF</span>`:''}<div class="productPrice"><strong>₹${Number(p.price||0).toFixed(2).replace(/\.00$/,'')}</strong>${Number(p.mrp||0)>Number(p.price||0)?`<del>₹${Number(p.mrp).toFixed(2).replace(/\.00$/,'')}</del>`:''}</div><small class="stockOk">${Number(p.stock||0)} available</small><div style="margin-top:8px;padding:9px 10px;border-radius:12px;background:#fff7e8;color:#8a5b00;font-size:11px;font-weight:800">Catalogue Preview • Pharmacy verification pending</div><button class="addCartBtn" type="button" disabled style="opacity:.58;cursor:not-allowed">Available Soon</button></div></div>`;
      };
    }
    if(typeof marketAdd==='function'){
      const originalAdd=marketAdd;
      window.marketAdd=function(type,id){
        try{const p=typeof marketProduct==='function'?marketProduct(id):null;if(p?.previewOnly){if(typeof toast==='function')toast('DBest Meds catalogue is visible. Ordering will open after pharmacy verification.');return}}catch(_){}
        return originalAdd(type,id);
      };
    }
  }catch(e){console.warn('DBest Meds render guards',e)}
}

installGuards();
setTimeout(loadPreview,180);
setTimeout(loadPreview,1450);
window.addEventListener('focus',()=>setTimeout(loadPreview,260));
window.DBEST_MEDS_PREVIEW={version:VERSION,refresh:loadPreview};
})();