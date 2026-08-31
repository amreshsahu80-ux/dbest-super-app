(function(){
'use strict';
const VERSION='1.2.0';
function mount(){try{if(window.DBEST_CRITICAL_UX_V2&&typeof window.DBEST_CRITICAL_UX_V2.mount==='function')window.DBEST_CRITICAL_UX_V2.mount()}catch(e){}}
setTimeout(mount,500);window.addEventListener('pageshow',()=>setTimeout(mount,80));
window.DBEST_CAB_CLEAN_UX={version:VERSION,mount};
})();