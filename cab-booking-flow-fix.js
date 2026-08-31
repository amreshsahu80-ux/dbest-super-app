(function(){
'use strict';
const VERSION='2.2.0';
function proceed(){
  try{
    const api=window.DBEST_CAB_MAPPLS_RENTAL;
    if(api&&typeof api.calculate==='function')return api.calculate();
  }catch(e){}
  try{if(typeof window.toast==='function')window.toast('Please select pickup and drop, then continue.')}catch(e){}
}
window.DBEST_CAB_BOOKING_FLOW_FIX={version:VERSION,proceed,mode:'performance-safe'};
})();