(() => {
'use strict';
const VERSION='1.0-razorpay-auto-membership';
const CREATE='/api/razorpay/create-order';
const VERIFY='/api/razorpay/verify-payment';
const CONFIG='/api/razorpay/config';
let checkoutPromise=null;
const fmt=n=>Number(n||0).toLocaleString('en-IN');
function today(){return new Date().toISOString().slice(0,10)}
function readFile(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(file);});}
async function jsonFetch(url,opts={}){const r=await fetch(url,opts);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||j.message||('HTTP '+r.status));return j;}
async function getConfig(){return jsonFetch(CONFIG,{cache:'no-store'});}
function loadCheckout(){
  if(window.Razorpay)return Promise.resolve();
  if(checkoutPromise)return checkoutPromise;
  checkoutPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.async=true;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Unable to load Razorpay Checkout'));document.head.appendChild(s);
  });
  return checkoutPromise;
}
async function createOrder(payload){return jsonFetch(CREATE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}
async function verifyPayment(response,meta){return jsonFetch(VERIFY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...response,...meta})});}
async function openCheckout(order,prefill,description,meta){
  await loadCheckout();
  return new Promise((resolve,reject)=>{
    let settled=false;
    const done=(fn,v)=>{if(settled)return;settled=true;fn(v)};
    const options={
      key:order.keyId,
      amount:order.amount,
      currency:order.currency||'INR',
      name:'DBest',
      description:description||'DBest Payment',
      order_id:order.orderId,
      prefill:{name:prefill?.name||'',email:prefill?.email||'',contact:prefill?.contact||''},
      notes:{dbest_ref:order.dbestRef||''},
      handler:async response=>{
        try{const verified=await verifyPayment(response,meta);done(resolve,verified)}catch(e){done(reject,e)}
      },
      modal:{ondismiss:()=>done(reject,new Error('Payment cancelled'))}
    };
    const rz=new window.Razorpay(options);
    rz.on('payment.failed',r=>done(reject,new Error(r?.error?.description||'Payment failed')));
    rz.open();
  });
}
function ensureCompat(){
  try{
    if(typeof payuSettings!=='undefined'){
      payuSettings.enabled=true;payuSettings.createEndpoint=CREATE;payuSettings.buttonLabel='Pay Securely with Razorpay';
    }
    if(typeof rideConfig!=='undefined')rideConfig.payu=true;
    if(typeof groceryConfig!=='undefined')groceryConfig.payu=true;
    if(typeof commerceConfig!=='undefined')commerceConfig.payu=true;
    if(typeof save==='function')save();
  }catch(e){console.warn('Razorpay compatibility setup',e)}
}
function relabelVisible(root=document.getElementById('m')){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{if(/PayU/i.test(n.nodeValue||''))n.nodeValue=String(n.nodeValue).replace(/PayU/gi,'Razorpay')});
}
function gatewayCard(){return `<div class="notice" style="margin-bottom:14px;border:1px solid #cfe0ff;background:#f7faff"><b>🔒 Razorpay Secure Membership Payment</b><br><small>Your membership is activated automatically only after DBest verifies the Razorpay payment on the server. No Owner payment approval is required.</small><div id="dbestRazorpayRegStatus" style="margin-top:7px;font-size:11px">Checking payment gateway…</div></div>`}
function patchRegistration(tier){
  const page=document.querySelector('#m .registrationPage');if(!page)return;
  const form=page.querySelector('form');if(!form||form.dataset.razorpayPatched==='1')return;
  form.dataset.razorpayPatched='1';form.dataset.razorpayTier=tier;
  ['paidAmount','paymentRef','paymentDate','paymentProof'].forEach(name=>{
    const el=form.elements?.[name];if(!el)return;el.required=false;if(name==='paidAmount')el.value=Number(tiers?.[tier]?.price||0);const box=el.closest('.f');if(box)box.style.display='none';
  });
  form.querySelectorAll('input[type="checkbox"][required]').forEach(c=>{const t=String(c.closest('.f')?.textContent||c.parentElement?.textContent||'');if(/confirm.*paid|company account|payment fee/i.test(t)){c.required=false;const box=c.closest('.f');if(box)box.style.display='none';}});
  form.querySelectorAll('.notice,.card,.payCard').forEach(el=>{const t=String(el.textContent||'');if(/upi|company qr|payment proof|pay the exact membership amount/i.test(t)&&!/razorpay/i.test(t))el.style.display='none';});
  const submit=form.querySelector('button[type="submit"],button.btn');
  if(submit){submit.textContent='Pay with Razorpay & Activate Membership';submit.style.width='100%';const holder=submit.closest('.f')||submit.parentElement;holder?.insertAdjacentHTML('beforebegin',gatewayCard());}
  getConfig().then(c=>{const s=document.getElementById('dbestRazorpayRegStatus');if(s)s.textContent=c.configured?`Gateway ready • ${String(c.mode||'').toUpperCase()} mode`:'Razorpay credentials are not configured yet.'}).catch(()=>{const s=document.getElementById('dbestRazorpayRegStatus');if(s)s.textContent='Unable to verify Razorpay configuration.'});
}
async function registerWithRazorpay(e,tier){
  e?.preventDefault?.();
  const form=e?.target;if(!form)return;
  if(form.dataset.rzpBusy==='1')return;
  const f=new FormData(form),up=String(f.get('up')||'').trim().toUpperCase();
  if(up&&!users.some(u=>u.ref===up))return toast('Upline code not found');
  const email=String(f.get('email')||'').trim().toLowerCase(),mobile=String(f.get('mobile')||'').replace(/\s/g,'');
  if(email&&users.some(u=>String(u.email||'').toLowerCase()===email))return toast('This email is already registered');
  if(mobile&&users.some(u=>String(u.mobile||'').replace(/\s/g,'')===mobile))return toast('This mobile number is already registered');
  const tierInfo=tiers?.[tier];if(!tierInfo)return toast('Invalid membership');
  form.dataset.rzpBusy='1';const submit=form.querySelector('button[type="submit"],button.btn');const oldText=submit?.textContent;if(submit){submit.disabled=true;submit.textContent='Opening Razorpay…'}
  const regRef='REG_'+Date.now().toString(36).toUpperCase()+'_'+Math.random().toString(36).slice(2,7).toUpperCase();
  try{
    const order=await createOrder({kind:'membership',tier,dbestRef:regRef,section:'Membership',sub:tierInfo.name||tier,userId:'pending'});
    const expected=Math.round(Number(tierInfo.price||0)*100);if(Number(order.amount)!==expected)throw new Error(`Secure membership amount is ₹${Number(order.amount||0)/100}, but this screen shows ₹${Number(tierInfo.price||0)}. Please update the configured membership price before payment.`);
    const verified=await openCheckout(order,{name:String(f.get('name')||''),email,contact:mobile},`DBest ${tierInfo.name} Membership`,{dbestRef:regRef,kind:'membership',tier});
    if(!verified?.verified)throw new Error('Payment could not be verified');
    const isP=tier!=='guest',n=1000+users.length+Math.floor(Math.random()*90),id=(isP?'PR':'CU')+n,ref=isP?'DB'+n:'';
    const photoFile=form.elements?.photo?.files?.[0];const photo=await readFile(photoFile);
    const now=new Date();
    const u={
      id,name:String(f.get('name')||''),mobile:String(f.get('mobile')||''),email,city:String(f.get('city')||''),tier,ref,upline:up,
      status:'Active',kyc:'Approved',card:true,pan:String(f.get('pan')||''),aad:String(f.get('aad')||''),bank:String(f.get('bank')||''),ifsc:String(f.get('ifsc')||''),photo,
      paymentStatus:'Approved',paidAmount:Number(verified.amount||0)/100,paymentRef:String(verified.paymentId||''),paymentDate:today(),paymentProof:'',
      paymentApprovedBy:'Razorpay Auto Verification',paymentApprovedAt:now.toLocaleString('en-IN'),razorpayOrderId:String(verified.orderId||''),razorpayPaymentId:String(verified.paymentId||''),
      welcomeMailStatus:'Generated',welcomeMailGeneratedAt:now.toLocaleString('en-IN')
    };
    users.push(u);session={role:tier,id};
    const tx=addTx(u.id,'Membership',tierInfo.name,u.paidAmount,'Razorpay Verified / Membership Active / Card Issued','Razorpay',{details:'Membership registration automatically activated after server-verified Razorpay payment',contactName:u.name,contactMobile:u.mobile,source:'Membership Registration - Razorpay',paymentDate:u.paymentDate});
    tx.paymentRef=u.paymentRef;tx.razorpayOrderId=u.razorpayOrderId;tx.razorpayPaymentId=u.razorpayPaymentId;tx.paymentStage='Razorpay Verified';
    save();render();
    sectionScreen(`${sectionTopBar('✅ Membership Activated',`${esc(u.name)} • ${esc(u.id)}`,'backHome()')}<div class="sectionContent"><div class="sectionSuccess"><div style="font-size:52px">✅</div><h2>Payment Verified & Membership Active</h2><p style="color:var(--m)">Your ${esc(tierInfo.name)} membership was activated automatically after successful Razorpay payment.</p><div class="notice" style="text-align:left"><b>Member ID:</b> ${esc(u.id)}<br><b>Amount:</b> ₹${fmt(u.paidAmount)}<br><b>Razorpay Payment ID:</b> ${esc(u.razorpayPaymentId)}<br><b>Status:</b> Active • Payment Approved • ID Card Issued</div><div style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:14px"><button class="btn" onclick="memberDash('${esc(u.id)}')">Open My Dashboard</button><button class="btn soft" onclick="card('${esc(u.id)}')">View ID Card</button><button class="btn soft" onclick="receipt('${esc(u.id)}')">Payment Receipt</button></div></div></div>`);
  }catch(err){toast(String(err?.message||err||'Payment failed'));}
  finally{form.dataset.rzpBusy='0';if(submit){submit.disabled=false;submit.textContent=oldText||'Pay with Razorpay & Activate Membership';}}
}
async function payTransactionRazorpay(txId){
  const x=txs.find(t=>t.id===txId);if(!x)return toast('Transaction not found');
  const u=users.find(a=>a.id===x.userId)||me()||{};const amount=Number(x.amount||0);if(!amount)return toast('Invalid payment amount');
  x.status='Payment Initiated / Awaiting Razorpay';x.paymentStage='Razorpay Initiated';save();
  try{
    const order=await createOrder({kind:'transaction',dbestRef:x.id,txId:x.id,amount,section:x.section||'',sub:x.sub||'',userId:x.userId||''});
    const verified=await openCheckout(order,{name:u.name||x.contactName||'',email:u.email||'',contact:u.mobile||x.contactMobile||''},`DBest ${x.section||''} - ${x.sub||''}`,{dbestRef:x.id,kind:'transaction'});
    if(!verified?.verified)throw new Error('Payment could not be verified');
    x.status='Payment Successful / Razorpay Verified';x.paymentStage='Razorpay Verified';x.paymentRef=verified.paymentId;x.razorpayOrderId=verified.orderId;x.razorpayPaymentId=verified.paymentId;x.paidAt=new Date().toISOString();x.paymentMethod='Razorpay';x.meta={...(x.meta||{}),paymentStage:'Razorpay Verified',razorpayOrderId:verified.orderId,razorpayPaymentId:verified.paymentId};save();
    if(x.ride&&typeof rideStatusScreen==='function')return rideStatusScreen(x.id);
    if(x.order||x.meta?.order){const o=x.order||x.meta.order;try{if(o?.type&&typeof commerceCarts!=='undefined')commerceCarts[o.type]=[];if(o?.type!=='digital'&&typeof createVaahakJobsForOrder==='function')createVaahakJobsForOrder(x.id);save();}catch{}if(typeof marketOrderStatus==='function')return marketOrderStatus(x.id);}
    if(/grocery/i.test(String(x.section||''))&&typeof groceryOrderStatus==='function')return groceryOrderStatus(x.id);
    sectionScreen(`${sectionTopBar('✅ Razorpay Payment Successful',x.id,'backHome()')}<div class="sectionContent"><div class="sectionSuccess"><div style="font-size:48px">✅</div><h2>Payment Verified</h2><p>₹${fmt(amount)} received successfully through Razorpay.</p><div class="notice">Payment ID: <b>${esc(String(verified.paymentId||''))}</b></div><button class="btn" onclick="txDetailsView('${esc(x.id)}')">View Transaction</button></div></div>`);
  }catch(err){x.status='Payment Failed / Razorpay';x.paymentStage='Razorpay Failed';x.razorpayError=String(err?.message||err);save();toast(String(err?.message||err||'Razorpay payment failed'));}
}
function patchOwnerPayments(){
  const page=document.querySelector('#m .sectionPage');if(!page)return;relabelVisible(page);
  const cards=[...page.querySelectorAll('.ownerPanelCard')];
  for(const c of cards){
    const h=c.querySelector('h3');const title=String(h?.textContent||'');
    if(/PayU Configuration/i.test(title)||/Razorpay Configuration/i.test(title)){
      c.innerHTML=`<h3>Razorpay Configuration</h3><p>Razorpay Key ID and Key Secret are stored securely as Vercel environment variables. The secret is never placed in this browser.</p><div id="rzpOwnerStatus" class="notice">Checking Razorpay…</div><button class="mini" onclick="checkRazorpayConnection()">Check Connection</button>`;
    }
    if(/Membership Collection/i.test(title)){const p=c.querySelector('p');if(p)p.textContent='New membership fees are collected through Razorpay and membership is activated automatically after server verification. No Owner payment approval is required.';}
  }
  checkRazorpayConnection();
}
async function checkConnection(){const el=document.getElementById('rzpOwnerStatus');try{const c=await getConfig();if(el)el.innerHTML=c.configured?`✅ Razorpay connected • <b>${String(c.mode||'').toUpperCase()}</b> mode`:'⚠️ Razorpay credentials not configured in Vercel.';return c}catch(e){if(el)el.textContent='⚠️ Unable to verify Razorpay configuration';return null}}
window.checkRazorpayConnection=checkConnection;
try{
  const legacyReg=reg;reg=function(tier){legacyReg(tier);setTimeout(()=>patchRegistration(tier),0)};
  regGo=registerWithRazorpay;
  startPayU=payTransactionRazorpay;window.startRazorpay=payTransactionRazorpay;
  const legacyOwnerPaymentCentre=ownerPaymentCentre;ownerPaymentCentre=function(){legacyOwnerPaymentCentre();setTimeout(patchOwnerPayments,0)};
  if(typeof ownerMembershipCentre==='function'){const oldOMC=ownerMembershipCentre;ownerMembershipCentre=function(){oldOMC();setTimeout(()=>{relabelVisible();const sc=document.querySelector('#m .sectionContent');if(sc&&!document.getElementById('rzpMembershipNotice'))sc.insertAdjacentHTML('afterbegin','<div id="rzpMembershipNotice" class="notice" style="margin-bottom:12px"><b>Razorpay is the active membership payment method.</b> Manual UPI/QR settings below are retained only for legacy records; new successful Razorpay registrations are auto-activated.</div>')},0)}}
}catch(e){console.error('Razorpay integration hook error',e)}
ensureCompat();
const root=document.getElementById('m')||document.body;new MutationObserver(()=>{relabelVisible(root)}).observe(root,{childList:true,subtree:true});
window.__DBEST_RAZORPAY__={version:VERSION,getConfig,createOrder,payTransaction:payTransactionRazorpay,registerWithRazorpay};
})();