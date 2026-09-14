(function(){
'use strict';
const VERSION='20260914-clean-ui-final-v1';
const TOKEN_KEY='dbest_vaahak_live_token';
function hasLiveToken(){try{return !!localStorage.getItem(TOKEN_KEY)}catch(_){return false}}
function cleanApi(){return window.DBEST_VAAHAK_STABLE_DASHBOARD||null}
function openClean(){
  const api=cleanApi();
  if(!hasLiveToken()||!api)return false;
  try{api.refresh?.();return true}catch(_){return false}
}
function install(){
  const legacyOpen=window.openVaahakPortal;
  const legacyDash=window.vaahakDashboard;
  if(typeof legacyOpen==='function'&&!legacyOpen.__dbestCleanFinal){
    function open(){if(openClean())return;return legacyOpen.apply(this,arguments)}
    open.__dbestCleanFinal=true;open.__dbestLegacy=legacyOpen;window.openVaahakPortal=open;
  }
  if(typeof legacyDash==='function'&&!legacyDash.__dbestCleanFinal){
    function dash(){if(openClean())return;return legacyDash.apply(this,arguments)}
    dash.__dbestCleanFinal=true;dash.__dbestLegacy=legacyDash;window.vaahakDashboard=dash;
  }
}
install();
let tries=0;const timer=setInterval(()=>{install();if(++tries>80)clearInterval(timer)},250);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')install()});
window.DBEST_VAAHAK_CLEAN_UI_FINAL={version:VERSION,install,openClean};
})();