(function(){
'use strict';
const VERSION='1.1.1',BUILD='20260827-1258-dbest-meds-preview-loader';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',API=BASE+'/functions/v1/marketplace-live';
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function persist(){try{typeof save==='function'&&save()}catch(e){}}
async function call(action,body={}){const h={'apikey':KEY,'Content-Type':'application/json'};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'marketplace_live_error');return d}
function liveRow(p){return {id:p.id,type:String(p.market_type||'').trim().toLowerCase(),vendorId:p.vendor_id,name:p.name,category:'Live Catalogue',unit:'',price:Number(p.price||0),mrp:Number(p.mrp||p.price||0),stock:Number(p.stock||0),offer:Number(p.offer_percent||0),active:p.active!==false,image:p.image_url||'',ownerApproved:true,approvalStatus:'Approved',liveBackend:true}}
function liveVendor(v){return {id:v.id,name:v.name,type:String(v.type||'').trim().toLowerCase(),city:v.city||'',active:true,ownerApproval:'Approved',liveBackend:true,canPrice:true,canStock:true,canOffer:true,agreement:{partnerSigned:true,ownerSigned:true,status:'Fully Signed'}}}
async function enforce(){
  if(!BASE||!KEY||typeof commerceConfig==='undefined')return;
  try{
    const d=await call('public_catalog',{}),vs=Array.isArray(d.vendors)?d.vendors:[],ps=Array.isArray(d.products)?d.products:[];
    if(!ps.length)return;
    commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];
    commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];
    const oldProducts=[...commerceConfig.products];
    const liveTypes=new Set(ps.map(p=>String(p.market_type||'').trim().toLowerCase()).filter(Boolean));
    const mapped=ps.map(liveRow);
    const mappedVendors=vs.map(liveVendor);
    const liveVendorIds=new Set(mappedVendors.map(v=>String(v.id)));

    commerceConfig.products=commerceConfig.products.filter(p=>!liveTypes.has(String(p.type||'').trim().toLowerCase()));
    for(const row of mapped)commerceConfig.products.push(row);

    commerceConfig.vendors=commerceConfig.vendors.filter(v=>{
      const t=String(v.type||'').trim().toLowerCase();
      return !liveTypes.has(t)||liveVendorIds.has(String(v.id));
    });
    for(const v of mappedVendors){let x=commerceConfig.vendors.find(q=>String(q.id)===String(v.id));if(x)Object.assign(x,v);else commerceConfig.vendors.push(v)}

    if(typeof commerceCarts!=='undefined'&&commerceCarts){
      for(const type of liveTypes){const cart=Array.isArray(commerceCarts[type])?commerceCarts[type]:[];if(!cart.length)continue;const next=[];for(const r of cart){let old=oldProducts.find(p=>String(p.id)===String(r.id));let target=mapped.find(p=>p.type===type&&old&&norm(p.name)===norm(old.name)&&Number(p.price)===Number(old.price));if(!target&&mapped.some(p=>String(p.id)===String(r.id)))target=mapped.find(p=>String(p.id)===String(r.id));if(target){const ex=next.find(x=>x.id===target.id);if(ex)ex.qty+=Number(r.qty||1);else next.push({id:target.id,qty:Number(r.qty||1)})}}
        commerceCarts[type]=next;
      }
    }
    persist();
    window.DBEST_LIVE_CATALOG_READY={version:VERSION,build:BUILD,types:[...liveTypes],productCount:mapped.length,vendorCount:mappedVendors.length};
    try{if(typeof marketState!=='undefined'&&typeof openMarketplace==='function'&&document.querySelector('.shopPage')&&liveTypes.has(String(marketState.type||'').toLowerCase()))setTimeout(()=>openMarketplace(marketState.type),0)}catch(_){}
  }catch(e){console.warn('Live Marketplace catalogue authority',e)}
}
setTimeout(enforce,50);setTimeout(enforce,1200);
window.addEventListener('focus',()=>setTimeout(enforce,50));
window.DBEST_MARKETPLACE_LIVE_CATALOG={version:VERSION,enforce};
try{
  if(!document.querySelector('script[data-dbest-meds-preview]')){
    const s=document.createElement('script');
    s.src='./dbest-meds-preview-catalog.js?v='+BUILD;
    s.setAttribute('data-dbest-meds-preview','1');
    (document.body||document.documentElement).appendChild(s);
  }
}catch(e){console.warn('DBest Meds preview loader',e)}
})();