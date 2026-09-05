(function(){
'use strict';
const V='20260905-single-ui-v5';
function activate(){
  const api=window.DBEST_CAB_SELECTED_UI;
  if(!api||typeof api.open!=='function')return false;
  window.DBEST_CAB_GOOGLE=api;
  window.DBEST_CAB_MAPPLS_RENTAL=api;
  window.DBEST_ACTIVE_CAB_VERSION='NATIVE_SELECTED_UI_V5';
  window.openRidePlatform=api.open;
  return true;
}
if(!activate()){
  let n=0;const t=setInterval(()=>{n++;if(activate()||n>60)clearInterval(t)},100);
}
window.DBEST_CAB_PLANNED_UI={version:V,activate};
})();