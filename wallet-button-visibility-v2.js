(function(){
'use strict';
const V='20260914-wallet-visible-v4-perf';
if(window.DBEST_WALLET_BUTTON_VISIBILITY?.version===V)return;
const STYLE_ID='dbestWalletVisibilityStyle';
function loggedIn(){
  try{
    const s=JSON.parse(localStorage.getItem('d2_session')||'{}');
    return !!(s&&s.id&&s.role&&s.role!=='visitor');
  }catch(_){return false}
}
function apply(){
  let s=document.getElementById(STYLE_ID);
  if(!s){
    s=document.createElement('style');
    s.id=STYLE_ID;
    (document.head||document.documentElement).appendChild(s);
  }
  const next=loggedIn()
    ?'#dbestWalletSummaryBtn{display:inline-flex!important;align-items:center!important}'
    :'#dbestWalletSummaryBtn{display:none!important}';
  if(s.textContent!==next)s.textContent=next;
}
apply();
window.addEventListener('pageshow',apply,{passive:true});
window.addEventListener('storage',e=>{if(!e||e.key==='d2_session')apply()},{passive:true});
window.DBEST_WALLET_BUTTON_VISIBILITY={version:V,apply};
})();