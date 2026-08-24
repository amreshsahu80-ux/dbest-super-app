(function(){
  'use strict';
  // Legacy compatibility shim only. The active Reports UI is managed by
  // owner-report-visibility-v2.js. Do not inject/remove DOM here: the old
  // MutationObserver used to fight with V2 and caused the Owner page to
  // jump up/down continuously on mobile.
  function openReports(){
    if(typeof window.ownerReportCenter==='function') return window.ownerReportCenter();
    if(window.DBEST_OWNER_REPORT_VISIBILITY_V2?.open) return window.DBEST_OWNER_REPORT_VISIBILITY_V2.open();
    try{window.toast?.('Owner Excel Report Center is loading. Please tap again.')}catch(e){}
  }
  function cleanupLegacy(){
    try{document.getElementById('dbestOwnerReportsFloating')?.remove();}catch(e){}
    try{document.getElementById('dbestOwnerReportsProminent')?.remove();}catch(e){}
  }
  cleanupLegacy();
  window.DBEST_OWNER_REPORT_LAUNCHER={version:'2.0.0-stable',refresh:cleanupLegacy,open:openReports};
})();
