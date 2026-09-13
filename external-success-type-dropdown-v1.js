(function(){
'use strict';
function safe(v){return String(v||'').trim()}
function cleanAttr(v){return safe(v).replace(/["&<>]/g,'')}
function addFields(){
  const modal=document.getElementById('dbestExternalSuccessModal');
  if(!modal)return;
  const form=modal.querySelector('#dbestExternalSuccessForm');
  if(!form)return;
  const title=safe(modal.innerText);

  if(!form.querySelector('[name="dbestTransactionId"]')){
    const m=title.match(/\bTX\d{6,}\b/i);
    const txid=m?m[0]:'';
    const first=form.querySelector('.f');
    if(txid&&first){
      const box=document.createElement('div');
      box.className='f';
      box.innerHTML='<label>DBest Transaction ID *</label><input name="dbestTransactionId" readonly value="'+cleanAttr(txid)+'" style="background:#f3f6fb;font-weight:700">';
      form.insertBefore(box,first);
    }
  }

  if(form.querySelector('[name="serviceType"]'))return;
  const lower=title.toLowerCase();
  const isInsurance=lower.includes('insurance');
  const isTravel=!isInsurance&&(/\btravel\b/.test(lower)||/flights?/.test(lower)||/hotels?/.test(lower)||/packages?/.test(lower));
  if(!isInsurance&&!isTravel)return;
  const ref=form.querySelector('[name="reference"]');
  if(!ref)return;
  const wrap=document.createElement('div');
  wrap.className='f';
  wrap.innerHTML=isInsurance
    ?'<label>Type of Insurance *</label><select name="serviceType" required><option value="">Select Insurance Type</option><option value="Health Insurance">Health Insurance</option><option value="Life Insurance">Life Insurance</option><option value="Motor Insurance">Motor Insurance</option></select>'
    :'<label>Booking Type *</label><select name="serviceType" required><option value="">Select Booking Type</option><option value="Flight">Flight</option><option value="Hotel">Hotel</option><option value="Tour Package">Tour Package</option></select>';
  const holder=ref.closest('.f');
  if(holder)holder.insertAdjacentElement('beforebegin',wrap);
  if(!form.dataset.dbestTypeHook){
    form.dataset.dbestTypeHook='1';
    form.addEventListener('submit',function(){
      const v=safe(form.querySelector('[name="serviceType"]')?.value);
      const notes=form.querySelector('[name="notes"]');
      if(v&&notes&&!safe(notes.value).toLowerCase().includes(v.toLowerCase()))notes.value=(v+'\n'+safe(notes.value)).trim();
    },true);
  }
}
new MutationObserver(function(){setTimeout(addFields,20)}).observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,700,1200].forEach(ms=>setTimeout(addFields,ms));
setInterval(addFields,1000);
})();