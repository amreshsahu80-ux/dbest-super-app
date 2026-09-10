const {payuConfig}=require('../../lib/payu');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  const c=payuConfig();
  return res.status(200).json({configured:c.configured,mode:c.mode,provider:'payu'});
};
