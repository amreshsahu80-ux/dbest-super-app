(function(){
'use strict';
const VERSION='1.0.0';
function enforce(){
  const c=window.DBEST_CAB_MAPPLS_CONSOLIDATED;
  if(!c||typeof c.open!=='function')return false;
  window.openRidePlatform=c.open;
  window.DBEST_ACTIVE_CAB_VERSION='MAPPLS_CONSOLIDATED_V1';
  return true;
}
[0,150,1300,3200,5200].forEach(ms=>setTimeout(enforce,ms));
window.DBEST_CAB_MAPPLS_AUTHORITY={version:VERSION,enforce};
})();
