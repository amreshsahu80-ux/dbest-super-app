const {safe,payuConfig,sbFetch,requestOrigin,parseBody,verifyWithPayU}=require('../../lib/payu');

async function pendingByTxnid(txnid){
  const q=new URLSearchParams({select:'transaction_id,amount,section,subsection,actor_ref,metadata',reference:'eq.'+txnid,limit:'1'});
  const rows=await sbFetch('/rest/v1/transactions?'+q.toString());
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function updateTransaction(ref,row){
  const q=new URLSearchParams({transaction_id:'eq.'+ref});
  return sbFetch('/rest/v1/transactions?'+q.toString(),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
}
function redirect(res,url){res.statusCode=303;res.setHeader('Location',url);res.end();}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  const c=payuConfig(),origin=requestOrigin(req)||'https://dbest4u.com';
  try{
    const b=parseBody(req),txnid=safe(b.txnid||req.query?.txnid,120);
    if(!c.configured||!txnid)return redirect(res,origin+'/?payu_verified=0&payu_status=failure');
    const pending=await pendingByTxnid(txnid);
    if(!pending)return redirect(res,origin+'/?payu_verified=0&payu_status=failure&payu_txnid='+encodeURIComponent(txnid));
    const v=await verifyWithPayU(txnid),d=v.detail||{},status=safe(d.status||d.unmappedstatus||b.status,40).toLowerCase();
    const verifiedSuccess=status==='success'||status==='captured';
    const actualAmount=Number(d.amt||d.amount||0),expectedAmount=Number(pending.amount||0),amountMatches=actualAmount>0&&Math.abs(actualAmount-expectedAmount)<0.01;
    const success=verifiedSuccess&&amountMatches,mihpayid=safe(d.mihpayid||b.mihpayid,120),bankRef=safe(d.bank_ref_num||d.bankReferenceNumber||b.bank_ref_num,120);
    const meta={...(pending.metadata||{}),gateway:'payu',payu_txnid:txnid,payu_mihpayid:mihpayid,bank_ref_num:bankRef,payu_verified:success,verified_amount:actualAmount,payment_stage:success?'PayU Verified':'PayU Failed',environment:process.env.VERCEL_ENV||'preview'};
    await updateTransaction(pending.transaction_id,{payment_mode:'PayU',payment_status:success?'Verified':'Failed',reference:mihpayid||txnid,metadata:meta,updated_at:new Date().toISOString()});
    const p=new URLSearchParams({dbest_tx_id:pending.transaction_id,payu_verified:success?'1':'0',payu_status:success?'success':(status||'failure'),payu_txnid:txnid});
    if(mihpayid)p.set('mihpayid',mihpayid);if(bankRef)p.set('bank_ref_num',bankRef);
    return redirect(res,origin+'/?'+p.toString());
  }catch(err){console.error('PayU return verification error',err);const p=new URLSearchParams({payu_verified:'0',payu_status:'failure'});return redirect(res,origin+'/?'+p.toString());}
};
