const crypto=require('crypto');
const {safe,payuConfig,paymentHash,sbFetch,requestOrigin,parseBody}=require('../../lib/payu');

async function existingTransaction(ref){
  const q=new URLSearchParams({select:'transaction_id,amount,section,subsection,actor_name,actor_ref,payment_status,metadata',transaction_id:'eq.'+ref,limit:'1'});
  const rows=await sbFetch('/rest/v1/transactions?'+q.toString());
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function savePending(row){
  return sbFetch('/rest/v1/transactions?on_conflict=transaction_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const c=payuConfig();if(!c.configured)return res.status(503).json({error:'PayU is not configured'});
  try{
    const b=parseBody(req),ref=safe(b.dbest_tx_id||b.dbestRef||b.txId,80);
    if(!ref)return res.status(400).json({error:'DBest transaction reference is required'});
    let amount=Number(b.amount);if(!Number.isFinite(amount)||amount<=0||amount>1000000)return res.status(400).json({error:'Invalid amount'});
    let existing=null;try{existing=await existingTransaction(ref)}catch(e){console.warn('PayU central lookup warning',e.message)}
    if(existing&&Number(existing.amount)>0)amount=Number(existing.amount);
    const amountText=amount.toFixed(2),firstname=safe(b.firstname||existing?.actor_name||'DBest User',60),email=safe(b.email,180).toLowerCase();
    if(!email||!email.includes('@'))return res.status(400).json({error:'A valid email is required for PayU checkout'});
    const phone=safe(b.phone,20).replace(/[^0-9+]/g,''),section=safe(b.udf2||b.section||existing?.section||'',80),sub=safe(b.udf3||b.sub||existing?.subsection||'',100),actorRef=safe(b.udf1||b.userId||existing?.actor_ref||'',80);
    const txnid=('DB'+Date.now().toString(36)+crypto.randomBytes(4).toString('hex')).slice(0,25),origin=requestOrigin(req);
    if(!origin)return res.status(500).json({error:'Unable to resolve payment return URL'});
    const returnUrl=origin+'/api/payu/return',productinfo=safe(b.productinfo||`DBest ${section} - ${sub}`,100)||'DBest Payment';
    const fields={key:c.key,txnid,amount:amountText,productinfo,firstname,email,phone,surl:returnUrl,furl:returnUrl,udf1:actorRef,udf2:section,udf3:sub,udf4:ref,udf5:''};
    fields.hash=paymentHash(c,fields);
    try{
      await savePending({transaction_id:ref,section:section||existing?.section||'Payment',subsection:sub||existing?.subsection||'',actor_type:'member',actor_name:firstname,actor_ref:actorRef,amount:amountText,payment_mode:'PayU',payment_status:'Initiated',reference:txnid,metadata:{...(existing?.metadata||{}),gateway:'payu',payu_txnid:txnid,environment:process.env.VERCEL_ENV||'preview',payment_stage:'PayU Initiated'}});
    }catch(e){console.error('PayU pending transaction storage error',e);return res.status(500).json({error:'Unable to create central DBest payment record'});}
    return res.status(200).json({provider:'payu',mode:c.mode,action:c.paymentUrl,fields,dbestRef:ref,txnid,amount:amountText});
  }catch(err){console.error('PayU create-payment error',err);const sc=Number(err?.statusCode)||500;return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Unable to create PayU payment')});}
};
