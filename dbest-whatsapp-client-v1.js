(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/whatsapp-notification-live';
const path=location.pathname.toLowerCase();

function ident(){
  try{
    if(path.includes('vendor')){const t=localStorage.getItem('dbest_vendor_live_token')||'';return t?{type:'Vendor',token:t,header:'x-vendor-token'}:null}
    if(path.includes('vaahak')){const t=localStorage.getItem('dbest_vaahak_live_token')||'';return t?{type:'Vaahak',token:t,header:'x-vaahak-token'}:null}
    if(path.includes('servicepartner')||path.includes('service-partner')){const t=localStorage.getItem('dbest_partner_live_token')||'';return t?{type:'Service Partner',token:t,header:'x-dbest-partner-token'}:null}
    const t=localStorage.getItem('dbest_member_live_token')||'';return t?{type:'Member',token:t,header:'x-dbest-member-token'}:null;
  }catch(_){return null}
}
function headers(id){const h={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};if(id?.token)h[id.header]=id.token;return h}
async function call(body){
  const id=ident();if(!id)throw Error('Please login first.');
  const r=await fetch(API,{method:'POST',cache:'no-store',headers:headers(id),body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||d.detail||('HTTP '+r.status));
  return d;
}
function toast(t,ok=true){
  let n=document.getElementById('dbestWaToast');
  if(!n){n=document.createElement('div');n.id='dbestWaToast';n.style.cssText='position:fixed;left:14px;right:14px;bottom:124px;max-width:540px;margin:auto;z-index:2147483647;padding:12px 14px;border-radius:14px;font:800 13px system-ui;box-shadow:0 12px 35px #0003';document.body.appendChild(n)}
  n.textContent=t;n.style.background=ok?'#eafff3':'#fff0f0';n.style.color=ok?'#146b43':'#9b2525';n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',4200);
}
async function status(){try{return await call({action:'status'})}catch(e){return {ok:false,error:e.message}}}
async function enable(){
  try{
    const s=await status();
    let mobile=String(s.mobile||'').replace(/\D/g,'');
    if(!mobile){
      mobile=String(prompt('Enter your WhatsApp mobile number including country code (example: 919876543210):')||'').replace(/\D/g,'');
      if(!mobile)return;
    }
    const ok=confirm('Enable DBest transactional WhatsApp alerts on +'+mobile+'?\n\nYou may receive important order, ride, delivery or service updates. Marketing messages are NOT enabled by this setting.');
    if(!ok)return;
    await call({action:'opt_in',mobile,source:'DBest portal WhatsApp consent'});
    await refresh();toast('DBest WhatsApp transactional alerts enabled.');
  }catch(e){console.error(e);toast('WhatsApp setup failed: '+e.message,false)}
}
async function disable(){
  try{
    if(!confirm('Turn off DBest WhatsApp alerts?'))return;
    await call({action:'opt_out'});
    await refresh();toast('DBest WhatsApp alerts disabled.');
  }catch(e){console.error(e);toast('Unable to update WhatsApp preference.',false)}
}
async function refresh(){
  const b=document.getElementById('dbestWhatsAppEnable');if(!b)return;
  const s=await status();
  const on=!!s?.preferences?.opted_in;
  b.textContent=on?'WhatsApp ON':'Enable WhatsApp';
  b.style.background=on?'#128C7E':'#25D366';
  b.onclick=on?disable:enable;
  b.title=on?'Transactional WhatsApp alerts enabled':'Enable important DBest WhatsApp alerts';
}
function homeVisible(){const hero=document.querySelector('.hero');if(!hero)return false;try{const s=getComputedStyle(hero);return s.display!=='none'&&s.visibility!=='hidden'&&hero.getClientRects().length>0}catch(_){return !!hero}}
function isMemberHome(){const id=ident();return !!id&&id.type==='Member'&&homeVisible()}
function removeFloating(){document.getElementById('dbestWhatsAppEnable')?.remove();document.getElementById('dbestWaToast')?.remove()}
function install(){
  if(!isMemberHome()){removeFloating();return}
  if(document.getElementById('dbestWhatsAppEnable'))return;
  const b=document.createElement('button');
  b.id='dbestWhatsAppEnable';b.type='button';
  b.style.cssText='position:fixed;right:12px;bottom:14px;z-index:2147483644;border:0;border-radius:999px;padding:11px 14px;color:#fff;font:900 12px system-ui;box-shadow:0 9px 28px rgba(0,0,0,.22);cursor:pointer';
  document.body.appendChild(b);refresh();
}
function syncFloating(){if(isMemberHome())install();else removeFloating()}
let waSyncQueued=false;
function queueWaSync(){if(waSyncQueued)return;waSyncQueued=true;requestAnimationFrame(()=>{waSyncQueued=false;syncFloating()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncFloating,550),{once:true});else setTimeout(syncFloating,550);
const waObs=new MutationObserver(queueWaSync);waObs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
window.addEventListener('hashchange',queueWaSync);window.addEventListener('popstate',queueWaSync);window.addEventListener('pageshow',queueWaSync);
setInterval(syncFloating,3000);
window.DBEST_WHATSAPP={enable,disable,status,refresh};
})();