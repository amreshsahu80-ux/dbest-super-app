const crypto=require('crypto');

const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
const SERVICE_KEY=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();

function clean(v,n=500){return String(v??'').trim().slice(0,n)}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function sha256(v){return crypto.createHash('sha256').update(String(v||'')).digest('hex')}
function send(res,status,body){res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');return res.status(status).json(body)}
async function sb(path){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY,'Content-Type':'application/json'}});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error((data&&data.message)||('Supabase '+r.status));e.status=r.status;throw e}return data;
}
function vendorName(v){return clean(v?.name||v?.business_name||v?.shop_name||v?.vendor_name||v?.businessName||v?.id,180)}
function vendorAddress(v){return clean(v?.address||v?.business_address||v?.pickup_address||v?.full_address||'',500)}
function vendorCity(v){return clean(v?.city||v?.town||v?.district||'',100)}
function vendorPin(v){return clean(v?.pincode||v?.pin_code||v?.postal_code||'',20)}
function prettyCategory(v){const x=clean(v,80).toLowerCase();return ({grocery:'Grocery',restaurant:'Restaurant / Food',medicine:'Medicines / Pharmacy',fashion:'Fashion / Retail',electronics:'Electronics'}[x]||clean(v,80))}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{ok:false,error:'method_not_allowed'});
  if(!SERVICE_KEY)return send(res,503,{ok:false,error:'server_persistence_not_configured'});
  try{
    const token=clean(req.headers['x-dbest-member-token'],700);
    if(!token)return send(res,401,{ok:false,error:'member_session_required'});
    const sessions=await sb('member_sessions_live?token_hash=eq.'+encodeURIComponent(sha256(token))+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=member_id&limit=1');
    const memberId=clean(sessions?.[0]?.member_id,80);
    if(!memberId)return send(res,401,{ok:false,error:'member_session_invalid'});

    let txId=clean(req.body?.transactionId,120);
    const requestedOrderId=clean(req.body?.orderId,120);
    if(!txId&&requestedOrderId){
      const childRows=await sb('marketplace_orders_live?id=eq.'+encodeURIComponent(requestedOrderId)+'&customer_member_id=eq.'+encodeURIComponent(memberId)+'&select=id,master_order_id&limit=1');
      const masterIdFromChild=clean(childRows?.[0]?.master_order_id,100);
      if(!masterIdFromChild)return send(res,404,{ok:false,error:'marketplace_order_not_found'});
      const masterRows=await sb('marketplace_master_orders_live?id=eq.'+encodeURIComponent(masterIdFromChild)+'&customer_member_id=eq.'+encodeURIComponent(memberId)+'&select=id,parent_tx_id&limit=1');
      txId=clean(masterRows?.[0]?.parent_tx_id,120);
      if(!txId)return send(res,404,{ok:false,error:'verified_transaction_not_found'});
    }
    if(!txId)return send(res,400,{ok:false,error:'transaction_or_order_id_required'});
    const txRows=await sb('transactions?transaction_id=eq.'+encodeURIComponent(txId)+'&select=transaction_id,transaction_date,section,subsection,actor_name,actor_ref,amount,payment_mode,payment_status,reference,metadata&limit=1');
    const tx=txRows?.[0];
    if(!tx)return send(res,404,{ok:false,error:'transaction_not_found'});
    if(clean(tx.actor_ref,80)!==memberId)return send(res,403,{ok:false,error:'invoice_not_owned_by_member'});
    if(!/(verified|paid|captured|settled|successful|success|completed)/i.test(clean(tx.payment_status,80)))return send(res,409,{ok:false,error:'payment_not_confirmed'});

    const meta=tx.metadata&&typeof tx.metadata==='object'?tx.metadata:{};
    const masterId=clean(meta.marketplace_master_order_id||meta.masterOrderId||meta.master_order_id,100);
    const transaction={
      id:clean(tx.transaction_id,120),date:tx.transaction_date||'',section:clean(tx.section,120),subsection:clean(tx.subsection,140),
      customerName:clean(tx.actor_name,180),memberId:clean(tx.actor_ref,80),amount:num(tx.amount),paymentMethod:clean(tx.payment_mode||meta.razorpay_method||'Online Payment',100),
      paymentStatus:clean(tx.payment_status,80),paymentReference:clean(tx.reference||meta.razorpay_payment_id,160),currency:clean(meta.currency||'INR',10)
    };
    if(!masterId)return send(res,200,{ok:true,transaction,order:null,vendors:[]});

    const masters=await sb('marketplace_master_orders_live?id=eq.'+encodeURIComponent(masterId)+'&select=*&limit=1');
    const m=masters?.[0];
    if(!m)return send(res,200,{ok:true,transaction,order:null,vendors:[]});
    if(clean(m.customer_member_id,80)!==memberId)return send(res,403,{ok:false,error:'order_not_owned_by_member'});

    const children=await sb('marketplace_orders_live?master_order_id=eq.'+encodeURIComponent(masterId)+'&select=*&order=child_sequence.asc');
    const vendorIds=[...new Set((children||[]).map(x=>clean(x.vendor_id,100)).filter(Boolean))];
    let vendorRows=[];
    if(vendorIds.length){
      const or=vendorIds.map(x=>'id.eq.'+encodeURIComponent(x)).join(',');
      vendorRows=await sb('marketplace_vendors_live?or=('+or+')&select=*');
    }
    const vm=new Map((vendorRows||[]).map(v=>[String(v.id),v]));
    const vendors=(children||[]).map(c=>{
      const v=vm.get(String(c.vendor_id||''))||{};
      const items=(Array.isArray(c.items)?c.items:[]).map(i=>({id:clean(i?.id,100),name:clean(i?.name||i?.title||i?.id,180),qty:Math.max(1,num(i?.qty||i?.quantity)||1),price:num(i?.price),lineTotal:Math.round(num(i?.price)*Math.max(1,num(i?.qty||i?.quantity)||1)*100)/100}));
      const itemSubtotal=Math.round(items.reduce((a,i)=>a+i.lineTotal,0)*100)/100;
      return {id:clean(c.vendor_id,100),name:vendorName(v)||clean(c.vendor_id,100),address:vendorAddress(v),city:vendorCity(v),pincode:vendorPin(v),category:prettyCategory(c.market_type||v.type||v.category),orderId:clean(c.id,100),items,itemSubtotal,deliveryFee:num(c.delivery_fee),orderTotal:num(c.collect_amount||c.order_value)};
    });
    const cats=[...new Set(vendors.map(v=>v.category).filter(Boolean))];
    const order={
      id:clean(m.id,100),parentTxId:clean(m.parent_tx_id,120),customerName:clean(m.customer_name||transaction.customerName,180),customerMemberId:clean(m.customer_member_id,80),
      deliveryAddress:clean(m.delivery_address,500),productSubtotal:num(m.product_subtotal),deliveryFee:num(m.delivery_fee),taxAmount:num(m.tax_amount),totalAmount:num(m.total_amount||transaction.amount),
      paymentMethod:clean(m.payment_method||transaction.paymentMethod,120),paymentStatus:clean(m.payment_status||transaction.paymentStatus,80),status:clean(m.status,120),categories:cats
    };
    return send(res,200,{ok:true,transaction,order,vendors});
  }catch(e){console.error('[marketplace invoice-details]',e);return send(res,e.status&&e.status<500?e.status:500,{ok:false,error:'invoice_details_failed'})}
};
