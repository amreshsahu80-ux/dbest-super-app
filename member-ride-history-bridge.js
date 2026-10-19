(function(){
  'use strict';
  const VERSION='2.1.0-persistent-customer-history';
  if(window.DBEST_MEMBER_RIDE_HISTORY?.version===VERSION)return;
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const API=base+'/functions/v1/member-ride-history';
  let rideCache=[],historyAuthToken='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt=v=>{try{return v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}catch(e){return v||'—'}};
  const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
  const token=()=>{try{return window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||''}catch(e){return''}};
  async function fetchRides(){
    const t=token();if(!t){rideCache=[];historyAuthToken='';throw new Error('member_session_required')}if(historyAuthToken!==t){rideCache=[];historyAuthToken=''}
    const h={'apikey':key,'Content-Type':'application/json','x-dbest-member-token':t};if(String(key).startsWith('eyJ'))h.Authorization='Bearer '+key;
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:'{}'});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'history_failed');rideCache=d.rides||[];historyAuthToken=t;return d;
  }
  function badge(s){const x=String(s||'');const bg=x==='Completed'?'#e8f8ee':x==='Cancelled'?'#fff0ef':x==='Trip Started'?'#fff6db':'#edf3ff';const col=x==='Completed'?'#17633f':x==='Cancelled'?'#9c3535':x==='Trip Started'?'#8a6300':'#1552bd';return `<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${bg};color:${col};font-weight:800;font-size:12px">${esc(x)}</span>`}
  function receiptNo(r){return String(r.completion_voucher_no||('DBR-'+String(r.id||'').replace(/^VJ/,'')))}
  function rideCard(r){const completed=String(r.status)==='Completed';return `<div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:13px;margin:10px 0;box-shadow:0 6px 18px rgba(20,50,100,.06)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><b>🚕 ${esc(r.id)}</b>${badge(r.status)}</div><div style="margin-top:7px;font-weight:700">${esc(r.pickup)} → ${esc(r.dropoff)}</div><div style="margin-top:6px;color:#64748b;font-size:13px">${esc(r.vehicle_type||'Ride')} • ${r.distance_km?Number(r.distance_km).toFixed(1)+' km • ':''}${r.fare?money(r.fare):''}</div>${r.partner?`<div style="margin-top:6px">🛵 ${esc(r.partner.name)} • ${esc(r.partner.vehicle)} ${esc(r.partner.vehicle_no||'')} ${r.partner.rating?'• ⭐ '+esc(r.partner.rating):''}</div>`:''}<div style="margin-top:6px;color:#64748b;font-size:12px">Booked: ${dt(r.created_at)}${r.started_at?` • Started: ${dt(r.started_at)}`:''}${r.completed_at?` • Completed: ${dt(r.completed_at)}`:''}${r.cancelled_at?` • Cancelled: ${dt(r.cancelled_at)}`:''}</div>${completed?`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #edf1f6"><small style="color:#64748b">Receipt ${esc(receiptNo(r))}${r.completion_email_sent_at?' • ✓ Email sent':''}</small><button class="btn" style="padding:8px 12px;border-radius:12px" onclick="openRideInvoice('${esc(r.id)}')">🧾 Invoice / Receipt</button></div>`:''}${r.status==='Cancelled'?`<div style="margin-top:6px;color:#9c3535;font-size:12px">Cancelled by ${esc(r.cancelled_by||'—')}${r.cancellation_reason?' • '+esc(r.cancellation_reason):''}</div>`:''}</div>`}
  function installInvoicePrintCss(){if(document.getElementById('dbestRideInvoicePrintCss'))return;const s=document.createElement('style');s.id='dbestRideInvoicePrintCss';s.textContent=`
  .dbestInvoiceShell{max-width:760px;margin:0 auto}.dbestInvoice{background:#fff;border:1px solid #dce5f1;border-radius:22px;padding:22px;box-shadow:0 12px 34px rgba(20,50,100,.08)}.dbestInvoiceHead{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:2px solid #e7eef8}.dbestInvoiceLogo{width:190px;max-width:46%;height:62px;object-fit:contain;object-position:left center}.dbestInvoiceTitle{text-align:right}.dbestInvoiceTitle h2{margin:0;color:#12336b;font-size:24px}.dbestInvoiceTitle small{color:#66758b}.dbestInvoiceGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin:18px 0}.dbestInvoiceField{padding:10px 0;border-bottom:1px solid #edf1f6}.dbestInvoiceField small{display:block;color:#718096;font-size:11px;text-transform:uppercase;letter-spacing:.4px}.dbestInvoiceField b{display:block;margin-top:3px;color:#17233a}.dbestInvoiceRoute{background:#f6f9ff;border-radius:16px;padding:14px;margin:16px 0}.dbestInvoiceFare{display:flex;justify-content:space-between;align-items:center;background:#123c8c;color:#fff;border-radius:16px;padding:15px 16px;margin-top:16px}.dbestInvoiceFare b{font-size:26px}.dbestInvoiceFoot{color:#66758b;font-size:11px;line-height:1.55;margin-top:18px;padding-top:14px;border-top:1px solid #e6ecf4}.dbestInvoiceActions{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}.dbestInvoiceActions button{flex:1;min-width:160px}
  @media(max-width:560px){.dbestInvoice{padding:16px;border-radius:18px}.dbestInvoiceHead{align-items:center}.dbestInvoiceLogo{width:145px;height:52px}.dbestInvoiceTitle h2{font-size:18px}.dbestInvoiceGrid{grid-template-columns:1fr;gap:0}.dbestInvoiceFare b{font-size:23px}}
  @media print{body *{visibility:hidden!important}#dbestRideInvoicePrint,#dbestRideInvoicePrint *{visibility:visible!important}#dbestRideInvoicePrint{position:absolute!important;left:0!important;top:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}.dbestInvoice{box-shadow:none!important;border:0!important;border-radius:0!important}.dbestInvoiceActions,.topbar,.sectionTopBar,.dbestInvoiceNoPrint{display:none!important}@page{margin:12mm}}
  `;document.head.appendChild(s)}
  window.openRideInvoice=function(id){if(!token()||token()!==historyAuthToken)return;installInvoicePrintCss();const r=rideCache.find(x=>String(x.id)===String(id));if(!r||String(r.status)!=='Completed')return;const no=receiptNo(r),partner=r.partner||{},customer=r.customer_name||'DBest Member',memberId=r.customer_member_id||'';const content=`${typeof sectionTopBar==='function'?sectionTopBar('🧾 Ride Invoice / Receipt',no,'openMyRides()'):''}<div class="sectionContent"><div class="dbestInvoiceShell"><div class="dbestInvoiceActions dbestInvoiceNoPrint"><button class="btn" onclick="window.print()">⬇️ Download / Save Invoice PDF</button><button class="btn soft" onclick="openMyRides()">← Back to My Rides</button></div><div id="dbestRideInvoicePrint" class="dbestInvoice"><div class="dbestInvoiceHead"><img src="/dbest-logo.png" class="dbestInvoiceLogo" alt="DBest"><div class="dbestInvoiceTitle"><h2>Ride Invoice / Receipt</h2><small>${esc(no)}</small></div></div><div class="dbestInvoiceGrid"><div class="dbestInvoiceField"><small>Customer</small><b>${esc(customer)}</b>${memberId?`<span style="color:#66758b;font-size:12px">Member ID: ${esc(memberId)}</span>`:''}</div><div class="dbestInvoiceField"><small>Completed On</small><b>${esc(dt(r.completed_at||r.updated_at))}</b></div><div class="dbestInvoiceField"><small>Ride ID</small><b>${esc(r.id)}</b></div><div class="dbestInvoiceField"><small>Transaction ID</small><b>${esc(r.tx_id||'—')}</b></div><div class="dbestInvoiceField"><small>Vehicle</small><b>${esc(r.vehicle_type||partner.vehicle||'Ride')}</b></div><div class="dbestInvoiceField"><small>Distance</small><b>${r.distance_km?Number(r.distance_km).toFixed(1)+' km':'—'}</b></div></div><div class="dbestInvoiceRoute"><small style="display:block;color:#718096;font-weight:800">ROUTE</small><div style="margin-top:7px"><b>Pickup:</b> ${esc(r.pickup||'—')}</div><div style="margin-top:7px"><b>Drop:</b> ${esc(r.dropoff||'—')}</div></div>${partner.name?`<div class="dbestInvoiceField"><small>Vaahak</small><b>${esc(partner.name)}</b><span style="color:#66758b;font-size:12px">${esc(partner.vehicle||'')} ${esc(partner.vehicle_no||'')}</span></div>`:''}<div class="dbestInvoiceFare"><span><small style="display:block;opacity:.82">Ride Fare</small><strong>Completed Ride</strong></span><b>${money(r.fare)}</b></div><div class="dbestInvoiceFoot"><b style="color:#17233a">DBest / Sarwashresth Services OPC Pvt. Ltd.</b><br>www.dbest4u.com<br><br>This is a computer-generated DBest ride receipt generated from the completed ride record. It is not represented as a GST tax invoice unless applicable tax details are separately stated.</div></div></div></div>`;if(typeof sectionScreen==='function')sectionScreen(content);else{const w=window.open('','_blank');if(w){w.document.write('<!doctype html><html><head><title>'+esc(no)+'</title></head><body>'+content+'</body></html>');w.document.close()}}};
  window.openMyRides=async function(){
    if(typeof sectionScreen==='function')sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('🚕 My Rides','Current & past DBest rides','memberDash(session.id)'):''}<div class="sectionContent"><div id="dbestMyRides"><div style="padding:18px">Loading ride history…</div></div></div>`);
    const host=document.getElementById('dbestMyRides');if(!host)return;
    try{const d=await fetchRides(),s=d.summary||{},rows=d.rides||[];host.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0 14px"><div class="ownerPanelCard"><small>Total</small><b style="display:block;font-size:22px">${s.total||0}</b></div><div class="ownerPanelCard"><small>Active</small><b style="display:block;font-size:22px">${s.active||0}</b></div><div class="ownerPanelCard"><small>Completed</small><b style="display:block;font-size:22px">${s.completed||0}</b></div><div class="ownerPanelCard"><small>Cancelled</small><b style="display:block;font-size:22px">${s.cancelled||0}</b></div></div><div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:12px;margin-bottom:12px"><b>Total completed ride spend: ${money(s.totalSpend||0)}</b><small style="display:block;color:#64748b;margin-top:4px">Completed rides include a DBest Invoice / Receipt.</small></div>${rows.length?rows.map(rideCard).join(''):'<div style="background:#fff;border:1px solid #dfe7f2;border-radius:16px;padding:18px">No rides yet.</div>'}`;}catch(e){host.innerHTML='<div style="padding:18px;background:#fff0ef;border-radius:14px">Unable to load secure ride history. Please sign in to your DBest member account and try again.<div style="margin-top:7px;font-size:12px;color:#8c3333">'+esc(String(e.message||'Request failed'))+'</div></div>'}
  };

  async function openInvoiceFromRide(jobId){
    if(!jobId)return;
    try{
      await fetchRides();
      const row=rideCache.find(r=>String(r.id)===String(jobId));
      if(!row||row.status!=='Completed')throw new Error('ride_receipt_not_ready');
      window.openRideInvoice(jobId)
    }catch(e){
      if(typeof window.openMyRides==='function')window.openMyRides();
      else alert('Please sign in to view your completed ride receipt.')
    }
  }
  function navButton(id,cls,title){
    const btn=document.createElement('button');
    btn.type='button';btn.id=id;btn.className=cls;
    btn.textContent=title;
    btn.onclick=()=>window.openMyRides();
    return btn
  }
  function addButton(){
    const ride=document.querySelector('.ridePage');
    if(ride&&!ride.querySelector('#dbestRideHistoryQuick')){
      const nav=document.createElement('div');
      nav.id='dbestRideHistoryQuick';
      nav.style.cssText='margin:0 0 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center';
      const btn=navButton('dbestRideHistoryQuickBtn','btn soft','🚕 My Rides / Invoices');
      btn.style.cssText='padding:10px 14px;border-radius:12px;font-size:13px;font-weight:800';
      nav.appendChild(btn);
      ride.insertBefore(nav,ride.firstChild)
    }
    const dash=document.querySelector('.classicDash');
    const subs=dash?.querySelector('.subs');
    if(subs&&!subs.querySelector('#dbestMyRidesDashboardTab')){
      const btn=navButton('dbestMyRidesDashboardTab','sub','🚕 My Rides & Invoices');
      btn.innerHTML='<b>🚕 My Rides & Invoices</b><small>Bookings • Ride history • Download receipts</small>';
      subs.appendChild(btn)
    }
    const cab=document.querySelector('.cab6Page');
    if(cab&&!cab.querySelector('#dbestCabMyRidesTab')){
      const bar=document.createElement('div');bar.id='dbestCabMyRidesTab';
      bar.style.cssText='display:flex;justify-content:flex-end;padding:4px 12px 10px';
      const btn=navButton('dbestCabMyRidesBtn','btn soft','🚕 My Rides / Invoices');
      btn.style.cssText='border:1px solid #bfcfff;background:#f4f7ff;color:#1547ad;border-radius:12px;padding:10px 14px;font-weight:850;cursor:pointer';
      bar.appendChild(btn);
      const head=cab.querySelector('.cab6Top');
      if(head?.parentElement===cab)head.after(bar);else cab.prepend(bar)
    }
  }
  function watchScreen(){
    const mount=document.getElementById('m');
    if(!mount)return;
    let pending=false;
    const run=()=>{pending=false;addButton()};
    const observer=new MutationObserver(()=>{
      if(pending)return;
      pending=true;
      requestAnimationFrame(run)
    });
    observer.observe(mount,{childList:true});
    setTimeout(addButton,100)
  }
  const oldMember=window.memberDash;
  if(typeof oldMember==='function')window.memberDash=function(){const result=oldMember.apply(this,arguments);setTimeout(addButton,120);return result};
  const oldRide=window.rideStatusScreen;
  if(typeof oldRide==='function')window.rideStatusScreen=function(){const result=oldRide.apply(this,arguments);setTimeout(addButton,120);return result};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchScreen,{once:true});else watchScreen();
  window.DBEST_MEMBER_RIDE_HISTORY={version:VERSION,openMyRides:()=>window.openMyRides(),openInvoice:id=>window.openRideInvoice(id),openInvoiceFromRide};
})();
