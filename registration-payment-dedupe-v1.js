(function(){
'use strict';
const VERSION='1.5.0';
const PLACEHOLDER_REF='UPI Payment - Pending Owner Verification';

function istDate(){
  try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${m.year}-${m.month}-${m.day}`}
  catch(e){return new Date().toISOString().slice(0,10)}
}
function regPage(){return document.querySelector('.registrationPage')}
function regForm(page=regPage()){if(!page)return null;return page.querySelector('.registrationForm,form[onsubmit*="regGo"],form')}
function submitControl(form){if(!form)return null;return [...form.querySelectorAll('button,input[type="submit"]')].find(x=>/submit registration/i.test(String(x.textContent||x.value||'')))||form.querySelector('button[type="submit"],input[type="submit"]')}
function clearDummyProof(input){const f=input?.files?.[0];if(f&&f.name==='payment-verification.txt'){try{input.value=''}catch(e){}}}
function normalizeCard(card){
  if(!card)return null;
  card.hidden=false;if(card.style.display==='none')card.style.display='grid';
  card.querySelectorAll('.dbestPaymentConfirmField').forEach(w=>{if(w.style.display==='none')w.style.display='block';w.hidden=false});
  const ref=card.querySelector('[name="paymentRef"]');if(ref){ref.required=true;ref.minLength=6;ref.maxLength=60;ref.autocomplete='off';ref.placeholder='Enter UTR / UPI reference number';if(String(ref.value||'').trim()===PLACEHOLDER_REF)ref.value=''}
  const date=card.querySelector('[name="paymentDate"]');if(date){date.type='date';date.required=true;if(!date.value)date.value=istDate()}
  const proof=card.querySelector('[name="paymentProof"]');if(proof){clearDummyProof(proof);proof.type='file';proof.accept='image/*,.pdf';proof.required=true}
  const chk=card.querySelector('input[type="checkbox"]');if(chk)chk.required=true;
  return card;
}
function detachField(form,name,create){
  let el=form.querySelector(`[name="${name}"]`);if(!el)el=create();
  const old=el.parentElement;if(old&&old!==form&&old.children.length<=3){try{old.style.display='none'}catch(e){}}
  return el;
}
function fieldWrap(label,el,hint){
  const w=document.createElement('div');w.className='dbestPaymentConfirmField';
  const l=document.createElement('label');l.textContent=label;l.style.cssText='display:block;font-weight:800;margin-bottom:7px;color:#1f2937';w.appendChild(l);w.appendChild(el);
  el.style.cssText='box-sizing:border-box;width:100%;padding:12px 13px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font:inherit;color:#111827';
  if(hint){const h=document.createElement('small');h.textContent=hint;h.style.cssText='display:block;margin-top:6px;color:#64748b;line-height:1.35';w.appendChild(h)}return w;
}
function ensurePaymentConfirmation(){
  const page=regPage(),form=regForm(page);if(!page||!form)return null;
  let card=form.querySelector('#dbestRegistrationPaymentConfirmation');if(card)return normalizeCard(card);

  const ref=detachField(form,'paymentRef',()=>{const x=document.createElement('input');x.name='paymentRef';x.type='text';return x});
  if(String(ref.value||'').trim()===PLACEHOLDER_REF)ref.value='';ref.required=true;ref.minLength=6;ref.maxLength=60;ref.autocomplete='off';ref.placeholder='Enter UTR / UPI reference number';
  const date=detachField(form,'paymentDate',()=>{const x=document.createElement('input');x.name='paymentDate';x.type='date';return x});date.type='date';date.required=true;if(!date.value)date.value=istDate();
  const proof=detachField(form,'paymentProof',()=>{const x=document.createElement('input');x.name='paymentProof';x.type='file';return x});clearDummyProof(proof);proof.type='file';proof.accept='image/*,.pdf';proof.required=true;
  if(proof.dataset.dbestSizeBound!=='1'){proof.dataset.dbestSizeBound='1';proof.addEventListener('change',()=>{const f=proof.files&&proof.files[0];if(f&&f.size>5*1024*1024){proof.value='';alert('Payment proof should be below 5 MB. Please upload a screenshot or smaller PDF.')}})}

  let amount=form.querySelector('[name="paidAmount"]');if(!amount){amount=document.createElement('input');amount.type='hidden';amount.name='paidAmount';const txt=String(page.textContent||'');const m=txt.match(/Membership Fee\s*₹\s*([0-9,]+)/i);amount.value=m?String(Number(m[1].replace(/,/g,''))||0):'0';form.appendChild(amount)}

  card=document.createElement('section');card.id='dbestRegistrationPaymentConfirmation';card.style.cssText='margin:14px 0;padding:15px;border:1px solid #bfdbfe;border-radius:16px;background:#f8fbff;display:grid;gap:12px';
  card.innerHTML='<div><b style="font-size:17px;color:#1e3a8a">✅ Payment Confirmation</b><div style="font-size:12px;color:#64748b;margin-top:3px">भुगतान के बाद UTR और Payment Proof दर्ज करें</div></div>';
  card.appendChild(fieldWrap('UTR / UPI Reference Number *',ref,'Use the transaction/reference number shown in your UPI app after successful payment.'));
  card.appendChild(fieldWrap('Payment Date *',date,''));
  card.appendChild(fieldWrap('Payment Proof *',proof,'Upload the successful-payment screenshot or PDF.'));

  const confirm=document.createElement('label');confirm.className='dbestPaymentConfirmationCheck';confirm.style.cssText='display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.4;color:#334155';
  let chk=[...form.querySelectorAll('input[type="checkbox"]')].find(x=>!x.closest('#dbestRegistrationPaymentConfirmation'));
  if(chk){const old=chk.parentElement;if(old&&old!==form){try{old.style.display='none'}catch(e){}}}
  else{chk=document.createElement('input');chk.type='checkbox';chk.name='dbestPaymentConfirmed'}
  chk.required=true;chk.style.cssText='width:18px;height:18px;margin-top:1px;flex:0 0 auto';
  const span=document.createElement('span');span.textContent='I confirm that I have paid the exact membership amount to DBest and the UTR/proof entered above is correct.';confirm.append(chk,span);card.appendChild(confirm);

  const submit=submitControl(form);if(submit)submit.insertAdjacentElement('beforebegin',card);else form.appendChild(card);
  return normalizeCard(card);
}
function focusPaymentConfirmation(){const card=ensurePaymentConfirmation();if(!card)return;requestAnimationFrame(()=>{card.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>card.querySelector('[name="paymentRef"]')?.focus(),350)})}
function cleanRegistrationPayments(){
  const page=regPage();if(!page)return;
  const merchant=[...page.querySelectorAll('#dbestRegistrationMerchantUPI')];if(merchant.length>1)merchant.slice(1).forEach(x=>x.remove());
  const keep=page.querySelector('#dbestRegistrationMerchantUPI');if(keep){const legacy=[...page.querySelectorAll('.dbestUpiBox')];if(legacy.length>1)legacy.slice(1).forEach(x=>x.remove())}
  ensurePaymentConfirmation();try{window.DBEST_ICICI_MERCHANT_QR?.wireRegistration?.()}catch(e){}
}
function loadMerchantQrIntent(){
  if(window.DBEST_ICICI_MERCHANT_QR?.version==='1.3.0'){cleanRegistrationPayments();return;}
  const old=document.getElementById('dbestICICIMerchantQrIntentV1');if(old)old.remove();const s=document.createElement('script');s.id='dbestICICIMerchantQrIntentV1';s.src='./icici-merchant-qr-intent-v1.js?v=20260905-0145-qr-manual-payment';s.async=false;s.onload=cleanRegistrationPayments;document.head.appendChild(s);
}
function validateRealPaymentProof(ev){
  const form=ev.target;if(!(form instanceof HTMLFormElement)||!form.closest('.registrationPage'))return;
  const ref=form.querySelector('[name="paymentRef"]'),proof=form.querySelector('[name="paymentProof"]');
  clearDummyProof(proof);
  if(!ref||!String(ref.value||'').trim()||String(ref.value||'').trim()===PLACEHOLDER_REF){ev.preventDefault();ev.stopImmediatePropagation();focusPaymentConfirmation();alert('Please enter the actual UTR / UPI reference number from your successful payment.');return}
  if(!proof?.files?.length){ev.preventDefault();ev.stopImmediatePropagation();focusPaymentConfirmation();alert('Please upload the successful payment screenshot or PDF before submitting registration.');return}
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;cleanRegistrationPayments()})}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden','required']});
document.addEventListener('click',e=>{if(e.target.closest?.('#dbestPaidDone'))setTimeout(focusPaymentConfirmation,60)},true);
document.addEventListener('submit',validateRealPaymentProof,true);
window.addEventListener('pageshow',schedule);setTimeout(cleanRegistrationPayments,30);setTimeout(cleanRegistrationPayments,300);loadMerchantQrIntent();
window.DBEST_REGISTRATION_PAYMENT_DEDUPE={version:VERSION,run:cleanRegistrationPayments,ensure:ensurePaymentConfirmation,focus:focusPaymentConfirmation};
})();