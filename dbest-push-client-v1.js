(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))return;
const API=BASE+'/functions/v1/push-notification-live';
const path=location.pathname.toLowerCase();
function ident(){
  try{
    if(path.includes('vendor')){const t=localStorage.getItem('dbest_vendor_live_token')||'';return t?{type:'Vendor',token:t,header:'x-vendor-token'}:null}
    if(path.includes('vaahak')){const t=localStorage.getItem('dbest_vaahak_live_token')||'';return t?{type:'Vaahak',token:t,header:'x-vaahak-token'}:null}
    if(path.includes('servicepartner')||path.includes('service-partner')){const t=localStorage.getItem('dbest_partner_live_token')||'';return t?{type:'Service Partner',token:t,header:'x-dbest-partner-token'}:null}
    if(path.includes('superadmin')){const t=sessionStorage.getItem('dbest_territory_admin_token')||'';return t?{type:'Distributor',token:t,header:'x-dbest-territory-admin-token'}:null}
    if(path==='/owner'||path.startsWith('/owner/')){const t=sessionStorage.getItem('dbest_owner_session_token')||'';return t?{type:'Owner',token:t,header:'x-dbest-owner-token'}:null}
    const t=localStorage.getItem('dbest_member_live_token')||'';return t?{type:'Member',token:t,header:'x-dbest-member-token'}:null;
  }catch(_){return null}
}
function headers(id){const h={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};if(id?.token)h[id.header]=id.token;return h}
async function call(body,id){const r=await fetch(API,{method:'POST',cache:'no-store',headers:headers(id),body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.detail||('HTTP '+r.status));return d}
function b64(s){const pad='='.repeat((4-s.length%4)%4),b=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
function sameKey(buf,expected){try{if(!buf)return false;const a=new Uint8Array(buf),b=b64(expected);if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true}catch(_){return false}}
async function ensure(){
  const id=ident();if(!id)return {ok:false,reason:'not_logged_in'};
  const reg=await navigator.serviceWorker.register('/dbest-sw.js',{scope:'/'});
  const pk=await call({action:'public_key'},id);if(!pk.publicKey)throw Error('Push key unavailable');
  let sub=await reg.pushManager.getSubscription();
  if(sub&&!sameKey(sub.options?.applicationServerKey,pk.publicKey)){try{await call({action:'unregister',endpoint:sub.endpoint},id)}catch(_){}try{await sub.unsubscribe()}catch(_){}sub=null}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(pk.publicKey)});
  const d=await call({action:'register',subscription:sub.toJSON(),userAgent:navigator.userAgent,platform:navigator.userAgentData?.platform||navigator.platform||''},id);
  return {...d,subscription:sub};
}
async function enable(){
  if(Notification.permission==='denied'){alert('Notifications are blocked for DBest in your browser settings. Please allow notifications for dbest4u.com.');return}
  const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(p!=='granted')return;
  try{await ensure();update();notice('DBest push notifications enabled.')}catch(e){console.error(e);notice('Push setup could not be completed. Please try again.',false)}
}
async function disable(){
  const id=ident();if(!id)return;
  try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await call({action:'unregister',endpoint:sub.endpoint},id);await sub.unsubscribe()}update();notice('DBest push notifications disabled.')}catch(e){console.error(e)}
}
function notice(t,ok=true){let n=document.getElementById('dbestPushToast');if(!n){n=document.createElement('div');n.id='dbestPushToast';n.style.cssText='position:fixed;left:14px;right:14px;bottom:76px;max-width:520px;margin:auto;z-index:2147483647;padding:12px 14px;border-radius:14px;font:800 13px system-ui;box-shadow:0 12px 35px #0003';document.body.appendChild(n)}n.textContent=t;n.style.background=ok?'#eafff3':'#fff0f0';n.style.color=ok?'#146b43':'#9b2525';n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',3500)}
async function update(){const b=document.getElementById('dbestPushEnable');if(!b)return;let on=false;try{const reg=await navigator.serviceWorker.getRegistration('/');on=Notification.permission==='granted'&&!!(await reg?.pushManager.getSubscription())}catch(_){}b.textContent=on?'🔔 Push ON':'🔔 Enable Push';b.style.background=on?'#176b42':'#175cff';b.onclick=on?disable:enable}
function isMemberHome(){const id=ident();if(!id||id.type!=='Member')return false;const m=document.getElementById('m');const open=!!(document.body.classList.contains('sectionOpen')||m?.querySelector('.sectionOverlay,.overlay'));return !open}
function removeFloating(){document.getElementById('dbestPushEnable')?.remove();document.getElementById('dbestPushToast')?.remove()}
function install(){
  if(!isMemberHome()){removeFloating();return}
  if(document.getElementById('dbestPushEnable'))return;
  const b=document.createElement('button');b.id='dbestPushEnable';b.type='button';b.style.cssText='position:fixed;left:12px;bottom:14px;z-index:2147483644;border:0;border-radius:999px;padding:11px 14px;color:#fff;font:900 12px system-ui;box-shadow:0 9px 28px rgba(0,0,0,.22);cursor:pointer';document.body.appendChild(b);update();
  if(Notification.permission==='granted')ensure().then(update).catch(()=>{});
}
function syncFloating(){if(isMemberHome())install();else removeFloating()}
let pushSyncQueued=false;
function queuePushSync(){if(pushSyncQueued)return;pushSyncQueued=true;requestAnimationFrame(()=>{pushSyncQueued=false;syncFloating()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncFloating,400),{once:true});else setTimeout(syncFloating,400);
const pushObs=new MutationObserver(queuePushSync);pushObs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
window.addEventListener('hashchange',queuePushSync);window.addEventListener('popstate',queuePushSync);window.addEventListener('pageshow',queuePushSync);
setInterval(syncFloating,3000);
window.DBEST_PUSH={enable,disable,ensure,status:async()=>call({action:'status'},ident())};
})();