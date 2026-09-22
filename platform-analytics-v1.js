(function(){
'use strict';
const VERSION='20260922-platform-analytics-v1';
if(window.DBEST_PLATFORM_ANALYTICS?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/platform-analytics-live',VK='dbest_analytics_visitor_v1',SK='dbest_analytics_session_v1';
function uuid(){try{return crypto.randomUUID()}catch(_){return 'v_'+Date.now().toString(36)+Math.random().toString(36).slice(2)}}
function getStore(store,key){try{let v=store.getItem(key);if(!v){v=uuid();store.setItem(key,v)}return v}catch(_){return uuid()}}
const visitorId=getStore(localStorage,VK),sessionId=getStore(sessionStorage,SK);
function member(){try{return window.DBEST_SESSION_COMPAT?.read?.()||JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch(_){return{}}}
function browser(){const u=navigator.userAgent||'';if(/Edg\//i.test(u))return'Edge';if(/OPR\//i.test(u))return'Opera';if(/Chrome\//i.test(u))return'Chrome';if(/Safari\//i.test(u)&&!/Chrome/i.test(u))return'Safari';if(/Firefox\//i.test(u))return'Firefox';return'Other'}
function device(){const u=navigator.userAgent||'';if(/iPad|Tablet|Android(?!.*Mobile)/i.test(u))return'tablet';if(/Mobi|Android|iPhone/i.test(u))return'mobile';return'desktop'}
function refHost(){try{return document.referrer?new URL(document.referrer).hostname:''}catch(_){return''}}
function send(event,section=''){
 const s=member(),role=String(s.role||'visitor').toLowerCase(),id=role==='visitor'?'':String(s.id||'');
 const body={action:'track',event,visitorId,sessionId,memberId:id||null,memberRole:role,path:location.pathname,section:section||null,referrerHost:refHost(),language:String(localStorage.getItem('d2_lang')||navigator.language||'').slice(0,20),deviceType:device(),browserFamily:browser()};
 try{fetch(API,{method:'POST',keepalive:true,cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}).catch(()=>{})}catch(_){}
}
let pageDone=false;
function page(){if(pageDone)return;pageDone=true;send('page_view')}
function wrap(name,event,sectionFromArgs){
 const fn=window[name];if(typeof fn!=='function'||fn.__dbestAnalytics)return;
 const w=function(){try{const section=sectionFromArgs?sectionFromArgs(arguments):'';send(event,section)}catch(_){}return fn.apply(this,arguments)};
 w.__dbestAnalytics=true;window[name]=w;try{eval(name+'=window[name]')}catch(_){}
}
function install(){
 wrap('openService','section_view',a=>String(a[0]||''));
 wrap('memberDash','dashboard_view',()=> 'member_dashboard');
 wrap('openRidePlatform','section_view',()=> 'car');
 wrap('openCommerceHub','section_view',()=> 'store');
}
let previous='';
function sessionWatch(){
 const s=member(),sig=String(s.role||'visitor')+'|'+String(s.id||'');
 if(previous&&previous.startsWith('visitor|')&&!sig.startsWith('visitor|')&&s.id)send('login_success');
 previous=sig;
}
[120,500,1200,2500].forEach(ms=>setTimeout(()=>{install();sessionWatch()},ms));
document.addEventListener('click',()=>setTimeout(install,0),true);
window.addEventListener('pageshow',()=>{install();sessionWatch()});
window.addEventListener('dbest:session-sync',sessionWatch);
setTimeout(page,300);
setInterval(sessionWatch,3000);
window.DBEST_PLATFORM_ANALYTICS={version:VERSION,track:send,pageView:page,visitorId,sessionId};
})();