module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const stage=String((req.query&&req.query.stage)||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  if(process.env.VERCEL_ENV==='preview'&&stage){console.log('[DBEST_RZP_TRACE]',stage);}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const secret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  const persistenceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();
  return res.status(200).json({provider:'razorpay',configured:!!(keyId&&secret),persistenceConfigured:!!persistenceKey,keyId:keyId||'',mode:keyId.startsWith('rzp_live_')?'live':keyId.startsWith('rzp_test_')?'test':'unknown'});
};