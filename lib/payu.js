const crypto=require('crypto');

function safe(v,n=180){return String(v??'').replace(/[\r\n]/g,' ').trim().slice(0,n)}
function firstEnv(names){for(const n of names){const v=safe(process.env[n],4096);if(v)return {value:v,source:n}}return {value:'',source:''}}
function payuConfig(){
  const k=firstEnv(['PAYU_KEY','PAYU_MERCHANT_KEY','PAYU_KEY_ID','PAYU_API_KEY','PAYU_LIVE_KEY','PAYU_MONEY_KEY']);
  const s=firstEnv(['PAYU_SALT','PAYU_MERCHANT_SALT','PAYU_SECRET','PAYU_MERCHANT_SECRET','PAYU_API_SALT','PAYU_LIVE_SALT','PAYU_MONEY_SALT']);
  const mode=safe(process.env.PAYU_MODE||process.env.PAYU_ENV||'test',20).toLowerCase()==='live'?'live':'test';
  return {key:safe(k.value,120),salt:safe(s.value,200),keySource:k.source,saltSource:s.source,mode,configured:!!(k.value&&s.value),paymentUrl:mode==='live'?'https://secure.payu.in/_payment':'https://test.payu.in/_payment',verifyUrl:mode==='live'?'https://info.payu.in/merchant/postservice.php?form=2':'https://test.payu.in/merchant/postservice.php?form=2'};
}
function sha512(s){return crypto.createHash('sha512').update(String(s)).digest('hex')}
function paymentHash(c,f){
  const seq=[c.key,f.txnid,f.amount,f.productinfo,f.firstname,f.email,f.udf1||'',f.udf2||'',f.udf3||'',f.udf4||'',f.udf5||'','','','','','',c.salt].join('|');
  return sha512(seq);
}
function verifyHash(c,txnid){return sha512([c.key,'verify_payment',txnid,c.salt].join('|'))}
function supabaseConfig(){
  const url=safe(process.env.SUPABASE_URL||'https://ydedmotbacnllkijzmvp.supabase.co',500).replace(/\/+$/,'');
  const key=safe(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY,4096);
  return {url,key,configured:!!(url&&key)}
}
function adminHeaders(key){const h={apikey:key};if(/^eyJ[^.]*\.[^.]+\.[^.]+$/.test(key))h.Authorization='Bearer '+key;return h}
async function sbFetch(path,opts={}){
  const c=supabaseConfig();if(!c.configured){const e=new Error('Central DBest storage is not configured');e.statusCode=503;throw e}
  const r=await fetch(c.url+path,{...opts,headers:{...adminHeaders(c.key),'Content-Type':'application/json',...(opts.headers||{})}});
  const txt=await r.text();let j=null;try{j=txt?JSON.parse(txt):null}catch{j=txt}
  if(!r.ok){const e=new Error((j&&typeof j==='object'&&(j.message||j.error_description||j.error))||('Supabase HTTP '+r.status));e.statusCode=r.status;throw e}
  return j;
}
function requestOrigin(req){
  const proto=safe(req.headers['x-forwarded-proto']||'https',20).split(',')[0];
  const host=safe(req.headers['x-forwarded-host']||req.headers.host,300).split(',')[0];
  if(!host)return '';
  return `${proto}://${host}`;
}
function parseBody(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  const s=String(req.body||'');
  if(!s)return {};
  try{return JSON.parse(s)}catch{}
  return Object.fromEntries(new URLSearchParams(s));
}
async function verifyWithPayU(txnid){
  const c=payuConfig();if(!c.configured){const e=new Error('PayU is not configured');e.statusCode=503;throw e}
  const body=new URLSearchParams({key:c.key,command:'verify_payment',var1:safe(txnid,120),hash:verifyHash(c,txnid)});
  const r=await fetch(c.verifyUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const txt=await r.text();let j={};try{j=JSON.parse(txt)}catch{j={raw:txt}}
  if(!r.ok){const e=new Error('PayU verification HTTP '+r.status);e.statusCode=502;throw e}
  const d=j?.transaction_details?.[txnid]||j?.result?.[0]||j?.result||{};
  return {raw:j,detail:d};
}
module.exports={safe,payuConfig,paymentHash,supabaseConfig,sbFetch,requestOrigin,parseBody,verifyWithPayU};
