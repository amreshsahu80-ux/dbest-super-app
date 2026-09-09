const DEFAULT_MEMBERSHIP_PRICES={guest:49,promoter:299,prime:599,leader:999};
function membershipPrices(){
  try{
    const raw=process.env.DBEST_MEMBERSHIP_PRICES_JSON;
    if(!raw)return DEFAULT_MEMBERSHIP_PRICES;
    const parsed=JSON.parse(raw);
    return {...DEFAULT_MEMBERSHIP_PRICES,...parsed};
  }catch{return DEFAULT_MEMBERSHIP_PRICES;}
}
function basicAuth(id,secret){return 'Basic '+Buffer.from(id+':'+secret).toString('base64');}
function safe(v,n=120){return String(v||'').replace(/[\r\n]/g,' ').slice(0,n);}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const keySecret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  if(!keyId||!keySecret)return res.status(503).json({error:'Razorpay is not configured'});
  try{
    const b=req.body&&typeof req.body==='object'?req.body:{};
    const kind=String(b.kind||'transaction').toLowerCase();
    const tier=String(b.tier||'').toLowerCase();
    const dbestRef=safe(b.dbestRef||b.txId,60);
    if(!dbestRef)return res.status(400).json({error:'DBest reference is required'});
    let amountRupees;
    if(kind==='membership'){
      const prices=membershipPrices();
      if(!Object.prototype.hasOwnProperty.call(prices,tier))return res.status(400).json({error:'Invalid membership tier'});
      amountRupees=Number(prices[tier]);
    }else{
      amountRupees=Number(b.amount);
      if(!Number.isFinite(amountRupees)||amountRupees<=0)return res.status(400).json({error:'Invalid amount'});
      if(amountRupees>1000000)return res.status(400).json({error:'Amount exceeds allowed limit'});
    }
    const amount=Math.round(amountRupees*100);
    const receipt=('DBEST_'+dbestRef.replace(/[^a-z0-9_-]/gi,'').slice(-26)+'_'+Date.now().toString().slice(-6)).slice(0,40);
    const notes={
      dbest_ref:dbestRef,
      kind:safe(kind,40),
      tier:safe(tier,30),
      section:safe(b.section,80),
      sub:safe(b.sub,100),
      user_id:safe(b.userId,60)
    };
    const rr=await fetch('https://api.razorpay.com/v1/orders',{
      method:'POST',
      headers:{'Authorization':basicAuth(keyId,keySecret),'Content-Type':'application/json'},
      body:JSON.stringify({amount,currency:'INR',receipt,notes})
    });
    const data=await rr.json().catch(()=>({}));
    if(!rr.ok)return res.status(rr.status).json({error:data?.error?.description||data?.error?.reason||'Unable to create Razorpay order'});
    return res.status(200).json({
      provider:'razorpay',
      keyId,
      orderId:data.id,
      amount:data.amount,
      currency:data.currency||'INR',
      receipt:data.receipt,
      kind,
      tier,
      dbestRef
    });
  }catch(err){
    console.error('Razorpay create-order error',err);
    return res.status(500).json({error:'Unable to create payment order'});
  }
};