'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const live=fs.readFileSync('ride-live-ui-finalizer.js','utf8');
const history=fs.readFileSync('member-ride-history-bridge.js','utf8');
const app=fs.readFileSync('index.html','utf8');
new vm.Script(live,{filename:'ride-live-ui-finalizer.js'});
new vm.Script(history,{filename:'member-ride-history-bridge.js'});
assert(app.includes("'ride-live-ui-finalizer.js','member-ride-history-bridge.js','app-bootstrap-performance-v1.js'"),
  'Secure history module must be loaded eagerly after ride status');
assert(live.includes("const header=page.closest('.sectionPage')?.querySelector('.sectionTop .sectionTitle small')?.textContent"),
  'Current ride ID must come from current page header, never body-wide previous transaction');
assert(!live.includes("const top=document.body.textContent||''"),'Body-wide historical TX inference is unsafe');
assert(live.includes("if(next===currentTx&&boundRidePage===page&&['Completed','Cancelled'].includes(terminalStatus))return"),
  'A completed trip must not restart its searching animation');
assert(live.includes("terminalStatus=String(d.job.status||'');stop()"),'Terminal ride status must stay locked');
assert(live.includes('renderCompletedPanel(j)'), 'Completed rides must display a final-state card');
assert(live.includes('✓ Ride Completed')&&live.includes('My Rides & Receipts'),
  'Customer completion card and historical receipt action are required');
assert(live.includes("page.dataset.dbestRideTx=next"),'Current page must be bound to exact ride');
assert(live.includes("if(tx!==currentTx||document.querySelector('.ridePage')!==activePage)return"),
  'Late responses must not replace a different ride screen');
assert(history.includes("document.querySelector('.ridePage')"),'Active ride history tab required');
assert(history.includes("document.querySelector('.classicDash')"),'Member dashboard history tab required');
assert(history.includes("document.querySelector('.cab6Page')"),'Cab entry ride-history tab required');
assert(history.includes("openInvoiceFromRide"),'Current completed ride receipt access required');
assert(history.includes("if(!r||String(r.status)!=='Completed')return"),
  'Never issue an invoice for unpaid or unfinished ride');
assert(history.includes("x-dbest-member-token"),'History must use an authenticated member session');
assert(history.includes("Download / Save Invoice PDF"),'Receipt must have printable/save-PDF control');
assert(history.includes("observer.observe(mount,{childList:true})"),
  'Lightweight app-screen observer required; avoid repeated global DOM scanning');
const reg=fs.readFileSync('tests/vaahak-active-ride-regression.cjs','utf8');
assert(reg.includes('confirm_payment'),'Upstream Vaahak settlement guard must remain');
console.log('PASS: customer terminal-status lock, exact-TX binding, secure persistent My Rides and completed-receipt access.');
