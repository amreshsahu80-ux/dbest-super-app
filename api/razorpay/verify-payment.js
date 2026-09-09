const crypto=require('crypto');
function basicAuth(id,secret){return 'Basic '+Buffer.from(id+':'+secret).toString('base64');}
function safeEqualHex(a,b){try{const x=Buffer.from(String(a||''),'hex'),y=Buffer.from(String(b||''),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y);}catch{return false;}}
async function rzFetch(path,keyId,keySecret,opts={}){
  const r=await fetch('https://api.razorpay.com/v1'+path,{...opts,headers:{'Authorization':basicAuth(keyId,keySecret),'Content-Type':'application/json',...(opts.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j?.error?.description||j?.error?.reason||('Razorpay HTTP '+r.status));e.statusCode=r.status;throw e;}
  return j;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const keySecret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  if(!keyId||!keySecret)return res.status(503).json({error:'Razorpay is not configured'});
  try{
    const b=req.body&&typeof req.body==='object'?req.body:{};
    const orderId=String(b.razorpay_order_id||'').trim();
    const paymentId=String(b.razorpay_payment_id||'').trim();
    const signature=String(b.razorpay_signature||'').trim();
    const dbestRef=String(b.dbestRef||'').trim();
    const kind=String(b.kind||'').trim().toLowerCase();
    const tier=String(b.tier||'').trim().toLowerCase();
    if(!orderId||!paymentId||!signature)return res.status(400).json({error:'Missing Razorpay verification fields'});
    const expected=crypto.createHmac('sha256',keySecret).update(orderId+'|'+paymentId).digest('hex');
    if(!safeEqualHex(expected,signature))return res.status(400).json({error:'Invalid payment signature',verified:false});
    const order=await rzFetch('/orders/'+encodeURIComponent(orderId),keyId,keySecret);
    let payment=await rzFetch('/payments/'+encodeURIComponent(paymentId),keyId,keySecret);
    if(String(payment.order_id||'')!==orderId)return res.status(400).json({error:'Payment does not belong to this order',verified:false});
    const notes=order.notes&&typeof order.notes==='object'?order.notes:{};
    if(dbestRef&&String(notes.dbest_ref||'')!==dbestRef)return res.status(400).json({error:'DBest reference mismatch',verified:false});
    if(kind&&String(notes.kind||'').toLowerCase()!==kind)return res.status(400).json({error:'Payment purpose mismatch',verified:false});
    if(kind==='membership'&&tier&&String(notes.tier||'').toLowerCase()!==tier)return res.status(400).json({error:'Membership tier mismatch',verified:false});
    if(Number(payment.amount||0)!==Number(order.amount||0))return res.status(400).json({error:'Payment amount mismatch',verified:false});
    if(payment.status==='authorized'){
      payment=await rzFetch('/payments/'+encodeURIComponent(paymentId)+'/capture',keyId,keySecret,{method:'POST',body:JSON.stringify({amount:Number(order.amount),currency:String(order.currency||'INR')})});
    }
    if(payment.status!=='captured')return res.status(409).json({error:'Payment is not captured yet',verified:false,status:payment.status||'unknown'});
    return res.status(200).json({
      verified:true,
      provider:'razorpay',
      paymentId,
      orderId,
      amount:Number(payment.amount||order.amount||0),
      currency:String(payment.currency||order.currency||'INR'),
      status:payment.status,
      method:String(payment.method||''),
      email:String(payment.email||''),
      contact:String(payment.contact||''),
      dbestRef:String(notes.dbest_ref||''),
      kind:String(notes.kind||''),
      tier:String(notes.tier||'')
    });
  }catch(err){
    console.error('Razorpay verify-payment error',err);
    const sc=Number(err?.statusCode)||500;
    return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Payment verification failed'),verified:false});
  }
};