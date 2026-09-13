(function(){
'use strict';
function addTypeField(){
  const modal=document.getElementById('dbestExternalSuccessModal');
  if(!modal)return;
  const form=modal.querySelector('#dbestExternalSuccessForm');
  if(!form||form.querySelector('[name="serviceType"]'))return;
  const title=(modal.innerText||'').toLowerCase();
  const isInsurance=title.includes('all insurance')||title.includes('insurance');
  const isTravel=title.includes('travel');
  if(!isInsurance&&!isTravel)return;
  const ref=form.querySelector('[name="reference"]');
  if(!ref)return;
  const wrap=document.createElement('div');
  wrap.className='f';
  wrap.innerHTML=isInsurance?'<label>Type of Insurance *</label><select name="serviceType" required><option value="">Select Insurance Type</option><option value="Health Insurance">Health Insurance</option><option value="Life Insurance">Life Insurance</option><option value="Motor Insurance">Motor Insurance</option></select>':'<label>Travel Type *</label><select name="serviceType" required><option value="">Select Travel Type</option><option value="Flight">Flight</option><option value="Hotel">Hotel</option><option value="Tour Package">Tour Package</option></select>';
  ref.closest('.f').insertAdjacentElement('beforebegin',wrap);
  form.addEventListener('submit',function(){
    const v=String(form.querySelector('[name="serviceType"]')?.value||'').trim();
    const notes=form.querySelector('[name="notes"]');
    if(v&&notes&&!String(notes.value||'').includes(v))notes.value=(v+'\n'+String(notes.value||'')).trim();
  },true);
}
new MutationObserver(function(){setTimeout(addTypeField,20)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(addTypeField,1000);
})();