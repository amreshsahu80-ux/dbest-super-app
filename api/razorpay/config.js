module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const keyId=String(process.env.RAZORPAY_KEY_ID||'').trim();
  const secret=String(process.env.RAZORPAY_KEY_SECRET||'').trim();
  return res.status(200).json({
    provider:'razorpay',
    configured:!!(keyId&&secret),
    keyId:keyId||'',
    mode:keyId.startsWith('rzp_live_')?'live':keyId.startsWith('rzp_test_')?'test':'unknown'
  });
};