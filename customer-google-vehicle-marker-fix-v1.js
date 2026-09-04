(function(){
'use strict';
const V='20260904-customer-vehicle-marker-real3d-v3';
if(window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX?.version===V)return;
let patched=false,timer=null;
function kindFor(title){const t=String(title||'').toLowerCase();if(/bike|motor|scoot|two.?wheel/.test(t))return'bike';if(/auto|rickshaw|e.?rick|three.?wheel/.test(t))return'auto';if(/suv|innova|ertiga|xl6|xuv/.test(t))return'suv';return'cab'}
function emojiFor(title){const k=kindFor(title);return k==='bike'?'🏍️':k==='auto'?'🛺':k==='suv'?'🚙':'🚕'}
function headingFrom(marker){try{const i=marker?.getIcon?.(),u=typeof i==='string'?i:String(i?.url||'');if(!/^data:image\/svg\+xml/i.test(u))return 0;const raw=decodeURIComponent(u.slice(u.indexOf(',')+1));const m=raw.match(/data-heading=['\"]?([-\d.]+)/i)||raw.match(/rotate\(([-\d.]+)/i);const h=m?Number(m[1]):0;return Number.isFinite(h)?h:0}catch(_){return 0}}
function svg3d(kind,heading){
 const h=Number.isFinite(Number(heading))?Number(heading):0;
 let art='';
 if(kind==='bike') art=`
   <g>
    <ellipse cx="26" cy="48" rx="10" ry="10" fill="#0b1220"/><ellipse cx="70" cy="48" rx="10" ry="10" fill="#0b1220"/>
    <ellipse cx="26" cy="48" rx="6.2" ry="6.2" fill="#374151"/><ellipse cx="70" cy="48" rx="6.2" ry="6.2" fill="#374151"/>
    <circle cx="26" cy="48" r="2.8" fill="#cbd5e1"/><circle cx="70" cy="48" r="2.8" fill="#cbd5e1"/>
    <path d="M27 46L39 31h18l12 15" fill="none" stroke="#111827" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38 32l8-10h17l8 8-11 9H42z" fill="url(#bikeBlue)" stroke="#172554" stroke-width="1.8"/>
    <path d="M48 22h16l8 8-9 3H45z" fill="url(#shine)" opacity=".95"/>
    <path d="M38 31h18l5 8H43z" fill="#111827" opacity=".92"/>
    <path d="M44 38h15l3 7H41z" fill="#4b5563" stroke="#111827" stroke-width="1.2"/>
    <circle cx="51" cy="42" r="4" fill="#1f2937"/><circle cx="51" cy="42" r="2" fill="#9ca3af"/>
    <path d="M66 30l8-12M73 18h9" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
    <path d="M69 31l4 15" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
    <path d="M38 28l-8-4" stroke="#111827" stroke-width="3" stroke-linecap="round"/>
    <rect x="33" y="20" width="14" height="5" rx="2.5" fill="#111827"/>
    <path d="M43 27h16" stroke="#93c5fd" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
    <path d="M57 46h12" stroke="#9ca3af" stroke-width="2.3" stroke-linecap="round"/>
    <circle cx="75" cy="25" r="3.2" fill="#fef3c7" stroke="#92400e" stroke-width="1"/>
   </g>`;
 else if(kind==='auto') art=`
   <g>
    <ellipse cx="31" cy="50" rx="8" ry="7" fill="#111827"/><ellipse cx="67" cy="50" rx="8" ry="7" fill="#111827"/>
    <ellipse cx="31" cy="50" rx="4" ry="3.5" fill="#cbd5e1"/><ellipse cx="67" cy="50" rx="4" ry="3.5" fill="#cbd5e1"/>
    <path d="M20 45l4-23 13-12h29l15 14-2 22-12 9H30z" fill="url(#autoGreen)" stroke="#14532d" stroke-width="2"/>
    <path d="M25 22L38 9h28l12 14z" fill="url(#autoYellow)" stroke="#92400e" stroke-width="1.7"/>
    <path d="M36 15h25l10 9H28z" fill="url(#glass)" stroke="#0f172a" stroke-width="1.3"/>
    <path d="M74 25l7 19-12 9-2-27z" fill="#15803d" opacity=".95"/>
    <path d="M22 43h55l-10 10H30z" fill="#166534" opacity=".92"/>
    <path d="M31 29h36" stroke="#bbf7d0" stroke-width="2.2" opacity=".75"/>
    <circle cx="27" cy="38" r="2.7" fill="#fde68a"/><circle cx="70" cy="38" r="2.7" fill="#fde68a"/>
    <rect x="42" y="31" width="19" height="9" rx="2" fill="#0f172a" opacity=".35"/>
   </g>`;
 else if(kind==='suv') art=`
   <g>
    <ellipse cx="27" cy="52" rx="9" ry="7" fill="#111827"/><ellipse cx="70" cy="52" rx="9" ry="7" fill="#111827"/>
    <ellipse cx="27" cy="52" rx="4.5" ry="3.5" fill="#cbd5e1"/><ellipse cx="70" cy="52" rx="4.5" ry="3.5" fill="#cbd5e1"/>
    <path d="M13 45l7-21 15-13h34l15 16 3 18-13 12H25z" fill="url(#carBlue)" stroke="#172554" stroke-width="2"/>
    <path d="M35 12h33l13 16H21z" fill="url(#glass)" stroke="#1e3a8a" stroke-width="1.4"/>
    <path d="M80 28l7 17-13 12-3-26z" fill="#1d4ed8" opacity=".95"/>
    <path d="M14 44h72L74 57H25z" fill="#1e40af" opacity=".96"/>
    <path d="M31 16h16v12H23zM50 16h16l12 12H50z" fill="#e0f2fe" opacity=".94"/>
    <path d="M21 36h59" stroke="#93c5fd" stroke-width="2.2" opacity=".75"/>
    <rect x="18" y="39" width="9" height="4" rx="2" fill="#fef3c7"/><rect x="72" y="39" width="9" height="4" rx="2" fill="#fef3c7"/>
    <path d="M43 30v16M61 30v16" stroke="#1e3a8a" stroke-width="1.2" opacity=".55"/>
   </g>`;
 else art=`
   <g>
    <ellipse cx="28" cy="51" rx="8.5" ry="6.7" fill="#111827"/><ellipse cx="69" cy="51" rx="8.5" ry="6.7" fill="#111827"/>
    <ellipse cx="28" cy="51" rx="4.2" ry="3.3" fill="#cbd5e1"/><ellipse cx="69" cy="51" rx="4.2" ry="3.3" fill="#cbd5e1"/>
    <path d="M14 44l7-18 14-12h31l16 14 4 16-13 12H25z" fill="url(#carBlue)" stroke="#172554" stroke-width="2"/>
    <path d="M35 15h30l13 14H22z" fill="url(#glass)" stroke="#1e3a8a" stroke-width="1.4"/>
    <path d="M79 29l7 15-13 12-3-24z" fill="#1d4ed8" opacity=".95"/>
    <path d="M15 43h70L73 56H25z" fill="#1e40af" opacity=".96"/>
    <path d="M31 18h15v11H24zM49 18h15l11 11H49z" fill="#e0f2fe" opacity=".94"/>
    <path d="M21 35h58" stroke="#93c5fd" stroke-width="2.2" opacity=".75"/>
    <rect x="19" y="38" width="8" height="4" rx="2" fill="#fef3c7"/><rect x="72" y="38" width="8" height="4" rx="2" fill="#fef3c7"/>
   </g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="76" viewBox="0 0 100 76" data-heading="${h}">
  <defs>
   <linearGradient id="bikeBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".42" stop-color="#2563eb"/><stop offset="1" stop-color="#172554"/></linearGradient>
   <linearGradient id="carBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset=".42" stop-color="#2563eb"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>
   <linearGradient id="autoGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#86efac"/><stop offset=".5" stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/></linearGradient>
   <linearGradient id="autoYellow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
   <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#bae6fd"/><stop offset="1" stop-color="#60a5fa"/></linearGradient>
   <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#bfdbfe"/></linearGradient>
   <filter id="shadow" x="-30%" y="-30%" width="170%" height="190%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity=".42"/></filter>
  </defs>
  <ellipse cx="50" cy="64" rx="34" ry="8" fill="#0f172a" opacity=".22"/>
  <g filter="url(#shadow)" transform="rotate(${h} 50 38)">${art}</g>
  <circle cx="88" cy="9" r="6.5" fill="#22c55e" stroke="#fff" stroke-width="2.5"/><circle cx="88" cy="9" r="2" fill="#fff"/>
 </svg>`;
 return'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg)
}
function install(){
 const M=window.google?.maps?.Marker,SP=window.google?.maps?.SymbolPath;
 if(!M?.prototype||!SP)return false;
 if(M.prototype.__dbestCustomerVehicleMarkerReal3D){patched=true;return true}
 const rawTitle=M.prototype.setTitle,rawIcon=M.prototype.setIcon,rawLabel=M.prototype.setLabel;
 if(typeof rawTitle!=='function'||typeof rawIcon!=='function'||typeof rawLabel!=='function')return false;
 M.prototype.setTitle=function(title){
  const t=String(title||''),heading=headingFrom(this),out=rawTitle.apply(this,arguments);
  if(/vaahak live location/i.test(t)){
   try{
    rawLabel.call(this,null);
    rawIcon.call(this,{url:svg3d(kindFor(t),heading),scaledSize:new google.maps.Size(78,59),anchor:new google.maps.Point(39,44)});
    if(typeof this.setZIndex==='function')this.setZIndex(9999);
    if(typeof this.setOptions==='function')this.setOptions({optimized:false});
   }catch(e){
    try{rawIcon.call(this,{path:SP.CIRCLE,scale:22,fillColor:'#ffffff',fillOpacity:1,strokeColor:'#175cff',strokeOpacity:1,strokeWeight:3});rawLabel.call(this,{text:emojiFor(t),fontSize:'23px',fontWeight:'700'});}catch(_){ }
    console.warn('DBest realistic 3D vehicle marker fallback',e)
   }
  }
  return out;
 };
 M.prototype.__dbestCustomerVehicleMarkerFix=true;
 M.prototype.__dbestCustomerVehicleMarker3D=true;
 M.prototype.__dbestCustomerVehicleMarkerReal3D=true;
 patched=true;return true
}
function watchGoogle(){if(install()){if(timer){clearInterval(timer);timer=null}return}if(!timer)timer=setInterval(()=>{if(install()&&timer){clearInterval(timer);timer=null}},100)}
const mo=new MutationObserver(list=>{for(const m of list){for(const n of m.addedNodes||[]){if(n?.tagName==='SCRIPT'&&/maps\.googleapis\.com\/maps\/api\/js/i.test(String(n.src||''))){n.addEventListener('load',watchGoogle,{once:true});watchGoogle()}}}});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){ }
watchGoogle();window.addEventListener('load',watchGoogle,{once:true});
window.DBEST_CUSTOMER_VEHICLE_MARKER_FIX={version:V,install:watchGoogle,emojiFor,kindFor,svg3d,get patched(){return patched}};
})();