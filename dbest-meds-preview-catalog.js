(function(){
'use strict';
const VERSION='1.1.0',BUILD='20260827-1310-meds-images-instant-categories';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const API=BASE+'/functions/v1/dbest-meds-preview';
const VENDOR_ID='VMDDBEST001';
let installed=false,loaded=false,loading=false;

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
  if(/pain|fever|crocin|dolo|saridon|paracetamol|calpol|paracip/.test(t))return 'Pain & Fever';
  return 'OTC & Wellness';
}
function shortName(s){
  s=String(s||'Medicine').replace(/\s+-\s+.*$/,'').trim();
  return s.length>29?s.slice(0,27)+'…':s;
}
function visualType(p){
  const t=(String(p.name||'')+' '+String(p.description||'')).toLowerCase();
  if(/syrup|gel |gel$|mouthwash|solution|lotion|oil|sanitizer/.test(t))return 'bottle';
  if(/cream|ointment|balm|rub|toothpaste/.test(t))return 'tube';
  if(/sachet|powder|eno|ors/.test(t))return 'sachet';
  if(/inhaler|spray/.test(t))return 'spray';
  if(/thermometer|glucometer|strip|mask|bandage|gauze|cotton/.test(t))return 'care';
  return 'strip';
}
function palette(cat){
  const m={
    'Pain & Fever':['#eaf4ff','#1558b0','#72aef0'],
    'Cold & Cough':['#edf9f4','#14765b','#75c9a9'],
    'Acidity & Digestion':['#fff5e8','#a35d0c','#f2b35f'],
    'First Aid':['#fff0f1','#a82d39','#ef7a82'],
    'Pain Relief Topical':['#f4efff','#6940a5','#a98add'],
    'Vitamins & Nutrition':['#fff9df','#8a6a05','#e3c54c'],
    'Oral Care':['#e9fbff','#14758a','#6bc6d8'],
    "Women's Care":['#fff0f7','#a33a71','#ea8dba'],
    'Baby Care':['#fff7e8','#9a6819','#e8bd72'],
    'Health Devices & Hygiene':['#eef3f7','#405a70','#91aabd'],
    'OTC & Wellness':['#eef5ff','#1957b8','#7aa9e8']
  };
  return m[cat]||m['OTC & Wellness'];
}
function artwork(p,cat){
  const [bg,ink,accent]=palette(cat), kind=visualType(p), title=shortName(p.name), sku=String(p.id||'').replace('MEDDBEST','');
  let art='';
  if(kind==='bottle')art=`<rect x="242" y="84" width="116" height="156" rx="25" fill="${accent}"/><rect x="267" y="55" width="66" height="42" rx="10" fill="${ink}"/><rect x="260" y="135" width="80" height="55" rx="8" fill="#fff" opacity=".88"/>`;
  else if(kind==='tube')art=`<path d="M248 72h104l-14 172h-76z" fill="${accent}"/><rect x="266" y="55" width="68" height="24" rx="7" fill="${ink}"/><rect x="270" y="126" width="60" height="62" rx="8" fill="#fff" opacity=".88"/>`;
  else if(kind==='sachet')art=`<rect x="238" y="67" width="124" height="176" rx="16" fill="${accent}"/><path d="M248 86h104M248 224h104" stroke="${ink}" stroke-width="7" stroke-dasharray="8 7"/><rect x="258" y="122" width="84" height="70" rx="9" fill="#fff" opacity=".88"/>`;
  else if(kind==='spray')art=`<rect x="262" y="103" width="79" height="141" rx="20" fill="${accent}"/><path d="M280 103V76h83v25h-38v18" fill="none" stroke="${ink}" stroke-width="15" stroke-linejoin="round"/><rect x="273" y="147" width="57" height="50" rx="8" fill="#fff" opacity=".9"/>`;
  else if(kind==='care')art=`<rect x="232" y="80" width="136" height="154" rx="30" fill="#fff" stroke="${accent}" stroke-width="12"/><path d="M300 108v98M251 157h98" stroke="${ink}" stroke-width="25" stroke-linecap="round"/>`;
  else art=`<g transform="rotate(-10 300 155)"><rect x="222" y="86" width="156" height="143" rx="20" fill="#dfe7ef" stroke="${accent}" stroke-width="8"/>${Array.from({length:8},(_,i)=>`<circle cx="${250+(i%4)*34}" cy="${120+Math.floor(i/4)*63}" r="15" fill="#fff" stroke="${ink}" stroke-width="4"/>`).join('')}</g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><rect width="600" height="450" rx="32" fill="${bg}"/><circle cx="520" cy="-20" r="150" fill="${accent}" opacity=".18"/><circle cx="35" cy="430" r="115" fill="${accent}" opacity=".13"/><text x="42" y="66" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="${ink}">DBest Meds</text><rect x="42" y="87" width="135" height="35" rx="17" fill="${ink}" opacity=".11"/><text x="58" y="111" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="${ink}">${String(cat).replace(/&/g,'&amp;')}</text>${art}<rect x="28" y="322" width="544" height="96" rx="22" fill="#fff" opacity=".94"/><text x="49" y="360" font-family="Arial,sans-serif" font-size="25" font-weight="800" fill="#17253b">${title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text><text x="49" y="393" font-family="Arial,sans-serif" font-size="18" font-weight="600" fill="#66758a">OTC / Healthcare • SKU ${sku}</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function patchCategoryButtons(){
  try{
    if(typeof marketState==='undefined'||String(marketState.type||'').toLowerCase()!=='medicine')return;
    document.querySelectorAll('.categoryRow .categoryChip').forEach(btn=>{
      const label=String(btn.textContent||'').trim();
      btn.onclick=function(ev){
        if(ev)ev.preventDefault();
        if(typeof marketState!=='undefined')marketState.category=label;
        const fn=window.__DBEST_MEDS_ORIGINAL_OPEN_MARKETPLACE||window.openMarketplace;
        if(typeof fn==='function')fn('medicine',label,typeof marketState!=='undefined'?marketState.vendor:null);
        setTimeout(patchCategoryButtons,0);
      };
    });
  }catch(e){console.warn('DBest Meds category button patch',e)}
}
function installInstantCategoryWrapper(){
  try{
    if(window.__DBEST_MEDS_ORIGINAL_OPEN_MARKETPLACE||typeof window.openMarketplace!=='function')return;
    const original=window.openMarketplace;
    window.__DBEST_MEDS_ORIGINAL_OPEN_MARKETPLACE=original;
    window.openMarketplace=function(type,category=null,vendor=null){
      const out=original(type,category,vendor);
      if(String(type||'').toLowerCase()==='medicine')setTimeout(patchCategoryButtons,0);
      return out;
    };
  }catch(e){console.warn('DBest Meds instant category wrapper',e)}
}
async function loadPreview(){
  if(loading||!BASE||!KEY||typeof commerceConfig==='undefined')return;
  loading=true;
  try{
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok||!d.vendor||!Array.isArray(d.products))throw new Error(d.error||'preview_unavailable');
    commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];
    commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];
    commerceConfig.vendors=commerceConfig.vendors.filter(v=>String(v.type||'').toLowerCase()!=='medicine');
    commerceConfig.products=commerceConfig.products.filter(p=>String(p.type||'').toLowerCase()!=='medicine');
    commerceConfig.vendors.push({id:VENDOR_ID,name:d.vendor.name||'DBest Meds',type:'medicine',city:d.vendor.city||'',active:true,ownerApproval:'Approved',canPrice:true,canStock:true,canOffer:true,previewOnly:true,complianceStatus:d.complianceStatus||'drug_licence_required',agreement:{partnerSigned:true,ownerSigned:true,status:'Fully Signed'}});
    for(const p of d.products){
      const category=categoryFor(p);
      commerceConfig.products.push({id:String(p.id),type:'medicine',vendorId:VENDOR_ID,name:String(p.name||'Medicine'),category,unit:'OTC / Healthcare',description:String(p.description||''),price:Number(p.price||0),mrp:Number(p.mrp||p.price||0),stock:Number(p.stock||0),offer:Number(p.offer_percent||15),active:p.active!==false,image:artwork(p,category),ownerApproved:true,approvalStatus:'Approved',previewOnly:true,rx:false});
    }
    loaded=true;persist();installInstantCategoryWrapper();
    window.DBEST_MEDS_PREVIEW_READY={version:VERSION,build:BUILD,count:d.products.length,vendor:VENDOR_ID,inlineImages:true,instantCategories:true};
    try{if(typeof marketState!=='undefined'&&String(marketState.type||'').toLowerCase()==='medicine'&&typeof window.openMarketplace==='function')window.openMarketplace('medicine',marketState.category||'All',marketState.vendor||'All')}catch(_){}
  }catch(e){console.warn('DBest Meds preview catalogue',e)}finally{loading=false}
}
function installGuards(){
  if(installed)return;installed=true;
  try{
    if(typeof marketProductCard==='function'){
      const originalCard=marketProductCard;
      window.marketProductCard=function(p){
        if(!p||!p.previewOnly)return originalCard(p);
        const v=(typeof marketVendor==='function')?marketVendor(p.vendorId):null,discount=Number(p.offer||0);
        return `<div class="productCard"><div class="productImage"><img loading="lazy" decoding="async" src="${h(p.image||'')}" alt="${h(p.name)}"></div><div class="productBody"><b>${h(p.name)}</b><small>${h(p.unit||'OTC / Healthcare')} • ${h(p.category||'OTC')}</small><span class="vendorName">${h(v?.name||'DBest Meds')}</span>${discount?`<span class="offerTag">${discount}% OFF</span>`:''}<div class="productPrice"><strong>₹${Number(p.price||0).toFixed(2).replace(/\.00$/,'')}</strong>${Number(p.mrp||0)>Number(p.price||0)?`<del>₹${Number(p.mrp).toFixed(2).replace(/\.00$/,'')}</del>`:''}</div><small class="stockOk">${Number(p.stock||0)} available</small><div style="margin-top:8px;padding:9px 10px;border-radius:12px;background:#fff7e8;color:#8a5b00;font-size:11px;font-weight:800">Catalogue Preview • Pharmacy verification pending</div><button class="addCartBtn" type="button" disabled style="opacity:.58;cursor:not-allowed">Available Soon</button></div></div>`;
      };
    }
    if(typeof marketAdd==='function'){
      const originalAdd=marketAdd;
      window.marketAdd=function(type,id){try{const p=typeof marketProduct==='function'?marketProduct(id):null;if(p?.previewOnly){if(typeof toast==='function')toast('DBest Meds catalogue is visible. Ordering will open after pharmacy verification.');return}}catch(_){}return originalAdd(type,id)};
    }
    installInstantCategoryWrapper();
  }catch(e){console.warn('DBest Meds render guards',e)}
}
installGuards();
setTimeout(loadPreview,80);
setTimeout(()=>{if(!loaded)loadPreview()},700);
window.addEventListener('focus',()=>{if(!loaded)setTimeout(loadPreview,120)});
window.DBEST_MEDS_PREVIEW={version:VERSION,refresh:loadPreview,patchCategories:patchCategoryButtons};
})();