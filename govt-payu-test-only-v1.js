(function(){
'use strict';
const VERSION='20261020-govt-payu-test-only-v1';
if(window.DBEST_GOVT_PAYU_ONLY?.version===VERSION)return;
const testAction='https://test.payu.in/_payment';
const txsLive=()=>{try{return typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]}catch(_){return []}};
const memberToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(_){return ''}};
const isGovt=tx=>!!tx&&(String(tx?.meta?.sectionId||'')==='govt'||String(tx.section||'').trim().toLowerCase()==='pan, dl, itr');
const findTx=id=>txsLive().find(t=>String(t.id||'')===String(id||''))||null;
const toastMsg=msg=>{try{typeof toast==='function'?toast(msg):console.warn(msg)}catch(_){}};
let cfg={configured:false,mode:'test'},checkedAt=0,checkPromise=null,shownId='';
async function getConfig(force=false){
 if(!force&&Date.now()-checkedAt<15000)return cfg;
 if(checkPromise)return checkPromise;
 checkPromise=fetch('/api/payu/config',{method:'GET',cache:'no-store'}).then(async r=>{
   if(!r.ok)throw Error('sandbox_not_available');
   const data=await r.json();
   cfg={configured:data.configured===true,mode:data.mode==='test'?'test':'not-test'};
   checkedAt=Date.now();return cfg;
 }).catch(()=>{cfg={configured:false,mode:'test'};checkedAt=Date.now();return cfg}).finally(()=>{checkPromise=null;updateButtons()});
 return checkPromise;
}
function ready(){return cfg.configured&&cfg.mode==='test'}
function updateButtons(){
 document.querySelectorAll('[data-dbest-govt-payu-only="1"]').forEach(el=>{
   const scope=el.shadowRoot||el;
   const btn=scope.querySelector('button[data-dbest-govt-payu-submit]');
   const note=scope.querySelector('[data-dbest-govt-payu-status]');
   if(btn){btn.disabled=!ready();const v=ready()?'Continue to PayU Sandbox →':'PayU Test Setup Required';if(btn.textContent!==v)btn.textContent=v}
   if(note){const v=ready()?'PayU test credentials found. No live payment will be taken.':'PayU test key and salt are not configured. No other payment gateway is available for this service.';if(note.textContent!==v)note.textContent=v}
 });
}
function paymentRoot(){return document.querySelector('#m .paymentPage')||document.querySelector('.paymentPage')}
function currentTx(root){
 const ref=root?.querySelector('.payRef')?.textContent?.trim()||'';
 return findTx(ref);
}
function removeOtherChoices(root){
 root.querySelectorAll('.dbestPolicyCard,.dbestDualPayCard,.dbestInternalUpiBox,.dbestUPIPaymentCard').forEach(e=>e.remove());
 const payCards=root.querySelectorAll('.paymentSummary > .payCard');
 for(let i=1;i<payCards.length;i++)if(payCards[i].style.display!=='none')payCards[i].style.display='none';
 for(const btn of root.querySelectorAll('button')){
   if(btn.closest('[data-dbest-govt-payu-only="1"]'))continue;
   const click=String(btn.getAttribute('onclick')||''),text=String(btn.textContent||'');
   if(/Razorpay|PayU|Pay\s+Secure|UPI|ICICI|Direct\s+Payment|QR|startPayU|startRazorpay/i.test(click+' '+text))
     if(btn.style.display!=='none')btn.style.display='none';
 }
}
function decorate(){
 const root=paymentRoot(),tx=currentTx(root);
 if(!root||!isGovt(tx))return;
 removeOtherChoices(root);
 const id=String(tx.id);
 let card=root.querySelector('[data-dbest-govt-payu-only="1"]');
 if(card&&card.dataset.txid!==id){card.remove();card=null}
 if(!card){
   // The existing membership-only Razorpay compatibility layer rewrites every
   // visible PayU text node in #m to Razorpay. Shadow DOM isolates ONLY this
   // Government checkout's label without changing that frozen global layer.
   card=document.createElement('div');
   card.dataset.dbestGovtPayuOnly='1';card.dataset.txid=id;
   card.style.cssText='display:block;margin:12px 0';
   const shadow=card.attachShadow({mode:'open'});
   const style=document.createElement('style');
   style.textContent=':host{display:block;font-family:Arial,Helvetica,sans-serif;color:#162b4a}.panel{padding:16px;border:1px solid #d8e5fc;border-radius:14px;background:#fff}h3{margin:0 0 12px;font-size:17px}p{font-weight:700;margin:0 0 9px}.notice{border-radius:8px;background:#f4f8ff;padding:10px 12px;font-size:12px;margin:12px 0}small{display:block;line-height:1.5;color:#48607d}button{display:block;width:100%;margin:12px 0;background:#175cff;color:white;border:0;border-radius:10px;padding:13px;font-size:15px;font-weight:700;cursor:pointer}button:disabled{background:#bdc9d9;cursor:not-allowed}';
   const panel=document.createElement('section');panel.className='panel';
   const title=document.createElement('h3');title.textContent='PayU Test Payment Only';
   const amount=document.createElement('p');amount.textContent='DBest Assistance Fee: ₹'+Number(tx.amount||0).toLocaleString('en-IN');
   const note=document.createElement('div');note.className='notice';note.textContent='Government statutory/portal fees, if applicable, are separate.';
   const status=document.createElement('small');status.dataset.dbestGovtPayuStatus='1';status.textContent='Checking PayU test configuration…';
   const btn=document.createElement('button');btn.type='button';btn.dataset.dbestGovtPayuSubmit='1';btn.disabled=true;btn.textContent='Checking PayU Test…';
   btn.addEventListener('click',()=>window.dbestGovtStartPayU(id));
   panel.append(title,amount,note,status,btn);shadow.append(style,panel);
   const anchor=root.querySelector('.paymentSummary');
   if(anchor)anchor.insertAdjacentElement('beforebegin',card);else root.prepend(card);
 }
 shownId=id;updateButtons();
 void getConfig();
}
window.dbestGovtStartPayU=async function(txid){
 const tx=findTx(txid);
 if(!isGovt(tx)){toastMsg('This checkout is reserved for DBest Government Services.');return false}
 const c=await getConfig(true);
 if(!(c.configured&&c.mode==='test')){toastMsg('PayU Test is not configured. The Owner must supply sandbox merchant credentials securely.');return false}
 const token=memberToken();if(!token){toastMsg('Please sign in to your verified DBest member account.');return false}
 const idx=Number(tx.meta?.subIndex);
 const schema=(typeof serviceSchema==='function')?serviceSchema('govt',idx):null;
 if(!schema||Number(schema.fee)!==Number(tx.amount)||!(Number(tx.amount)>0)){
   toastMsg('The service amount has changed; reopen the application before paying.');return false
 }
 const app=tx.application||tx.meta?.application||{};
 const email=String(app.email||((typeof me==='function'?me():null)?.email)||'').trim();
 if(!email||!email.includes('@')){toastMsg('A valid applicant email is required for PayU Test.');return false}
 const button=document.querySelector('[data-dbest-govt-payu-only="1"]')?.shadowRoot?.querySelector('button');
 if(button)button.disabled=true;
 try{
   // Ensure verified central transaction exists BEFORE creating PayU's sandbox payment.
   if(!window.DBEST_TRANSACTION_LEDGER?.record||!await window.DBEST_TRANSACTION_LEDGER.record(tx))
     throw Error('Secure transaction sync unavailable. Please retry after member session reconnects.');
   await window.DBEST_SERVICE_REQUEST_LIVE?.sendRequest?.(tx,true);
   const response=await fetch('/api/payu/create-payment',{
    method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-dbest-member-token':token},
    body:JSON.stringify({dbest_tx_id:tx.id,amount:tx.amount,firstname:String(app.name||tx.contactName||'DBest Customer'),
     email,phone:String(app.mobile||tx.contactMobile||''),udf1:tx.userId,udf2:tx.section,udf3:tx.sub,
     productinfo:'DBest Govt Service - '+String(tx.sub||'Assistance')})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(String(result.error||'PayU sandbox checkout not available'));
   if(result.provider!=='payu'||result.mode!=='test'||result.action!==testAction||!result.fields?.hash)
     throw Error('PayU sandbox verification failed. Payment blocked.');
   const form=document.createElement('form');form.method='POST';form.action=testAction;form.style.display='none';
   Object.entries(result.fields).forEach(([key,value])=>{
     const input=document.createElement('input');input.type='hidden';input.name=String(key);input.value=String(value??'');form.appendChild(input);
   });
   document.body.appendChild(form);form.submit();return true;
 }catch(e){toastMsg(String(e.message||e));return false}
 finally{updateButtons()}
};
function install(){
 const base=window.paymentReview;
 if(typeof base==='function'&&!base.__dbestGovtPayuOnly){
  const wrapper=function(id){const r=base.apply(this,arguments);setTimeout(decorate,70);return r};
  wrapper.__dbestGovtPayuOnly=true;wrapper.__dbestOriginal=base;
  window.paymentReview=wrapper;try{paymentReview=wrapper}catch(_){}
 }
 decorate();
}
let queued=false;new MutationObserver(()=>{
 if(queued)return;queued=true;setTimeout(()=>{queued=false;install()},45);
}).observe(document.documentElement,{childList:true,subtree:true});
install();setTimeout(install,700);
window.DBEST_GOVT_PAYU_ONLY={version:VERSION,isGovt,getConfig,decorate};
})();