const crypto=require('crypto');
const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
function basicAuth(id,secret){return 'Basic '+Buffer.from(id+':'+secret).toString('base64');}
function safeEqualHex(a,b){try{const x=Buffer.from(String(a||''),'hex'),y=Buffer.from(String(b||''),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y);}catch{return false;}}
function safe(v,n=180){return String(v||'').replace(/[\r\n]/g,' ').trim().slice(0,n);}
function serverKey(){return String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();}
function adminHeaders(key){const h={apikey:key};if(/^eyJ[^.]*\.[^.]+\.[^.]+$/.test(key))h.Authorization='Bearer '+key;return h;}
async function rzFetch(path,keyId,keySecret,opts={}){
  const r=await fetch('https://api.razorpay.com/v1'+path,{...opts,headers:{Authorization:basicAuth(keyId,keySecret),'Content-Type':'application/json',...(opts.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j?.error?.description||j?.error?.reason||('Razorpay HTTP '+r.status));e.statusCode=r.status;throw e;}
  return j;
}
async function sbFetch(path,key,opts={}){
  const r=await fetch(SUPABASE_URL+path,{...opts,headers:{...adminHeaders(key),'Content-Type':'application/json',...(opts.headers||{})}});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{j=txt}
  if(!r.ok){const e=new Error((j&&typeof j==='object'&&(j.message||j.error_description||j.error))||('Supabase HTTP '+r.status));e.statusCode=r.status;throw e;}
  return j;
}
async function authenticatedUser(accessToken,key){
  const token=safe(accessToken,4096);if(!token){const e=new Error('Secure login session is required to activate membership');e.statusCode=401;throw e;}
  return sbFetch('/auth/v1/user',key,{headers:{Authorization:'Bearer '+token}});
}
async function findMemberByEmail(key,email){
  const q=new URLSearchParams({select:'id,external_id,name,email,mobile,category,status,payment_status,payload',kind:'eq.member',email:'eq.'+email,deleted_at:'is.null',order:'created_at.asc',limit:'1'});
  const rows=await sbFetch('/rest/v1/onboarding_records?'+q.toString(),key);return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function memberIdExists(key,id){
  const q=new URLSearchParams({select:'id',external_id:'eq.'+id,limit:'1'});const rows=await sbFetch('/rest/v1/onboarding_records?'+q.toString(),key);return Array.isArray(rows)&&rows.length>0;
}
async function allocateMemberId(key,tier){
  const prefix=tier==='guest'?'CU':'PR';
  for(let i=0;i<30;i++){const id=prefix+String(1000+crypto.randomInt(9000));if(!(await memberIdExists(key,id)))return id;}
  return prefix+Date.now().toString().slice(-7);
}
async function persistMembership({key,user,payment,order,notes,tier,b}){
  const email=safe(user?.email,180).toLowerCase();if(!email){const e=new Error('Authenticated account has no email address');e.statusCode=400;throw e;}
  const md=user?.user_metadata&&typeof user.user_metadata==='object'?user.user_metadata:{};
  const am=user?.app_metadata&&typeof user.app_metadata==='object'?user.app_metadata:{};
  const name=safe(md.full_name||md.name||email,140);
  const mobile=safe(b.mobile||payment.contact,30).replace(/\D/g,'').slice(-10);
  const referral=safe(b.referral,40).toUpperCase();
  const provider=safe(am.provider||b.socialProvider||'',40);
  const now=new Date().toISOString();
  let existing=await findMemberByEmail(key,email);
  const memberId=existing?.external_id||await allocateMemberId(key,tier);
  const referralCode=tier==='guest'?'':safe(existing?.payload?.referral_code||('DB'+memberId.replace(/\D/g,'')),40);
  const payload={...(existing?.payload&&typeof existing.payload==='object'?existing.payload:{}),auth_user_id:String(user.id||''),social_provider:provider,tier,dbest_ref:String(notes.dbest_ref||''),razorpay_order_id:String(order.id||''),razorpay_payment_id:String(payment.id||''),razorpay_method:String(payment.method||''),currency:String(payment.currency||order.currency||'INR'),referral_upline:referral,referral_code:referralCode,payout_profile_status:'Incomplete',payout_enabled:false,verified_at:now,source:'DBest Super Platform',environment:process.env.VERCEL_ENV||'preview'};
  const row={kind:'member',external_id:memberId,name,email,mobile,category:tier,status:'Active',payment_status:'Razorpay Verified',payment_amount:Number(payment.amount||0)/100,payment_ref:String(payment.id||''),payload,email_verified:true,email_verified_at:now,updated_at:now};
  if(existing?.id){
    const q=new URLSearchParams({id:'eq.'+existing.id});await sbFetch('/rest/v1/onboarding_records?'+q.toString(),key,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
  }else{
    await sbFetch('/rest/v1/onboarding_records',key,{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({...row,created_at:now})});
  }
  const txId='RZP_'+String(payment.id||'').slice(0,80);
  const tx={transaction_id:txId,transaction_date:now,section:'Membership',subsection:safe(notes.sub||tier,100),actor_type:'Member',actor_name:name,actor_ref:memberId,counterparty_type:'Company',counterparty_name:'Sarwashresth Services OPC Pvt. Ltd.',amount:Number(payment.amount||0)/100,payment_mode:'Razorpay',payment_status:'Verified',reference:String(payment.id||''),payout_amount:0,metadata:{auth_user_id:String(user.id||''),email,tier,member_id:memberId,referral_code:referralCode,referral_upline:referral,dbest_ref:String(notes.dbest_ref||''),razorpay_order_id:String(order.id||''),razorpay_payment_id:String(payment.id||''),razorpay_method:String(payment.method||''),currency:String(payment.currency||order.currency||'INR'),source:'DBest Super Platform',environment:process.env.VERCEL_ENV||'preview'},updated_at:now};
  await sbFetch('/rest/v1/transactions?on_conflict=transaction_id',key,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(tx)});
  return {memberId,referralCode,payoutProfileStatus:'Incomplete',name,email,mobile};
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const keySecret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  if(!keyId||!keySecret)return res.status(503).json({error:'Razorpay is not configured'});
  try{
    const b=req.body&&typeof req.body==='object'?req.body:{};
    const orderId=safe(b.razorpay_order_id,120),paymentId=safe(b.razorpay_payment_id,120),signature=safe(b.razorpay_signature,256);
    const dbestRef=safe(b.dbestRef,80),kind=safe(b.kind,40).toLowerCase(),tier=safe(b.tier,30).toLowerCase();
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
    if(payment.status==='authorized')payment=await rzFetch('/payments/'+encodeURIComponent(paymentId)+'/capture',keyId,keySecret,{method:'POST',body:JSON.stringify({amount:Number(order.amount),currency:String(order.currency||'INR')})});
    if(payment.status!=='captured')return res.status(409).json({error:'Payment is not captured yet',verified:false,status:payment.status||'unknown'});
    let persisted=null;
    if(String(notes.kind||'').toLowerCase()==='membership'){
      const key=serverKey();if(!key)return res.status(503).json({error:'Central membership storage is not configured',verified:false});
      const user=await authenticatedUser(b.supabaseAccessToken,key);
      if(String(notes.user_id||'')&&String(notes.user_id)!==String(user.id||''))return res.status(403).json({error:'Authenticated user does not match payment order',verified:false});
      persisted=await persistMembership({key,user,payment,order,notes,tier:String(notes.tier||tier||'').toLowerCase(),b});
    }
    return res.status(200).json({verified:true,provider:'razorpay',paymentId,orderId,amount:Number(payment.amount||order.amount||0),currency:String(payment.currency||order.currency||'INR'),status:payment.status,method:String(payment.method||''),email:String(payment.email||''),contact:String(payment.contact||''),dbestRef:String(notes.dbest_ref||''),kind:String(notes.kind||''),tier:String(notes.tier||''),persisted:!!persisted,...(persisted||{})});
  }catch(err){
    console.error('Razorpay verify-payment error',err);
    const sc=Number(err?.statusCode)||500;
    return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Payment verification failed'),verified:false});
  }
};