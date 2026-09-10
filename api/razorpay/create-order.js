const DEFAULT_MEMBERSHIP_PRICES={guest:49,promoter:299,prime:599,leader:999};
const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
function membershipPrices(){try{const raw=process.env.DBEST_MEMBERSHIP_PRICES_JSON;if(!raw)return DEFAULT_MEMBERSHIP_PRICES;const parsed=JSON.parse(raw);return {...DEFAULT_MEMBERSHIP_PRICES,...parsed};}catch{return DEFAULT_MEMBERSHIP_PRICES;}}
function basicAuth(id,secret){return 'Basic '+Buffer.from(id+':'+secret).toString('base64');}
function safe(v,n=120){return String(v||'').replace(/[\r\n]/g,' ').trim().slice(0,n);}
function serverKey(){return String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();}
function adminHeaders(key){const h={apikey:key};if(/^eyJ[^.]*\.[^.]+\.[^.]+$/.test(key))h.Authorization='Bearer '+key;return h;}
async function sbFetch(path,key,opts={}){const r=await fetch(SUPABASE_URL+path,{...opts,headers:{...adminHeaders(key),'Content-Type':'application/json',...(opts.headers||{})}});const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{j=txt}if(!r.ok){const e=new Error((j&&typeof j==='object'&&(j.message||j.error_description||j.error))||('Supabase HTTP '+r.status));e.statusCode=r.status;throw e;}return j;}
async function authenticatedUser(token,key){token=safe(token,4096);if(!token){const e=new Error('Secure login session is required before payment');e.statusCode=401;throw e;}return sbFetch('/auth/v1/user',key,{headers:{Authorization:'Bearer '+token}});}
async function activeMembership(key,email){const q=new URLSearchParams({select:'external_id,status,payment_status',kind:'eq.member',email:'eq.'+email,status:'eq.Active',deleted_at:'is.null',limit:'1'});const rows=await sbFetch('/rest/v1/onboarding_records?'+q.toString(),key);return Array.isArray(rows)&&rows[0]?rows[0]:null;}
async function marketplaceMaster(key,masterOrderId,dbestRef,userId){
  const id=safe(masterOrderId,80);if(!id)return null;
  const q=new URLSearchParams({select:'id,parent_tx_id,customer_member_id,total_amount,payment_status,status',id:'eq.'+id,limit:'1'});
  const rows=await sbFetch('/rest/v1/marketplace_master_orders_live?'+q.toString(),key),m=Array.isArray(rows)&&rows[0]?rows[0]:null;
  if(!m){const e=new Error('Marketplace master order was not found');e.statusCode=404;throw e;}
  if(String(m.parent_tx_id||'')!==String(dbestRef||'')){const e=new Error('Marketplace order reference mismatch');e.statusCode=403;throw e;}
  if(userId&&String(m.customer_member_id||'')!==String(userId)){const e=new Error('Marketplace member mismatch');e.statusCode=403;throw e;}
  if(String(m.payment_status||'').toLowerCase()==='paid'){const e=new Error('Marketplace order is already paid');e.statusCode=409;throw e;}
  const amount=Number(m.total_amount);if(!Number.isFinite(amount)||amount<=0){const e=new Error('Marketplace order has an invalid payable total');e.statusCode=400;throw e;}
  return {id:String(m.id),amount};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim(),keySecret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  if(!keyId||!keySecret)return res.status(503).json({error:'Razorpay is not configured'});
  try{
    const b=req.body&&typeof req.body==='object'?req.body:{};
    const kind=safe(b.kind||'transaction',40).toLowerCase(),tier=safe(b.tier,30).toLowerCase(),dbestRef=safe(b.dbestRef||b.txId,60),userId=safe(b.userId,60),masterOrderId=safe(b.masterOrderId,80);
    if(!dbestRef)return res.status(400).json({error:'DBest reference is required'});
    const centralKey=serverKey();if(!centralKey)return res.status(503).json({error:'Central DBest transaction storage is not configured'});
    let amountRupees,authenticated=null,master=null;
    if(kind==='membership'){
      const prices=membershipPrices();if(!Object.prototype.hasOwnProperty.call(prices,tier))return res.status(400).json({error:'Invalid membership tier'});
      authenticated=await authenticatedUser(b.supabaseAccessToken,centralKey);
      if(b.userId&&String(b.userId)!==String(authenticated.id||''))return res.status(403).json({error:'Authenticated user mismatch'});
      const email=safe(authenticated.email,180).toLowerCase();if(!email)return res.status(400).json({error:'Authenticated account has no email address'});
      const existing=await activeMembership(centralKey,email);if(existing)return res.status(409).json({error:'Membership is already active',memberId:existing.external_id||''});
      amountRupees=Number(prices[tier]);
    }else if(masterOrderId){
      master=await marketplaceMaster(centralKey,masterOrderId,dbestRef,userId);
      amountRupees=master.amount;
    }else{
      amountRupees=Number(b.amount);if(!Number.isFinite(amountRupees)||amountRupees<=0)return res.status(400).json({error:'Invalid amount'});if(amountRupees>1000000)return res.status(400).json({error:'Amount exceeds allowed limit'});
    }
    if(amountRupees>1000000)return res.status(400).json({error:'Amount exceeds allowed limit'});
    const amount=Math.round(amountRupees*100),receipt=('DBEST_'+dbestRef.replace(/[^a-z0-9_-]/gi,'').slice(-26)+'_'+Date.now().toString().slice(-6)).slice(0,40);
    const notes={dbest_ref:dbestRef,kind:safe(kind,40),tier:safe(tier,30),section:safe(b.section,80),sub:safe(b.sub,100),user_id:safe(authenticated?.id||userId,60),master_order_id:safe(master?.id||'',80)};
    const rr=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:basicAuth(keyId,keySecret),'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'INR',receipt,notes})});
    const data=await rr.json().catch(()=>({}));if(!rr.ok)return res.status(rr.status).json({error:data?.error?.description||data?.error?.reason||'Unable to create Razorpay order'});
    return res.status(200).json({provider:'razorpay',keyId,orderId:data.id,amount:data.amount,currency:data.currency||'INR',receipt:data.receipt,kind,tier,dbestRef,masterOrderId:master?.id||''});
  }catch(err){console.error('Razorpay create-order error',err);const sc=Number(err?.statusCode)||500;return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Unable to create payment order')});}
};
