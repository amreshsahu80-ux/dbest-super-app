(function(){
'use strict';
const VERSION='1.0.0';
if(window.DBEST_VAAHAK_WALLET_RAZORPAY?.version===VERSION)return;
const TOKEN_KEY='dbest_vaahak_live_token';
const API='/api/razorpay/vaahak-wallet';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function token(){try{return localStorage.getItem(TOKEN_KEY)||''}catch(_){return''}}
function loadRazorpay(){return new Promise((resolve,reject)=>{if(window.Razorpay)return resolve(window.Razorpay);const old=document.querySelector('script[data-dbest-razorpay-sdk]');if(old){old.addEventListener('load',()=>resolve(window.Razorpay),{once:true});old.addEventListener('error',()=>reject(new Error('Razorpay checkout could not load')),{once:true});return}const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.async=true;s.setAttribute('data-dbest-razorpay-sdk','1');s.onload=()=>window.Razorpay?resolve(window.Razorpay):reject(new Error('Razorpay checkout unavailable'));s.onerror=()=>reject(new Error('Razorpay checkout could not load'));(document.head||document.documentElement).appendChild(s)})}
async function call(body){const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,vaahakToken:token()})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Wallet recharge request failed');return d}
function money(v){const n=Number(v||0);return '₹'+(Number.isFinite(n)?n:0).toLocaleString('en-IN',{maximumFractionDigits:2})}
function setMsg(text,ok){const m=document.getElementById('dbvRzpMsg');if(!m)return;m.innerHTML='<div class="dbv-note '+(ok?'dbv-good':'dbv-bad')+'">'+esc(text)+'</div>'}
function selectedAmount(){const n=Number(document.getElementById('dbvRzpAmount')?.value||0);return Number.isFinite(n)?Math.round(n*100)/100:0}
function installCard(){
 const panels=document.getElementById('dbestVaahakTabPanels');if(!panels)return;
 const earnings=[...panels.querySelectorAll('.dbv-panel')].find(x=>/Earnings\s*&\s*Wallet/i.test(String(x.textContent||'')));if(!earnings)return;
 if(document.getElementById('dbvRazorpayRechargeCard'))return;
 const actions=earnings.querySelector('.dbv-actions');
 const card=document.createElement('div');card.id='dbvRazorpayRechargeCard';card.className='dbv-panel';card.style.marginTop='12px';card.style.border='1px solid #cfe0ff';card.innerHTML='<h3 style="margin:0 0 6px">⚡ Instant Wallet Recharge</h3><div class="dbv-note dbv-good">Pay securely with Razorpay. Wallet balance is credited automatically only after DBest verifies the captured payment.</div><div class="dbv-actions" id="dbvRzpQuick" style="margin-top:10px"><button type="button" class="dbv-btn soft" data-rzp-amt="100">₹100</button><button type="button" class="dbv-btn soft" data-rzp-amt="250">₹250</button><button type="button" class="dbv-btn soft" data-rzp-amt="500">₹500</button><button type="button" class="dbv-btn soft" data-rzp-amt="1000">₹1,000</button></div><div class="dbv-field" style="margin-top:10px"><label>Recharge Amount (₹)</label><input id="dbvRzpAmount" inputmode="decimal" placeholder="Minimum ₹10" value="500"></div><div class="dbv-actions"><button type="button" class="dbv-btn" id="dbvRzpPay">⚡ Recharge with Razorpay</button></div><div id="dbvRzpMsg"></div><div class="dbv-meta" style="margin-top:8px">Successful payment is credited once only. Failed/cancelled payments do not change the wallet balance.</div>';
 if(actions)actions.parentNode.insertBefore(card,actions);else earnings.appendChild(card);
 const manual=document.getElementById('dbvRechargeBtn');if(manual)manual.textContent='Other Recharge Method (UTR / Proof)';
 card.querySelectorAll('[data-rzp-amt]').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById('dbvRzpAmount');if(i)i.value=b.getAttribute('data-rzp-amt')||''}));
 const pay=document.getElementById('dbvRzpPay');if(pay)pay.onclick=startRecharge;
}
async function startRecharge(){
 const btn=document.getElementById('dbvRzpPay'),amount=selectedAmount();
 if(amount<10||amount>50000){setMsg('Enter an amount between ₹10 and ₹50,000.',false);return}
 if(!token()){setMsg('Vaahak login session is required. Please login again.',false);return}
 try{
  btn.disabled=true;btn.textContent='Creating secure payment…';setMsg('Connecting to Razorpay…',true);
  const [order]=await Promise.all([call({action:'create',amount}),loadRazorpay()]);
  const options={key:order.keyId,amount:Number(order.amount),currency:order.currency||'INR',name:'DBest',description:'Vaahak Wallet Recharge',order_id:order.orderId,prefill:order.prefill||{},notes:{dbest_ref:order.dbestRef||'',purpose:'Vaahak Wallet Recharge'},handler:async function(resp){try{setMsg('Payment received. Verifying with DBest…',true);const v=await call({action:'verify',razorpay_order_id:resp.razorpay_order_id,razorpay_payment_id:resp.razorpay_payment_id,razorpay_signature:resp.razorpay_signature});setMsg('Recharge successful: '+money(v.amount)+'. New wallet balance: '+money(v.balance)+(v.alreadyCredited?' (already credited earlier)':''),true);setTimeout(()=>{try{window.DBEST_VAAHAK_DASH_TABS?.render?.('earnings')}catch(_){location.reload()}},1200)}catch(e){setMsg('Payment was made but wallet verification needs attention: '+e.message+'. Do not pay again; refresh first.',false)}}};
  const rz=new window.Razorpay(options);rz.on('payment.failed',r=>{setMsg('Payment failed or was not captured. Wallet was not credited'+(r?.error?.description?': '+r.error.description:'.'),false)});rz.open();setMsg('Razorpay checkout opened. Complete payment to recharge instantly.',true);
 }catch(e){setMsg('Recharge could not start: '+e.message,false)}finally{if(btn){btn.disabled=false;btn.textContent='⚡ Recharge with Razorpay'}}
}
function boot(){installCard();const root=document.getElementById('dbestVaahakTabPanels')||document.body;new MutationObserver(installCard).observe(root,{childList:true,subtree:true});setInterval(installCard,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.DBEST_VAAHAK_WALLET_RAZORPAY={version:VERSION,install:installCard,start:startRecharge};
})();
