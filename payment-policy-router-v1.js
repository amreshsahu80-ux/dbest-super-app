(()=>{
'use strict';
const VERSION='1.1-direct-service-payments';
const POLICY={
  registrations:{user:['razorpay'],vaahak:['razorpay'],service_partner:['razorpay'],vendor:['razorpay']},
  ecommerce:['razorpay','payu'],
  cab:['cash_to_driver','upi_to_driver'],
  home_jobs:['cash_to_service_provider','upi_to_service_provider'],
  repairing:['cash_to_partner','upi_to_partner'],
  forms:['payu'],
  dormant:{home_jobs:'payu',repairing:'payu'}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
let payuState={checked:false,configured:false,mode:'test'};
function restorePayU(){
  try{if(typeof window.__DBEST_ORIGINAL_PAYU__==='function')window.startPayU=window.__DBEST_ORIGINAL_PAYU__;}catch{}
  try{if(typeof payuSettings!=='undefined'&&payuSettings){payuSettings.createEndpoint='/api/payu/create-payment';payuSettings.buttonLabel='Pay Securely with PayU';}}catch{}
  try{if(typeof rideConfig!=='undefined'&&rideConfig){rideConfig.payu=false;rideConfig.cash=true;rideConfig.upiDriver=true;}}catch{}
}
async function checkPayU(){
  try{const r=await fetch('/api/payu/config',{cache:'no-store'}),j=await r.json();payuState={checked:true,configured:!!j.configured,mode:String(j.mode||'test')};}
  catch{payuState={checked:true,configured:false,mode:'test'}}
  refreshPolicyCards();return payuState;
}
function txById(id){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x.id||x.transaction_id||'')===String(id||''))||null}catch{return null}}
function classify(tx){
  if(!tx)return 'other';
  const s=[tx.section,tx.sub,tx.subsection,tx.source,tx.details,tx.meta?.source,tx.meta?.type].filter(Boolean).join(' ').toLowerCase();
  if(tx.ride||/\b(cab|ride|taxi|driver ride)\b/.test(s))return 'cab';
  if(tx.order||tx.meta?.order||/(marketplace|e-?commerce|grocery|restaurant|food order|digital item|medicine|pharmacy|store)/.test(s))return 'ecommerce';
  if(/(home jobs?|home jobs & local services|hyperlocal home service|maid|house help|electrician|plumber|refrigerator mechanic)/.test(s))return 'home_jobs';
  if(/(repair|repairing|mobile repair|ac service|appliance repair|technician)/.test(s))return 'repairing';
  if(/(forms?|government|govt|pan application|driving licence|driving license|itr filing|certificate|application service)/.test(s))return 'forms';
  return 'other';
}
function payuButton(txId,secondary=false){
  const disabled=payuState.checked&&!payuState.configured;
  return `<button class="btn ${secondary?'soft':''}" type="button" data-dbest-payu-button="1" ${disabled?'disabled':''} onclick="dbestPolicyPayU('${esc(txId)}')">${secondary?'Secondary • ':''}PayU${disabled?' • Setup required':''}</button>`;
}
function razorButton(txId,primary=true){return `<button class="btn" type="button" onclick="dbestPolicyRazorpay('${esc(txId)}')">${primary?'Primary • ':''}Razorpay</button>`}
function directCard(tx,route){
  const id=esc(tx.id),amount=money(tx.amount);
  const isHome=route==='home_jobs',recipient=isHome?'Service Provider':'Partner';
  const dormantNote='PayU integration is preserved but inactive and can be enabled later.';
  return `<div class="ownerPanelCard dbestPolicyCard" data-dbest-policy="${route}"><h3>Pay ${recipient} Directly</h3><div class="notice" style="margin-bottom:10px">DBest Ref: <b>${id}</b> • Amount: <b>${amount}</b></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn" onclick="dbestPolicyPayDirect('${id}','${route}','cash')">💵 Cash to ${recipient}</button><button class="btn soft" onclick="dbestPolicyPayDirect('${id}','${route}','upi')">📱 UPI to ${recipient}</button></div><small style="display:block;margin-top:8px">No payment gateway is used in the current flow. ${dormantNote}</small></div>`;
}
function gatewayHtml(tx,route){
  const id=esc(tx.id),amount=money(tx.amount),head=`<div class="notice" style="margin-bottom:10px">DBest Ref: <b>${id}</b> • Amount: <b>${amount}</b></div>`;
  if(route==='cab')return `<div class="ownerPanelCard dbestPolicyCard" data-dbest-policy="cab"><h3>Pay Driver Directly</h3>${head}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn" onclick="dbestCabPayDriver('${id}','cash')">💵 Cash to Driver</button><button class="btn soft" onclick="dbestCabPayDriver('${id}','upi')">📱 UPI to Driver</button></div><small style="display:block;margin-top:8px">No Razorpay or PayU gateway is used for Cab rides.</small></div>`;
  if(route==='home_jobs'||route==='repairing')return directCard(tx,route);
  if(route==='ecommerce')return `<div class="ownerPanelCard dbestPolicyCard" data-dbest-policy="ecommerce"><h3>Choose Payment Gateway</h3>${head}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${razorButton(tx.id,true)}${payuButton(tx.id,true)}</div><small style="display:block;margin-top:8px">Razorpay is primary. PayU is the alternate gateway.</small></div>`;
  if(route==='forms')return `<div class="ownerPanelCard dbestPolicyCard" data-dbest-policy="forms"><h3>PayU Payment</h3>${head}<div>${payuButton(tx.id,false)}</div><small style="display:block;margin-top:8px">Forms use PayU only.</small></div>`;
  return '';
}
function hideLegacyGateway(root){
  if(!root)return;
  root.querySelectorAll('button[onclick*="startPayU"],button[onclick*="startRazorpay"]').forEach(b=>{if(!b.closest('.dbestPolicyCard'))b.style.display='none'});
  root.querySelectorAll('.payuBadge').forEach(x=>{if(!x.closest('.dbestPolicyCard'))x.style.display='none'});
}
function decorate(txId){
  restorePayU();const tx=txById(txId);if(!tx)return;const route=classify(tx);if(route==='other')return;
  const root=document.querySelector('#m .paymentPage')||document.querySelector('#m .sectionContent')||document.querySelector('.paymentPage')||document.querySelector('.sectionContent');if(!root)return;
  root.querySelectorAll('.dbestPolicyCard').forEach(x=>x.remove());hideLegacyGateway(root);
  const h=document.createElement('div');h.innerHTML=gatewayHtml(tx,route);const card=h.firstElementChild;if(!card)return;
  const target=root.querySelector('.payCard')||root;target.insertBefore(card,target.firstChild);setTimeout(refreshPolicyCards,0);
}
function refreshPolicyCards(){
  document.querySelectorAll('[data-dbest-payu-button="1"]').forEach(b=>{b.disabled=payuState.checked&&!payuState.configured;const secondary=b.classList.contains('soft');b.textContent=(secondary?'Secondary • ':'')+'PayU'+(b.disabled?' • Setup required':'');});
}
window.dbestPolicyRazorpay=function(txId){restorePayU();if(typeof window.startRazorpay==='function')return window.startRazorpay(txId);if(window.__DBEST_RAZORPAY__?.payTransaction)return window.__DBEST_RAZORPAY__.payTransaction(txId);if(typeof toast==='function')toast('Razorpay is not available.');};
window.dbestPolicyPayU=function(txId){restorePayU();if(!payuState.configured){if(typeof toast==='function')toast('PayU setup is not complete yet.');return;}if(typeof window.__DBEST_ORIGINAL_PAYU__==='function')return window.__DBEST_ORIGINAL_PAYU__(txId);if(typeof window.startPayU==='function')return window.startPayU(txId);};
window.dbestPolicyPayDirect=function(txId,route,method){
  const x=txById(txId);if(!x)return;
  const isHome=route==='home_jobs',recipient=isHome?'Service Provider':'Partner';
  const m=method==='upi'?`UPI to ${recipient}`:`Cash to ${recipient}`;
  x.paymentMethod=m;x.paymentMode=m;x.paymentStage=`Pay ${recipient} Directly`;
  x.status=`Service Confirmed / ${m}`;
  x.meta={...(x.meta||{}),paymentMethod:m,paymentPolicy:isHome?'home_jobs_direct_provider':'repairing_direct_partner',dormantGateway:'payu',dormantGatewayEnabled:false};
  try{if(typeof save==='function')save()}catch{}
  if(typeof toast==='function')toast(`${m} selected.`);
  if(typeof txDetailsView==='function')return txDetailsView(txId);
};
window.dbestCabPayDriver=function(txId,method){
  const x=txById(txId);if(!x)return;const m=method==='upi'?'UPI to Driver':'Cash to Driver';x.paymentMethod=m;x.paymentMode=m;x.paymentStage='Pay Driver Directly';x.status='Ride Confirmed / '+m;x.meta={...(x.meta||{}),paymentMethod:m,paymentPolicy:'cab_direct_driver'};try{if(typeof save==='function')save()}catch{};if(typeof rideStatusScreen==='function')return rideStatusScreen(txId);if(typeof txDetailsView==='function')return txDetailsView(txId);
};
function wrap(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__dbestPaymentPolicyWrapped)return;
  const w=function(){const txId=arguments[0],out=fn.apply(this,arguments);setTimeout(()=>decorate(txId),40);return out};w.__dbestPaymentPolicyWrapped=true;w.__dbestOriginal=fn;window[name]=w;
}
function patchRegistrations(){
  const vendor=document.querySelector('form[onsubmit*="registerVendor"]');if(vendor&&!vendor.querySelector('.dbestRegistrationGatewayNotice')){const n=document.createElement('div');n.className='notice dbestRegistrationGatewayNotice';n.innerHTML='<b>Registration Gateway: Razorpay only</b><br><small>Razorpay will be used whenever a Vendor registration fee is configured by the Project Owner.</small>';vendor.prepend(n);}
  const vaahak=document.querySelector('form[onsubmit*="addVaahakPartner"]');if(vaahak&&!vaahak.querySelector('.dbestRegistrationGatewayNotice')){const n=document.createElement('div');n.className='notice dbestRegistrationGatewayNotice';n.innerHTML='<b>Registration Gateway: Razorpay only</b><br><small>Razorpay will be used whenever a Vaahak registration fee is configured by the Project Owner.</small>';vaahak.prepend(n);}
}
function install(){restorePayU();['paymentReview','ridePaymentScreen','groceryPaymentScreen','marketPaymentScreen'].forEach(wrap);patchRegistrations();}
install();checkPayU();
new MutationObserver(()=>{install();refreshPolicyCards()}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{install();restorePayU()},1800);
window.DBEST_PAYMENT_POLICY={version:VERSION,policy:POLICY,classify,decorate,checkPayU};
})();
