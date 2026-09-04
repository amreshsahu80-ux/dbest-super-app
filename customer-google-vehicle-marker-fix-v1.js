(function(){
'use strict';
const V='20260904-customer-vehicle-marker-fix-v1';
if(window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX?.version===V)return;
let patched=false,timer=null;
function emojiFor(title){const t=String(title||'').toLowerCase();if(/bike|motor|scoot|two.?wheel/.test(t))return'🏍️';if(/auto|rickshaw|e.?rick|three.?wheel/.test(t))return'🛺';if(/suv|innova|ertiga|xl6|xuv/.test(t))return'🚙';return'🚕'}
function install(){
  const M=window.google?.maps?.Marker,SP=window.google?.maps?.SymbolPath;
  if(!M?.prototype||!SP)return false;
  if(M.prototype.__dbestCustomerVehicleMarkerFix){patched=true;return true}
  const rawTitle=M.prototype.setTitle,rawIcon=M.prototype.setIcon,rawLabel=M.prototype.setLabel;
  if(typeof rawTitle!=='function'||typeof rawIcon!=='function'||typeof rawLabel!=='function')return false;
  M.prototype.setTitle=function(title){
    const out=rawTitle.apply(this,arguments),t=String(title||'');
    if(/vaahak live location/i.test(t)){
      try{
        rawIcon.call(this,{path:SP.CIRCLE,scale:22,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#175cff',strokeOpacity:1,strokeWeight:3});
        rawLabel.call(this,{text:emojiFor(t),fontSize:'23px',fontWeight:'700'});
        if(typeof this.setZIndex==='function')this.setZIndex(9999);
      }catch(e){console.warn('DBest visible vehicle marker fallback',e)}
    }
    return out;
  };
  M.prototype.__dbestCustomerVehicleMarkerFix=true;
  patched=true;
  return true;
}
function watchGoogle(){
  if(install()){if(timer){clearInterval(timer);timer=null}return}
  if(!timer)timer=setInterval(()=>{if(install()&&timer){clearInterval(timer);timer=null}},100);
}
const mo=new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes||[]){if(n?.tagName==='SCRIPT'&&/maps\.googleapis\.com\/maps\/api\/js/i.test(String(n.src||''))){n.addEventListener('load',watchGoogle,{once:true});watchGoogle()}}}});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){ }
watchGoogle();
window.addEventListener('load',watchGoogle,{once:true});
window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX={version:V,install:watchGoogle,emojiFor,get patched(){return patched}};
})();