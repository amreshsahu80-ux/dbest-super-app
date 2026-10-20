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

    // The Government Forms checkout is a dedicated, test-only PayU flow.
    // Never accept a client-supplied quote/fee, anonymous reference or live gateway here.
    const requestSection=safe(b.udf2||b.section||'',80);
    const isGovt=String(existing?.section||'').trim()==='PAN, DL, ITR'||requestSection==='PAN, DL, ITR';
    if(isGovt){
      if(!existing||String(existing.section||'').trim()!=='PAN, DL, ITR')
        return res.status(404).json({error:'Government application transaction is not registered centrally'});
      if(c.mode!=='test')
        return res.status(403).json({error:'Government assistance checkout is restricted to PayU Test mode'});
      const token=safe(req.headers['x-dbest-member-token'],512);
      if(!token)return res.status(401).json({error:'Verified member session required for Government payment'});
      const hash=crypto.createHash('sha256').update(token).digest('hex');
      const sessionQuery=new URLSearchParams({select:'member_id,expires_at',token_hash:'eq.'+hash,expires_at:'gt.'+new Date().toISOString(),limit:'1'});
      const sessions=await sbFetch('/rest/v1/member_sessions_live?'+sessionQuery.toString());
      if(!Array.isArray(sessions)||!sessions[0]?.member_id||String(sessions[0].member_id)!==String(existing.actor_ref))
        return res.status(403).json({error:'Government payment member session does not match application'});
      const defaults={'PAN Application':140,'Driving Licence':150,'ITR Filing':150,
        'Certificates':30,'Passport Application':150,'GST Return':150};
      const positions={'PAN Application':0,'Driving Licence':1,'ITR Filing':2,
        'Certificates':3,'Passport Application':4,'GST Return':5};
      const subName=String(existing.subsection||'').trim();
      if(!Object.prototype.hasOwnProperty.call(defaults,subName))
        return res.status(400).json({error:'Unsupported Government service checkout'});
      const settings=await sbFetch('/rest/v1/app_settings?'+new URLSearchParams({select:'value',key:'eq.owner_console_settings',limit:'1'}).toString());
      const overrides=settings?.[0]?.value?.serviceFeeOverrides||{};
      const specified=overrides['govt:'+positions[subName]];
      const expected=specified!==undefined&&specified!==null&&String(specified)!==''?Number(specified):defaults[subName];
      if(!Number.isFinite(expected)||expected<=0||Math.round(expected*100)!==expected*100)
        return res.status(409).json({error:'Owner Government service fee is not valid'});
      if(Math.abs(Number(existing.amount)-expected)>0.001)
        return res.status(409).json({error:'Application amount differs from Owner-defined Government fee. Reopen the form'});
      if(/paid|verified|captured|completed/i.test(String(existing.payment_status||''))&&
         !/sandbox|test/i.test(String(existing.payment_status||'')))
        return res.status(409).json({error:'Application already paid'});
      amount=expected; // authoritative Owner fee; ignore user-provided amount
    }else if(existing&&Number(existing.amount)>0)amount=Number(existing.amount);

    const amountText=amount.toFixed(2),firstname=safe(b.firstname||existing?.actor_name||'DBest User',60),email=safe(b.email,180).toLowerCase();
    if(!email||!email.includes('@'))return res.status(400).json({error:'A valid email is required for PayU checkout'});
    const phone=safe(b.phone,20).replace(/[^0-9+]/g,''),section=safe(b.udf2||b.section||existing?.section||'',80),sub=safe(b.udf3||b.sub||existing?.subsection||'',100),actorRef=safe(b.udf1||b.userId||existing?.actor_ref||'',80);
    const txnid=('DB'+Date.now().toString(36)+crypto.randomBytes(4).toString('hex')).slice(0,25),origin=requestOrigin(req);
    if(!origin)return res.status(500).json({error:'Unable to resolve payment return URL'});
    const returnUrl=origin+'/api/payu/return',productinfo=safe(b.productinfo||`DBest ${section} - ${sub}`,100)||'DBest Payment';
    const fields={key:c.key,txnid,amount:amountText,productinfo,firstname,email,phone,surl:returnUrl,furl:returnUrl,udf1:actorRef,udf2:section,udf3:sub,udf4:ref,udf5:''};
    fields.hash=paymentHash(c,fields);
    try{
      await savePending({transaction_id:ref,section:section||existing?.section||'Payment',subsection:sub||existing?.subsection||'',actor_type:'member',actor_name:firstname,actor_ref:actorRef,amount:amountText,payment_mode:'PayU',payment_status:isGovt?'PayU Sandbox Initiated - No Settlement':'Initiated',reference:txnid,metadata:{...(existing?.metadata||{}),gateway:'payu',payu_txnid:txnid,environment:isGovt?'payu_sandbox':(process.env.VERCEL_ENV||'preview'),payment_stage:isGovt?'PayU Sandbox Initiated':'PayU Initiated',sandbox_only:isGovt}});
    }catch(e){console.error('PayU pending transaction storage error',e);return res.status(500).json({error:'Unable to create central DBest payment record'});}
    return res.status(200).json({provider:'payu',mode:c.mode,action:c.paymentUrl,fields,dbestRef:ref,txnid,amount:amountText});
  }catch(err){console.error('PayU create-payment error',err);const sc=Number(err?.statusCode)||500;return res.status(sc>=400&&sc<600?sc:500).json({error:String(err?.message||'Unable to create PayU payment')});}
};
