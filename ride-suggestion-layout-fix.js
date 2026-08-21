(function(){
  const ID='dbest-ride-suggestion-layout-fix';
  function apply(){
    if(document.getElementById(ID)) return;
    const s=document.createElement('style');
    s.id=ID;
    s.textContent=`
      .dbestRideFieldWrap{position:relative}
      .dbestRideSuggestions{position:static!important;left:auto!important;right:auto!important;top:auto!important;margin-top:5px!important;max-height:210px!important;overflow:auto!important;box-shadow:0 10px 24px rgba(17,33,68,.12)!important}
      .dbestRideFieldWrap:has(.dbestRideSuggestions[style*="display: block"]) + .dbestRideFieldWrap{margin-top:4px}
      @media(max-width:600px){
        .dbestRideSuggestions{max-height:180px!important}
      }
    `;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
})();