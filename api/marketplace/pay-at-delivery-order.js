const crypto = require('crypto');

const SUPABASE_URL = String(process.env.SUPABASE_URL || 'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY || '');

function send(res,status,body){res.status(status).json(body)}
function sha256(v){return crypto.createHash('sha256').update(String(v||'')).digest('hex')}
function id(prefix){return prefix + String(Date.now()).slice(-10) + crypto.randomBytes(3).toString('hex')}
function clean(v,max=300){return String(v||'').trim().slice(0,max)}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}

async function sb(path,{method='GET',body,prefer='return=representation'}={}){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
    method,
    headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json',Prefer:prefer},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await r.text();
  let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error((data&&data.message)||('Supabase '+r.status));e.status=r.status;e.data=data;throw e}
  return data;
}

async function triggerVendorVoice(orderId){try{await fetch(SUPABASE_URL+'/functions/v1/partner-voice-alert',{method:'POST',headers:{apikey:SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'vendor_order',orderId})});}catch(e){console.error('[vendor voice alert]',e)}}
async function rpc(name,body){
  const r=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify(body||{})
  });
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error((data&&data.message)||('Supabase RPC '+r.status));e.status=r.status;throw e}
  return data;
}
function htmlEsc(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
async function triggerVendorMail(orderId){
  try{
    const rows=await sb('marketplace_orders_live?id=eq.'+encodeURIComponent(orderId)+'&select=*'+'&limit=1');
    const order=rows&&rows[0];if(!order)return {sent:false,error:'order_not_found'};
    const vendors=await sb('marketplace_vendors_live?id=eq.'+encodeURIComponent(order.vendor_id)+'&select=id,name,email,mobile,city&limit=1');
    const vendor=vendors&&vendors[0];if(!vendor?.email||!String(vendor.email).includes('@'))return {sent:false,error:'vendor_email_missing'};
    const key=await rpc('get_dbest_secret',{p_name:'dbest_resend_api_key'});
    if(!key)return {sent:false,error:'email_service_unavailable'};
    const items=Array.isArray(order.items)?order.items:[];
    const lines=items.map(i=>`${String(i.name||'Item')} × ${Number(i.qty||1)} — ₹${Number(i.price||0)*Number(i.qty||1)}`);
    const subject=`New DBest Marketplace Order — ${order.id}`;
    const text=`New Marketplace order ${order.id}. Customer: ${order.customer_name}. Mobile: ${order.customer_mobile}. Delivery address: ${order.delivery_address}. Payment: ${order.payment_method}. Amount: ₹${Number(order.collect_amount||order.order_value||0)}. Items: ${lines.join('; ')}. Please login to the DBest Vendor Portal and Accept → Prepare → Ready for Pickup.`;
    const html=`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7fb;color:#14213d;padding:20px"><div style="max-width:640px;margin:auto;background:#fff;border:1px solid #e2e8f2;border-radius:18px;overflow:hidden"><div style="background:#175cff;color:#fff;padding:22px"><b style="font-size:22px">New Marketplace Order</b><div style="margin-top:5px">${htmlEsc(order.id)}</div></div><div style="padding:22px"><p>Hi <b>${htmlEsc(vendor.name)}</b>, a new DBest Marketplace order requires your confirmation.</p><p><b>Customer:</b> ${htmlEsc(order.customer_name)}<br><b>Mobile:</b> ${htmlEsc(order.customer_mobile)}<br><b>Delivery address:</b> ${htmlEsc(order.delivery_address)}<br><b>Payment:</b> ${htmlEsc(order.payment_method)}<br><b>Order amount:</b> ₹${Number(order.collect_amount||order.order_value||0).toLocaleString('en-IN')}</p><h3>Items</h3><table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse">${items.map(i=>`<tr><td style="border-bottom:1px solid #eee">${htmlEsc(i.name||'Item')}</td><td style="border-bottom:1px solid #eee">Qty ${Number(i.qty||1)}</td><td align="right" style="border-bottom:1px solid #eee">₹${(Number(i.price||0)*Number(i.qty||1)).toLocaleString('en-IN')}</td></tr>`).join('')}</table><div style="margin-top:18px;padding:14px;background:#f6f9ff;border-radius:12px"><b>Next step:</b> Open the DBest Vendor Portal and mark the order <b>Accept → Preparing → Ready for Pickup</b>.</div></div></div></body></html>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'DBest Marketplace <no-reply@dbest4u.com>',to:[String(vendor.email).trim().toLowerCase()],subject,text,html,tags:[{name:'purpose',value:'marketplace-order'},{name:'order',value:String(order.id).slice(0,50)}]})});
    if(!r.ok){console.error('[vendor mail]',r.status,await r.text());return {sent:false,error:'vendor_email_failed'}}
    await sb('marketplace_orders_live?id=eq.'+encodeURIComponent(order.id),{method:'PATCH',body:{vendor_notified_at:new Date().toISOString(),vendor_status:'Vendor Notified',status:'Vendor Notified / Awaiting Confirmation',updated_at:new Date().toISOString()}});
    return {sent:true};
  }catch(e){console.error('[vendor mail]',e);return {sent:false,error:String(e.message||e)}}
}

module.exports = async function handler(req,res){
  if(req.method==='GET'){
    res.setHeader('Cache-Control','no-store');
    const secret=String(process.env.CRON_SECRET||'');
    const auth=String(req.headers.authorization||'');
    const sched=String(req.headers['x-vercel-cron-schedule']||'');
    if(secret){if(auth!==('Bearer '+secret))return send(res,401,{ok:false,error:'unauthorized'});}
    else if(sched!=='* * * * *')return send(res,401,{ok:false,error:'cron_only'});
    if(!SERVICE_KEY)return send(res,503,{ok:false,error:'server_persistence_not_configured'});
    try{
      const now=new Date().toISOString();
      const expired=await sb('hyperlocal_jobs_live?status=eq.Assigned&offer_expires_at=lt.'+encodeURIComponent(now)+'&select=transaction_id&order=offer_expires_at.asc&limit=50');
      const results=[];
      for(const row of expired||[]){
        try{
          const r=await fetch(SUPABASE_URL+'/functions/v1/service-cascade-live',{method:'POST',headers:{apikey:SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify({transactionId:String(row.transaction_id||'')})});
          const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{j=t}
          results.push({transactionId:row.transaction_id,ok:r.ok,result:j});
        }catch(e){results.push({transactionId:row.transaction_id,ok:false,error:String(e.message||e)});}
      }
      return send(res,200,{ok:true,processed:results.length,results});
    }catch(e){
      console.error('[service cascade cron]',e);
      return send(res,500,{ok:false,error:'cascade_cron_failed'});
    }
  }
  if(req.method!=='POST') return send(res,405,{ok:false,error:'method_not_allowed'});
  if(!SERVICE_KEY) return send(res,503,{ok:false,error:'server_persistence_not_configured'});
  try{
    const token=clean(req.headers['x-dbest-member-token'],500);
    if(!token) return send(res,401,{ok:false,error:'member_session_required'});
    const hash=sha256(token);
    const sessions=await sb('member_sessions_live?token_hash=eq.'+encodeURIComponent(hash)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=member_id&limit=1');
    const memberId=clean(sessions&&sessions[0]&&sessions[0].member_id,80);
    if(!memberId) return send(res,401,{ok:false,error:'member_session_invalid'});

    const memberRows=await sb('onboarding_records?kind=eq.member&external_id=eq.'+encodeURIComponent(memberId)+'&status=eq.Active&deleted_at=is.null&select=external_id,name,email,mobile&limit=1');
    const member=memberRows&&memberRows[0];
    if(!member) return send(res,403,{ok:false,error:'active_member_not_found'});

    const b=req.body||{};
    const marketType=clean(b.marketType,30).toLowerCase();
    if(!['grocery','restaurant','medicine'].includes(marketType)) return send(res,400,{ok:false,error:'pay_at_delivery_not_available_for_this_category'});
    const rawItems=Array.isArray(b.items)?b.items:[];
    if(!rawItems.length || rawItems.length>50) return send(res,400,{ok:false,error:'cart_items_required'});
    const requestedIds=[...new Set(rawItems.map(x=>clean(x&&x.id,100)).filter(Boolean))];
    if(!requestedIds.length) return send(res,400,{ok:false,error:'cart_items_required'});

    const or=requestedIds.map(x=>'id.eq.'+encodeURIComponent(x)).join(',');
    const products=await sb('marketplace_catalog_live?or=('+or+')&active=eq.true&select=id,vendor_id,market_type,name,price,stock,active');
    const byId=new Map((products||[]).map(p=>[String(p.id),p]));
    const items=[];
    for(const r of rawItems){
      const pid=clean(r&&r.id,100),p=byId.get(pid),qty=Math.max(1,Math.min(50,Math.floor(num(r&&r.qty)||1)));
      if(!p || String(p.market_type)!==marketType) return send(res,409,{ok:false,error:'catalog_item_unavailable',itemId:pid});
      if(num(p.stock)<qty) return send(res,409,{ok:false,error:'insufficient_stock',itemId:pid});
      items.push({id:pid,name:String(p.name||pid),qty,price:num(p.price),vendorId:String(p.vendor_id||'')});
    }
    const vendorIds=[...new Set(items.map(x=>x.vendorId).filter(Boolean))];
    if(!vendorIds.length) return send(res,409,{ok:false,error:'vendor_missing'});
    const vor=vendorIds.map(x=>'id.eq.'+encodeURIComponent(x)).join(',');
    const vendors=await sb('marketplace_vendors_live?or=('+vor+')&active=eq.true&owner_approval=eq.Approved&select=id,active,owner_approval,operational_hold');
    const allowed=new Set((vendors||[]).filter(v=>!v.operational_hold).map(v=>String(v.id)));
    if(vendorIds.some(v=>!allowed.has(v))) return send(res,409,{ok:false,error:'vendor_not_available'});

    const productSubtotal=Math.round(items.reduce((a,x)=>a+x.price*x.qty,0)*100)/100;
    const deliveryFee=Math.max(0,Math.min(1000,Math.round(num(b.deliveryFee)*100)/100));
    const taxAmount=Math.max(0,Math.min(productSubtotal,Math.round(num(b.taxAmount)*100)/100));
    const totalAmount=Math.round((productSubtotal+deliveryFee+taxAmount)*100)/100;
    if(totalAmount<=0) return send(res,400,{ok:false,error:'invalid_order_total'});

    const address=clean(b.address,500),pin=clean(b.pin,20),slot=clean(b.slot,100);
    if(!address || !pin) return send(res,400,{ok:false,error:'delivery_address_required'});
    const loc=b.liveLocation&&typeof b.liveLocation==='object'?b.liveLocation:{};
    const lat=Number.isFinite(Number(loc.lat))?Number(loc.lat):null;
    const lng=Number.isFinite(Number(loc.lng))?Number(loc.lng):null;
    const masterId=id('DBP');
    const parentRef=id('PAD_');
    const groups=new Map();
    for(const x of items){if(!groups.has(x.vendorId))groups.set(x.vendorId,[]);groups.get(x.vendorId).push(x)}
    const groupEntries=[...groups.entries()];

    const master={
      id:masterId,parent_tx_id:parentRef,customer_member_id:memberId,
      customer_name:clean(member.name,200)||'DBest Member',customer_mobile:clean(member.mobile,30)||'NA',customer_email:clean(member.email,250)||null,
      delivery_address:address,drop_lat:lat,drop_lng:lng,product_subtotal:productSubtotal,delivery_fee:deliveryFee,tax_amount:taxAmount,total_amount:totalAmount,
      payment_method:'Pay Online at Delivery - Razorpay',payment_status:'Pending',status:'Confirmed - Payment Due at Delivery',
      order_summary:{categories:[marketType],vendorCount:vendorIds.length,deliveryMode:'separate-per-vendor',paymentDueAtDelivery:true,previewTest:true,deliverySlot:slot}
    };
    await sb('marketplace_master_orders_live',{method:'POST',body:master});

    let allocatedDelivery=0,allocatedTax=0;
    for(let i=0;i<groupEntries.length;i++){
      const [vendorId,vitems]=groupEntries[i];
      const vendorSubtotal=Math.round(vitems.reduce((a,x)=>a+x.price*x.qty,0)*100)/100;
      const isLast=i===groupEntries.length-1;
      const share=productSubtotal>0?vendorSubtotal/productSubtotal:1/groupEntries.length;
      const childDelivery=isLast?Math.round((deliveryFee-allocatedDelivery)*100)/100:Math.round(deliveryFee*share*100)/100;
      const childTax=isLast?Math.round((taxAmount-allocatedTax)*100)/100:Math.round(taxAmount*share*100)/100;
      allocatedDelivery+=childDelivery;allocatedTax+=childTax;
      const collect=Math.round((vendorSubtotal+childDelivery+childTax)*100)/100;
      await sb('marketplace_orders_live',{method:'POST',body:{
        id:id('MKO'),parent_tx_id:parentRef,master_order_id:masterId,vendor_id:vendorId,market_type:marketType,customer_member_id:memberId,
        customer_name:master.customer_name,customer_mobile:master.customer_mobile,customer_email:master.customer_email,delivery_address:address,drop_lat:lat,drop_lng:lng,
        items:vitems.map(x=>({id:x.id,name:x.name,qty:x.qty,price:x.price,vendorId:x.vendorId})),order_value:collect,collect_amount:collect,
        payment_method:'Pay Online at Delivery - Razorpay',payment_status:'Pending',status:'Order Placed - Payment Due at Delivery',vendor_status:'New Order',
        delivery_fee:childDelivery,child_sequence:i+1
      }});
    }
    const voiceRows=await sb('marketplace_orders_live?master_order_id=eq.'+encodeURIComponent(masterId)+'&select=id');for(const row of voiceRows||[]){await triggerVendorVoice(row.id);await triggerVendorMail(row.id);}
    const finalRows=await sb('marketplace_master_orders_live?id=eq.'+encodeURIComponent(masterId)+'&select=id,parent_tx_id,total_amount,payment_method,payment_status,status,child_order_count&limit=1');
    return send(res,200,{ok:true,order:finalRows&&finalRows[0]?finalRows[0]:{id:masterId,total_amount:totalAmount,payment_status:'Pending',status:'Confirmed - Payment Due at Delivery'},message:'Order confirmed. Payment is due online at delivery.'});
  }catch(e){
    console.error('[pay-at-delivery-order]',e);
    return send(res,e.status&&e.status<500?e.status:500,{ok:false,error:'order_persistence_failed',detail:process.env.NODE_ENV==='development'?String(e.message||e):undefined});
  }
};
