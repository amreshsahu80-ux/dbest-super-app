(function(){
'use strict';
const VERSION='1.1.0';
const CANONICAL='/ServicePartner';
const isDirect=()=>location.pathname.replace(/\/$/,'')===CANONICAL||new URLSearchParams(location.search).get('portal')==='service-partner';
const partnerScreenOpen=()=>!!document.querySelector('#dbestPartnerBasicCreate,#dbestPartnerBasicLogin,#dbestPartnerOtpForm,#dbestFreeSpForm,#dbestFreeSpAvailability,#dbestSpAvailability');
let attempted=false;
function openPortal(){
  if(!isDirect()||attempted||partnerScreenOpen())return false;
  if(window.DBEST_SERVICE_PARTNERS_FREE)return false;
  const api=window.DBEST_SERVICE_PARTNERS;if(!api||typeof api.openPortal!=='function')return false;
  attempted=true;try{api.openPortal();return true}catch(e){console.warn('DBest Service Partner direct route',e);return false}
}
function directFlow(){
  if(!isDirect())return;
  try{document.title='DBest Service Partner Portal'}catch(_){}
  let n=0;const timer=setInterval(()=>{
    n++;
    if(window.DBEST_SERVICE_PARTNERS_FREE||partnerScreenOpen()){clearInterval(timer);return}
    if(openPortal()||n>=12)clearInterval(timer);
  },250);
}
function bindLinks(){
  document.querySelectorAll('a[data-dbest-service-partner],button[data-dbest-service-partner]').forEach(el=>{
    el.onclick=function(e){e.preventDefault();location.href=CANONICAL};
  });
}
[100,400,900].forEach(ms=>setTimeout(()=>{bindLinks();directFlow()},ms));
new MutationObserver(bindLinks).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_SERVICE_PARTNER_ROUTE={version:VERSION,url:CANONICAL,open:()=>{location.href=CANONICAL}};
})();