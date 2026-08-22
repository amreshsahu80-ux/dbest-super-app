(function(){
'use strict';
const VERSION='1.0.0',BUILD='20260823-0445-live-catalog';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',API=BASE+'/functions/v1/marketplace-live';
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function persist(){try{typeof save==='function'&&save()}catch(e){}}
async function call(action,body={}){const h={'apikey':KEY,'Content-Type':'application/json'};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'marketplace_live_error');return d}
function liveRow(p){return {id:p.id,type:p.market_type,vendorId:p.vendor_id,name:p.name,category:'Live Catalogue',unit:'',price:Number(p.price||0),mrp:Number(p.mrp||p.price||0),stock:Number(p.stock||0),offer:Number(p.offer_percent||0),active:p.active!==false,image:p.image_url||'',ownerApproved:true,approvalStatus:'Approved',liveBackend:true}}
async function enforce(){
  if(!BASE||!KEY||typeof commerceConfig==='undefined')return;
  try{
    const d=await call('public_catalog',{}),vs=Array.isArray(d.vendors)?d.vendors:[],ps=Array.isArray(d.products)?d.products:[];
    if(!ps.length)return;
    commerceConfig.vendors=Array.isArray(commerceConfig.vendors)?commerceConfig.vendors:[];
    commerceConfig.products=Array.isArray(commerceConfig.products)?commerceConfig.products:[];
    const oldProducts=[...commerceConfig.products];
    const liveTypes=new Set(ps.map(p=>String(p.market_type||'').trim()).filter(Boolean));
    const mapped=ps.map(liveRow);
    // For any category that now has a live Supabase catalogue, the live catalogue is authoritative.
    commerceConfig.products=commerceConfig.products.filter(p=>!liveTypes.has(String(p.type||'')));
    for(const row of mapped)commerceConfig.products.push(row);
    // Keep/update live vendors; legacy vendors can remain for other categories but cannot sell into authoritative live types.
    for(const v of vs){let x=commerceConfig.vendors.find(q=>String(q.id)===String(v.id));const patch={id:v.id,name:v.name,type:v.type,city:v.city||'',active:true,ownerApproval:'Approved',liveBackend:true,canPrice:true,canStock:true,canOffer:true};if(x)Object.assign(x,patch);else commerceConfig.vendors.push(patch)}
    // Transparently migrate matching legacy cart rows to the corresponding live catalogue item.
    if(typeof commerceCarts!=='undefined'&&commerceCarts){
      for(const type of liveTypes){const cart=Array.isArray(commerceCarts[type])?commerceCarts[type]:[];if(!cart.length)continue;const next=[];for(const r of cart){let old=oldProducts.find(p=>String(p.id)===String(r.id));let target=mapped.find(p=>p.type===type&&old&&norm(p.name)===norm(old.name)&&Number(p.price)===Number(old.price));if(!target&&mapped.some(p=>String(p.id)===String(r.id)))target=mapped.find(p=>String(p.id)===String(r.id));if(target){const ex=next.find(x=>x.id===target.id);if(ex)ex.qty+=Number(r.qty||1);else next.push({id:target.id,qty:Number(r.qty||1)})}}
        commerceCarts[type]=next;
      }
    }
    persist();
    window.DBEST_LIVE_CATALOG_READY={version:VERSION,build:BUILD,types:[...liveTypes],productCount:mapped.length,vendorCount:vs.length};
  }catch(e){console.warn('Live Marketplace catalogue authority',e)}
}
setTimeout(enforce,50);setTimeout(enforce,1200);
window.addEventListener('focus',()=>setTimeout(enforce,50));
window.DBEST_MARKETPLACE_LIVE_CATALOG={version:VERSION,enforce};
})();