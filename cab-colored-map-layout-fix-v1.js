(function(){
'use strict';
const STYLE_ID='dbest-cab-colored-map-layout-fix-v1';
function css(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  .cab6Page .leaflet-tile-pane{filter:saturate(1.35) contrast(1.03)!important}
  .cab6MapFrame{position:relative;z-index:1!important}
  .cab6Confirm{position:relative;z-index:5!important;margin:14px 7px 0!important}
  .cab6VehicleHero{margin-top:0!important;min-height:70px;align-items:center!important}
  .cab6VehicleHero>div:last-child{min-width:0;position:relative;z-index:2}
  .cab6VehicleHero b{display:block!important;line-height:1.2!important}
  @media(max-width:420px){.cab6Confirm{margin:12px 7px 0!important}.cab6VehicleHero{gap:10px!important}}
  `;
  document.head.appendChild(s);
}
function patchLeaflet(){
  const L=window.L;
  if(!L||L.__dbestColorTilesPatched||typeof L.tileLayer!=='function')return;
  const original=L.tileLayer;
  L.tileLayer=function(url,opts){
    let nextUrl=url,nextOpts=Object.assign({},opts||{});
    if(typeof url==='string'&&(/tile\.openstreetmap\.org/i.test(url)||/basemaps\.cartocdn\.com/i.test(url))){
      nextUrl='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      nextOpts=Object.assign({},nextOpts,{subdomains:'abcd',maxZoom:20,attribution:'© OpenStreetMap © CARTO'});
    }
    return original.call(this,nextUrl,nextOpts);
  };
  L.__dbestColorTilesPatched=true;
}
function watchLeafletScript(){
  document.addEventListener('load',e=>{
    const t=e.target;
    if(t&&t.tagName==='SCRIPT'&&(t.id==='cab13LeafletJs'||/leaflet/i.test(String(t.src||''))))patchLeaflet();
  },true);
  const mo=new MutationObserver(muts=>{
    for(const m of muts){for(const n of m.addedNodes||[]){if(n&&n.tagName==='SCRIPT'&&(n.id==='cab13LeafletJs'||/leaflet/i.test(String(n.src||''))))n.addEventListener('load',patchLeaflet,{once:true});}}
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}
function init(){css();patchLeaflet();watchLeafletScript();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DBEST_CAB_MAP_LAYOUT_FIX={version:'1.0.0',refresh:()=>{css();patchLeaflet()}};
})();