(function(){
  window.DBEST_CAB_MODERN_UI={version:'disabled-by-selected-v3-grey-map'};
  function addGreyMapStyle(){
    if(document.getElementById('dbest-cab-grey-map-style')) return;
    const s=document.createElement('style');
    s.id='dbest-cab-grey-map-style';
    s.textContent=`
      .cab6Page .leaflet-tile-pane{
        filter:grayscale(1) saturate(.18) brightness(1.08) contrast(.92) !important;
      }
      .cab6Page .leaflet-overlay-pane,
      .cab6Page .leaflet-marker-pane,
      .cab6Page .leaflet-shadow-pane,
      .cab6Page .leaflet-tooltip-pane,
      .cab6Page .leaflet-popup-pane{
        filter:none !important;
      }
      .cab6Page .leaflet-container{
        background:#d9dde2 !important;
      }
    `;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addGreyMapStyle,{once:true});
  else addGreyMapStyle();
})();