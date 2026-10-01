export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false});
  try{
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const events=Array.isArray(b.events)?b.events.slice(-80):[];
    console.log('[VAAHAK_DIAG]',JSON.stringify({ts:new Date().toISOString(),reason:String(b.reason||''),events}));
    return res.status(200).json({ok:true});
  }catch(e){console.error('[VAAHAK_DIAG_ERROR]',e);return res.status(400).json({ok:false});}
}