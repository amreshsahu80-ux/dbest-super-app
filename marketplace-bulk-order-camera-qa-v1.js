/* Bulk-order camera option; augments existing upload, never changes its submission logic. */
(function(){
'use strict';
function enhance(){
  var inputs=Array.from(document.querySelectorAll('input[type="file"]'));
  inputs.forEach(function(input){
    if(input.dataset.dbestBulkCamera==='1')return;
    var parent=input.closest('label,.uploadBox,.bulkUpload,.bulk-order,[class*="bulk"],[id*="bulk"]')||input.parentElement;
    var context=((parent&&parent.textContent)||'')+' '+(input.id||'')+' '+(input.name||'')+' '+(input.getAttribute('aria-label')||'');
    if(!/bulk\s*order|bulk\s*upload|upload\s*bulk|order\s*list/i.test(context))return;
    input.dataset.dbestBulkCamera='1';
    // Keep the original upload as the single source of truth for submission.
    input.accept=input.accept||'image/*,.pdf';
    var button=document.createElement('button');button.type='button';button.className='btn dbestBulkCameraBtn';button.textContent='📷 Take Photo of Order List';button.style.margin='8px 8px 8px 0';
    var camera=document.createElement('input');camera.type='file';camera.accept='image/*';camera.capture='environment';camera.hidden=true;camera.setAttribute('aria-label','Take a photo of bulk order list');
    button.addEventListener('click',function(){camera.value='';camera.click()});
    camera.addEventListener('change',function(){
      if(!camera.files||!camera.files.length)return;
      try{var transfer=new DataTransfer();Array.from(camera.files).forEach(function(f){transfer.items.add(f)});input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));button.textContent='📷 Retake Order Photo';button.setAttribute('aria-label','Retake bulk order photo')}
      catch(e){var warning=document.createElement('div');warning.setAttribute('role','alert');warning.textContent='Photo captured. Please choose the photo using the existing Upload button to continue.';button.insertAdjacentElement('afterend',warning)}
    });
    var remove=document.createElement('button');remove.type='button';remove.className='mini dbestBulkCameraRemove';remove.textContent='Remove Photo';remove.hidden=true;remove.addEventListener('click',function(){input.value='';camera.value='';input.dispatchEvent(new Event('change',{bubbles:true}));remove.hidden=true;button.textContent='📷 Take Photo of Order List'});
    input.addEventListener('change',function(){remove.hidden=!input.files||!input.files.length});
    input.insertAdjacentElement('afterend',camera);camera.insertAdjacentElement('afterend',button);button.insertAdjacentElement('afterend',remove);
  });
}
var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;enhance()})}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});schedule();
})();
