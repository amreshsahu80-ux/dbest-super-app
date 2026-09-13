(function(){
'use strict';
const clean=s=>String(s||'').trim();
function esc(s){return clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function apply(){
  const modal=document.getElementById('dbestExternalSuccessModal');
  if(!modal)return;
  const form=modal.querySelector('#dbestExternalSuccessForm');
  if(!form)return;
  const modalText=clean(modal.innerText);
  const txMatch=modalText.match(/\bTX\d{6,}\b/i);
  const txid=txMatch?txMatch[0]:'';
  if(txid&&!form.querySelector('[name="dbestTransactionId"]')){
    const first=form.querySelector('.f');
    if(first){
      const box=document.createElement('div');
      box.className='f';
      box.innerHTML='<label>DBest Transaction ID *</label><input name="dbestTransactionId" readonly value="'+esc(txid)+'" style="background:#f3f6fb;font-weight:700">';
      form.insertBefore(box,first);
    }
  }
  if(form.querySelector('[name="serviceType"]'))return;
  const lower=modalText.toLowerCase();
  const isInsurance=/insurance/.test(lower);
  const isTravel=/\btravel\b|flights?\s+hotels?\s+packages?|flights?|hotels?|tour packages?/.test(lower)&&!isInsurance;
  if(!isInsurance&&!isTravel)return;
  const ref=form.querySelector('[name="reference"]');
  if(!ref)return;
  const wrap=document.createElement('div');wrap.className='f';
  wrap.innerHTML=isInsurance
    ?'<label>Type of Insurance *</label><select name="serviceType" required><option value="">Select Insurance Type</option><option value="Health Insurance">Health Insurance</option><option value="Life Insurance">Life Insurance</option><option value="Motor Insurance">Motor Insurance</option></select>'
    :'<label>Booking Type *</label><select name="serviceType" required><option value="">Select Booking Type</option><option value="Flight">Flight</option><option value="Hotel">Hotel</option><option value="Tour Package">Tour Package</option></select>';
  ref.closest('.f')?.insertAdjacentElement('beforebegin',wrap);
  if(!form.dataset.dbestServiceTypeHook){
    form.dataset.dbestServiceTypeHook='1';
    form.addEventListener('submit',function(){
      const v=clean(form.querySelector('[name="serviceType"]')?.value);
      const notes=form.querySelector('[name="notes"]');
      if(v&&notes&&!clean(notes.value).toLowerCase().includes(v.toLowerCase()))notes.value=(v+'\n'+clean(notes.value)).trim();
    },true);
  }
}
new MutationObserver(()=>setTimeout(apply,10)).observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,800,1500].forEach(ms=>setTimeout(apply,ms));
})();