const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
function basicAuth(id,secret){return 'Basic '+Buffer.from(id+':'+secret).toString('base64');}
function safe(v,n=180){return String(v||'').replace(/[\r\n]/g,' ').trim().slice(0,n);}
function serverKey(){return String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();}
function adminHeaders(key){const h={apikey:key};if(/^eyJ[^.]*\.[^.]+\.[^.]+$/.test(key))h.Authorization='Bearer '+key;return h;}
async function rzFetch(path,keyId,secret,opts={}){const r=await fetch('https://api.razorpay.com/v1'+path,{...opts,headers:{Authorization:basicAuth(keyId,secret),'Content-Type':'application/json',...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j?.error?.description||j?.error?.reason||('Razorpay HTTP '+r.status));e.statusCode=r.status;throw e;}return j;}
async function sbFetch(path,key,opts={}){const r=await fetch(SUPABASE_URL+path,{...opts,headers:{...adminHeaders(key),'Content-Type':'application/json',...(opts.headers||{})}});const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{j=txt}if(!r.ok){const e=new Error((j&&typeof j==='object'&&(j.message||j.error_description||j.error))||('Supabase HTTP '+r.status));e.statusCode=r.status;throw e;}return j;}
async function recoverMarketplace(b,keyId,secret,persistenceKey){
  const orderId=safe(b.orderId||b.razorpay_order_id,120),dbestRef=safe(b.dbestRef,100),masterOrderId=safe(b.masterOrderId,80),userId=safe(b.userId,100);
  if(!orderId||!dbestRef||!masterOrderId)return {status:400,body:{error:'Recovery reference is incomplete',verified:false}};
  const order=await rzFetch('/orders/'+encodeURIComponent(orderId),keyId,secret),notes=order.notes&&typeof order.notes==='object'?order.notes:{};
  if(String(notes.dbest_ref||'')!==dbestRef)return {status:403,body:{error:'DBest reference mismatch',verified:false}};
  if(String(notes.master_order_id||'')!==masterOrderId)return {status:403,body:{error:'Marketplace order mismatch',verified:false}};
  if(userId&&String(notes.user_id||'')!==userId)return {status:403,body:{error:'Marketplace member mismatch',verified:false}};
  if(String(notes.kind||'').toLowerCase()!=='transaction')return {status:403,body:{error:'Payment purpose mismatch',verified:false}};
  const ps=await rzFetch('/orders/'+encodeURIComponent(orderId)+'/payments',keyId,secret),items=Array.isArray(ps?.items)?ps.items:[];
  let payment=items.find(x=>x&&x.status==='captured')||items.find(x=>x&&x.status==='authorized')||null;
  if(!payment)return {status:409,body:{error:'Payment not captured yet',verified:false,status:'pending'}};
  if(payment.status==='authorized')payment=await rzFetch('/payments/'+encodeURIComponent(payment.id)+'/capture',keyId,secret,{method:'POST',body:JSON.stringify({amount:Number(order.amount),currency:String(order.currency||'INR')})});
  if(payment.status!=='captured')return {status:409,body:{error:'Payment not captured yet',verified:false,status:payment.status||'pending'}};
  if(Number(payment.amount||0)!==Number(order.amount||0))return {status:400,body:{error:'Payment amount mismatch',verified:false}};
  const q=new URLSearchParams({select:'id,parent_tx_id,customer_member_id,total_amount,payment_status,status',id:'eq.'+masterOrderId,limit:'1'});
  const rows=await sbFetch('/rest/v1/marketplace_master_orders_live?'+q.toString(),persistenceKey),m=Array.isArray(rows)&&rows[0]?rows[0]:null;
  if(!m)return {status:404,body:{error:'Marketplace master order not found',verified:false}};
  if(String(m.parent_tx_id||'')!==dbestRef)return {status:403,body:{error:'Master order reference mismatch',verified:false}};
  if(userId&&String(m.customer_member_id||'')!==userId)return {status:403,body:{error:'Master order member mismatch',verified:false}};
  const expected=Math.round(Number(m.total_amount||0)*100);
  if(expected!==Number(payment.amount||0)||expected!==Number(order.amount||0))return {status:400,body:{error:'Marketplace total does not match Razorpay amount',verified:false}};
  const now=new Date().toISOString();
  if(String(m.payment_status||'').toLowerCase()!=='paid'){
    await sbFetch('/rest/v1/marketplace_master_orders_live?id=eq.'+encodeURIComponent(masterOrderId),persistenceKey,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payment_method:'Razorpay',payment_status:'Paid',status:'Awaiting Vendor Confirmation',updated_at:now})});
    await sbFetch('/rest/v1/marketplace_orders_live?master_order_id=eq.'+encodeURIComponent(masterOrderId),persistenceKey,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payment_method:'Razorpay',payment_status:'Paid',status:'Order Placed',vendor_status:'New Order',updated_at:now})});
    await sbFetch('/rest/v1/marketplace_delivery_groups_live?master_order_id=eq.'+encodeURIComponent(masterOrderId),persistenceKey,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'Waiting for Vendor',updated_at:now})});
  }
  const mq=new URLSearchParams({select:'external_id,name,email,mobile',kind:'eq.member',external_id:'eq.'+String(m.customer_member_id||userId||''),deleted_at:'is.null',limit:'1'}),mr=await sbFetch('/rest/v1/onboarding_records?'+mq.toString(),persistenceKey).catch(()=>[]),member=Array.isArray(mr)&&mr[0]?mr[0]:null;
  const tx={transaction_id:dbestRef,transaction_date:now,section:'Marketplace - Master Order',subsection:'Multi-Category Master Order',actor_type:member?'Member':'User',actor_name:safe(member?.name||payment.email||payment.contact||'DBest User',140),actor_ref:safe(member?.external_id||m.customer_member_id||userId,100),counterparty_type:'Company',counterparty_name:'Sarwashresth Services OPC Pvt. Ltd.',amount:Number(payment.amount||order.amount||0)/100,payment_mode:'Razorpay',payment_status:'Verified',reference:String(payment.id||''),payout_amount:0,metadata:{dbest_ref:dbestRef,kind:'transaction',section:'Marketplace - Master Order',subsection:'Multi-Category Master Order',user_id:String(m.customer_member_id||userId||''),marketplace_master_order_id:masterOrderId,razorpay_order_id:String(order.id||''),razorpay_payment_id:String(payment.id||''),razorpay_method:String(payment.method||''),currency:String(payment.currency||order.currency||'INR'),email:String(payment.email||''),contact:String(payment.contact||''),source:'DBest Super Platform',environment:process.env.VERCEL_ENV||'preview',verified_at:now,recovered:true},updated_at:now};
  await sbFetch('/rest/v1/transactions?on_conflict=transaction_id',persistenceKey,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(tx)});
  return {status:200,body:{verified:true,recovered:true,persisted:true,marketplaceOrderActivated:true,marketplaceMasterId:masterOrderId,paymentId:String(payment.id||''),orderId:String(order.id||''),amount:Number(payment.amount||order.amount||0),status:String(payment.status||''),method:String(payment.method||'')}};
}
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const secret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  const persistenceKey=serverKey();
  if(req.method==='GET'){
    const stage=String((req.query&&req.query.stage)||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
    if(process.env.VERCEL_ENV==='preview'&&stage)console.log('[DBEST_RZP_TRACE]',stage);
    return res.status(200).json({provider:'razorpay',configured:!!(keyId&&secret),persistenceConfigured:!!persistenceKey,keyId:keyId||'',mode:keyId.startsWith('rzp_live_')?'live':keyId.startsWith('rzp_test_')?'test':'unknown'});
  }
  if(req.method==='POST'){
    const b=req.body&&typeof req.body==='object'?req.body:{};
    if(String(b.action||'')!=='recover-marketplace')return res.status(400).json({error:'Unsupported action'});
    if(!keyId||!secret)return res.status(503).json({error:'Razorpay is not configured',verified:false});
    if(!persistenceKey)return res.status(503).json({error:'Central DBest transaction storage is not configured',verified:false});
    try{const out=await recoverMarketplace(b,keyId,secret,persistenceKey);return res.status(out.status).json(out.body)}catch(err){console.error('Razorpay recovery error',err);const sc=Number(err?.statusCode)||500;return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Payment recovery failed'),verified:false})}
  }
  res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});
};