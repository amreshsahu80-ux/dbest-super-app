const SUPABASE_URL=String(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co').replace(/\/+$/,'');
const SERVICE_KEY=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SECRET_KEY||'');

async function sb(path){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:SERVICE_KEY,Authorization:'Bearer '+SERVICE_KEY}});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{j=t}
  if(!r.ok)throw new Error((j&&j.message)||('Supabase '+r.status));
  return j;
}
async function cascade(transactionId){
  const r=await fetch(SUPABASE_URL+'/functions/v1/service-cascade-live',{
    method:'POST',
    headers:{apikey:SERVICE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({transactionId})
  });
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{j=t}
  if(!r.ok)throw new Error((j&&j.error)||('Cascade '+r.status));
  return j;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'});}
  const secret=String(process.env.CRON_SECRET||'');
  const auth=String(req.headers.authorization||'');
  const sched=String(req.headers['x-vercel-cron-schedule']||'');
  if(secret){if(auth!==('Bearer '+secret))return res.status(401).json({ok:false,error:'unauthorized'});}
  else if(sched!=='* * * * *')return res.status(401).json({ok:false,error:'cron_only'});
  if(!SERVICE_KEY)return res.status(503).json({ok:false,error:'service_role_not_configured'});
  try{
    const now=new Date().toISOString();
    const q='hyperlocal_jobs_live?status=eq.Assigned&offer_expires_at=lt.'+encodeURIComponent(now)+'&select=transaction_id&order=offer_expires_at.asc&limit=50';
    const rows=await sb(q),results=[];
    for(const row of rows||[]){
      try{results.push({transactionId:row.transaction_id,result:await cascade(String(row.transaction_id))});}
      catch(e){results.push({transactionId:row.transaction_id,error:String(e.message||e)});}
    }
    return res.status(200).json({ok:true,processed:results.length,results});
  }catch(e){
    console.error('[service-cascade-cron]',e);
    return res.status(500).json({ok:false,error:'cascade_cron_failed'});
  }
};