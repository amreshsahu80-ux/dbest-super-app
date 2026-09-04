(function(){
'use strict';
const V='20260904-customer-vehicle-marker-3d-v2';
if(window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX?.version===V)return;
let patched=false,timer=null;
function kindFor(title){const t=String(title||'').toLowerCase();if(/bike|motor|scoot|two.?wheel/.test(t))return'bike';if(/auto|rickshaw|e.?rick|three.?wheel/.test(t))return'auto';if(/suv|innova|ertiga|xl6|xuv/.test(t))return'suv';return'cab'}
function emojiFor(title){const k=kindFor(title);return k==='bike'?'🏍️':k==='auto'?'🛺':k==='suv'?'🚙':'🚕'}
function headingFrom(marker){try{const i=marker?.getIcon?.(),u=typeof i==='string'?i:String(i?.url||'');if(!/^data:image\/svg\+xml/i.test(u))return 0;const raw=decodeURIComponent(u.slice(u.indexOf(',')+1));const m=raw.match(/rotate\(([-\d.]+)/i);const h=m?Number(m[1]):0;return Number.isFinite(h)?h:0}catch(_){return 0}}
function svg3d(kind,heading){
  const h=Number.isFinite(Number(heading))?Number(heading):0;
  let art='';
  if(kind==='bike')art=`
    <ellipse cx="18" cy="40" rx="7" ry="5" fill="#111827"/><ellipse cx="46" cy="40" rx="7" ry="5" fill="#111827"/>
    <ellipse cx="18" cy="39" rx="4.7" ry="3" fill="#dbeafe"/><ellipse cx="46" cy="39" rx="4.7" ry="3" fill="#dbeafe"/>
    <path d="M19 36L28 23l7 13M28 23h12l7 13M27 23l-5-7" fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 22c5-5 11-5 15-1l-4 8H26z" fill="url(#blue)" stroke="#1e3a8a" stroke-width="1.5"/>
    <path d="M31 19h9l4 3-5 3h-10z" fill="url(#shine)" opacity=".9"/>
    <path d="M37 20l5-7M42 13h6" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="22" y="17" width="10" height="3.5" rx="1.75" fill="#111827"/>
    <path d="M25 27l8 1" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
  `;else if(kind==='auto')art=`
    <path d="M14 39l4-19 9-8h18l8 9 1 18z" fill="url(#green)" stroke="#14532d" stroke-width="1.8"/>
    <path d="M18 20l8-9h19l6 10z" fill="url(#yellow)" stroke="#92400e" stroke-width="1.4"/>
    <path d="M24 16h18l5 6H20z" fill="url(#glass)" stroke="#0f172a" stroke-width="1.2"/>
    <path d="M51 22l4 17-7 3-2-19z" fill="#15803d" opacity=".95"/>
    <path d="M15 39h38l-6 7H18z" fill="#166534" opacity=".92"/>
    <ellipse cx="22" cy="43" rx="5" ry="4" fill="#111827"/><ellipse cx="47" cy="43" rx="5" ry="4" fill="#111827"/>
    <circle cx="22" cy="42" r="2" fill="#cbd5e1"/><circle cx="47" cy="42" r="2" fill="#cbd5e1"/>
    <path d="M21 25h24" stroke="#bbf7d0" stroke-width="2" opacity=".75"/>
    <circle cx="19" cy="34" r="2" fill="#fde68a"/><circle cx="48" cy="34" r="2" fill="#fde68a"/>
  `;else if(kind==='suv')art=`
    <path d="M10 38l5-17 10-10h23l10 12 2 15-8 8H17z" fill="url(#blue)" stroke="#172554" stroke-width="1.9"/>
    <path d="M25 12h23l8 11H16z" fill="url(#glass)" stroke="#1e3a8a" stroke-width="1.3"/>
    <path d="M55 23l5 15-8 8-2-21z" fill="#1d4ed8" opacity=".9"/>
    <path d="M10 38h50l-8 8H17z" fill="#1e40af" opacity=".95"/>
    <path d="M23 15h12v8H17zM37 15h10l8 8H37z" fill="#e0f2fe" opacity=".92"/>
    <ellipse cx="20" cy="44" rx="6" ry="4.5" fill="#111827"/><ellipse cx="50" cy="44" rx="6" ry="4.5" fill="#111827"/>
    <circle cx="20" cy="43" r="2.1" fill="#cbd5e1"/><circle cx="50" cy="43" r="2.1" fill="#cbd5e1"/>
    <path d="M15 31h38" stroke="#93c5fd" stroke-width="2" opacity=".7"/>
    <rect x="13" y="33" width="7" height="3" rx="1.5" fill="#fef3c7"/><rect x="50" y="33" width="7" height="3" rx="1.5" fill="#fef3c7"/>
  `;else art=`
    <path d="M11 39l5-15 9-9h21l10 10 3 14-8 7H18z" fill="url(#blue)" stroke="#172554" stroke-width="1.8"/>
    <path d="M25 16h20l8 10H17z" fill="url(#glass)" stroke="#1e3a8a" stroke-width="1.3"/>
    <path d="M53 26l6 13-8 7-2-18z" fill="#1d4ed8" opacity=".9"/>
    <path d="M11 39h48l-8 7H18z" fill="#1e40af" opacity=".95"/>
    <path d="M23 18h11v8H18zM36 18h9l7 8H36z" fill="#e0f2fe" opacity=".92"/>
    <ellipse cx="20" cy="44" rx="5.5" ry="4.2" fill="#111827"/><ellipse cx="49" cy="44" rx="5.5" ry="4.2" fill="#111827"/>
    <circle cx="20" cy="43" r="2" fill="#cbd5e1"/><circle cx="49" cy="43" r="2" fill="#cbd5e1"/>
    <path d="M16 31h37" stroke="#93c5fd" stroke-width="2" opacity=".7"/>
    <rect x="14" y="34" width="6" height="3" rx="1.5" fill="#fef3c7"/><rect x="50" y="34" width="6" height="3" rx="1.5" fill="#fef3c7"/>
  `;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <defs>
      <linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset=".48" stop-color="#2563eb"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>
      <linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset=".55" stop-color="#16a34a"/><stop offset="1" stop-color="#166534"/></linearGradient>
      <linearGradient id="yellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0f9ff"/><stop offset=".55" stop-color="#93c5fd"/><stop offset="1" stop-color="#60a5fa"/></linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#bfdbfe"/></linearGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity=".35"/></filter>
    </defs>
    <ellipse cx="36" cy="55" rx="24" ry="7" fill="#0f172a" opacity=".22"/>
    <circle cx="36" cy="32" r="29" fill="#ffffff" fill-opacity=".95" stroke="#2563eb" stroke-width="2"/>
    <g filter="url(#shadow)" transform="rotate(${h} 36 32)">${art}<path d="M36 4l4 8h-8z" fill="#ef4444" stroke="#991b1b" stroke-width=".8"/></g>
    <circle cx="58" cy="12" r="6" fill="#22c55e" stroke="#ffffff" stroke-width="2"/><circle cx="58" cy="12" r="2" fill="#ffffff"/>
  </svg>`;
  return'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg)
}
function install(){
  const M=window.google?.maps?.Marker,SP=window.google?.maps?.SymbolPath;
  if(!M?.prototype||!SP)return false;
  if(M.prototype.__dbestCustomerVehicleMarker3D){patched=true;return true}
  const rawTitle=M.prototype.setTitle,rawIcon=M.prototype.setIcon,rawLabel=M.prototype.setLabel;
  if(typeof rawTitle!=='function'||typeof rawIcon!=='function'||typeof rawLabel!=='function')return false;
  M.prototype.setTitle=function(title){
    const t=String(title||''),heading=headingFrom(this),out=rawTitle.apply(this,arguments);
    if(/vaahak live location/i.test(t)){
      try{
        rawLabel.call(this,null);
        rawIcon.call(this,{url:svg3d(kindFor(t),heading),scaledSize:new google.maps.Size(64,64),anchor:new google.maps.Point(32,32)});
        if(typeof this.setZIndex==='function')this.setZIndex(9999);
        if(typeof this.setOptions==='function')this.setOptions({optimized:false});
      }catch(e){
        try{rawIcon.call(this,{path:SP.CIRCLE,scale:22,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#175cff',strokeOpacity:1,strokeWeight:3});rawLabel.call(this,{text:emojiFor(t),fontSize:'23px',fontWeight:'700'});}catch(_){ }
        console.warn('DBest 3D vehicle marker fallback',e)
      }
    }
    return out;
  };
  M.prototype.__dbestCustomerVehicleMarkerFix=true;
  M.prototype.__dbestCustomerVehicleMarker3D=true;
  patched=true;
  return true;
}
function watchGoogle(){if(install()){if(timer){clearInterval(timer);timer=null}return}if(!timer)timer=setInterval(()=>{if(install()&&timer){clearInterval(timer);timer=null}},100)}
const mo=new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes||[]){if(n?.tagName==='SCRIPT'&&/maps\.googleapis\.com\/maps\/api\/js/i.test(String(n.src||''))){n.addEventListener('load',watchGoogle,{once:true});watchGoogle()}}}});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){ }
watchGoogle();
window.addEventListener('load',watchGoogle,{once:true});
window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX={version:V,install:watchGoogle,emojiFor,kindFor,svg3d,get patched(){return patched}};
})();