(function(){
'use strict';
const VERSION='1.0.0';
const CANONICAL='/ServicePartner';
const isDirect=()=>location.pathname.replace(/\/$/,'')===CANONICAL||new URLSearchParams(location.search).get('portal')==='service-partner';
const memberReady=()=>{try{return !!(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||(typeof session!=='undefined'&&session?.id))}catch(_){return false}};
let opening=false,lastAttempt=0;
function openPortal(){
  if(opening)return;
  const api=window.DBEST_SERVICE_PARTNERS;
  if(!api||typeof api.openPortal!=='function')return;
  const now=Date.now();if(now-lastAttempt<900)return;lastAttempt=now;opening=true;
  try{api.openPortal()}catch(e){console.warn('DBest Service Partner direct route',e)}
  setTimeout(()=>{opening=false},700);
}
function directFlow(){
  if(!isDirect())return;
  try{document.title='DBest Service Partner Portal'}catch(_){}
  openPortal();
  let n=0;
  const timer=setInterval(()=>{
    n++;
    if(memberReady())openPortal();
    else if(n%4===0)openPortal();
    if(n>120)clearInterval(timer);
  },1000);
}
function bindLinks(){
  document.querySelectorAll('a[data-dbest-service-partner],button[data-dbest-service-partner]').forEach(el=>{
    el.onclick=function(e){e.preventDefault();location.href=CANONICAL};
  });
}
[100,400,900,1800,3200].forEach(ms=>setTimeout(()=>{bindLinks();directFlow()},ms));
new MutationObserver(bindLinks).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_SERVICE_PARTNER_ROUTE={version:VERSION,url:CANONICAL,open:()=>{location.href=CANONICAL}};
})();
