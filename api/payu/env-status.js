export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const names=['PAYU_KEY','PAYU_SALT','PAYU_MERCHANT_KEY','PAYU_MERCHANT_SALT','PAYU_MERCHANT_ID','PAYU_SECRET','PAYU_MERCHANT_SECRET','PAYU_KEY_ID','PAYU_LIVE_KEY','PAYU_LIVE_SALT'];
  const present={};
  for(const n of names)present[n]=!!String(process.env[n]||'').trim();
  res.status(200).json({provider:'payu',present});
}
