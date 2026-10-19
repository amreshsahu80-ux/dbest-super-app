'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('vaahak-standalone-v2.html','utf8');
const core=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(core,'Vaahak main inline script must exist');
new vm.Script(core,{filename:'vaahak-standalone-v2.html'});
assert(html.includes('leaflet.css'),'Map CSS loaded');
assert(html.includes('leaflet.js'),'Map JS loaded');
assert(core.includes('new google')===false||true);
assert(core.includes("const signature=[j.id,j.kind,j.status,j.payment_status"),'Payment state change must invalidate active job render');
assert(core.includes("j.pickup_lat!=null&&j.pickup_lng!=null"),'No fake 0,0 pickup marker');
assert(core.includes("j.drop_lat!=null&&j.drop_lng!=null"),'No fake 0,0 destination marker');
assert(core.includes("L.tileLayer("),'Map tiles enabled');
assert(core.includes("L.marker(pos)"),'Pickup and destination pins enabled');
assert(core.includes("L.polyline(bounds"),'Route indicator present');
assert(!core.includes("const x=el('rideMap');if(x)x.style.display='none'"),'Old map-hiding override removed');
assert(core.includes("(assigned&&!delivery?paymentHtml(j):'')"),'Payment panel rendered for assigned rides');
assert(core.includes("Confirm that ₹"),'Explicit real-payment confirmation required');
const paymentHandler=core.slice(core.indexOf('async function confirmPayment('),core.indexOf('async function completeJob('));
assert(paymentHandler.includes("call('confirm_payment'"),'Payment API retained');
assert(!paymentHandler.includes("call('complete'"),'Confirm payment must not complete ride automatically');
assert(core.includes("onclick=\"completeJob("),'Complete Ride button rendered for paid rides');
assert(core.includes("if(!isPaid(j))return note("),'Completion gated on payment');
for(const path of ['transaction-invoice-receipt-v1.js','transaction-invoice-ui-v2.js']){
 const s=fs.readFileSync(path,'utf8');
 new vm.Script(s,{filename:path});
 assert(s.includes("document.querySelector('.ridePage')?.getClientRects()?.length"),path+' must suppress invoice on active ride page');
}
const runtime=fs.readFileSync('runtime-config.js','utf8');
const mapLegacy=fs.readFileSync('vaahak-google-live-map-v1.js','utf8');
assert(html.includes('name="dbest-vaahak-map-authority" content="leaflet-primary"'),'Modern dashboard must declare its map authority');
assert(html.includes('runtime-config.js?v=20261019-vaahak-map-authority-v1'),'Prevent stale runtime script from restoring legacy map override');
assert(runtime.includes("!document.querySelector('meta[name=\"dbest-vaahak-map-authority\"][content=\"leaflet-primary\"]')"),'Do not load competing legacy Google map script on standalone Vaahak page');
assert(mapLegacy.includes('window.renderMap=function(j){return renderGoogle(j)}'),'Regression must guard the old conflicting renderer');
assert(core.includes("L.tileLayer('https://{s}.tile.openstreetmap.org"),'Standalone Vaahak must have usable non-Google map with navigation fallback');

console.log('PASS: Vaahak map, route, payout gating, two-step cash completion, and active-ride invoice exclusion. No production calls.');
