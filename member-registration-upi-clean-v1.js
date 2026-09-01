(function(){
'use strict';
const V='20260901-member-upi-clean-v1';
if(window.DBEST_MEMBER_UPI_CLEAN?.version===V)return;
function clean(){
  const page=document.querySelector('.registrationPage');
  if(!page)return;
  const form=page.querySelector('form');
  if(!form)return;

  const box=page.querySelector('.dbestUpiBox');
  if(box){
    const btn=box.querySelector('.dbestUpiBtn,button');
    if(btn){
      btn.textContent=btn.textContent.replace(/^\s*[📲➡️📱]+\s*/u,'').replace(/\s+with UPI App\s*$/i,' with UPI');
      box.replaceChildren(btn);
      box.style.padding='0';
      box.style.margin='12px 0';
      box.style.border='0';
      box.style.background='transparent';
      btn.style.minHeight='54px';
      btn.style.borderRadius='18px';
      btn.style.fontSize='16px';
      btn.style.boxShadow='0 12px 28px rgba(23,92,255,.22)';
    }
  }

  const cb=form.querySelector('input[type="checkbox"]');
  if(cb){
    const row=cb.closest('.f')||cb.parentElement;
    if(row){
      const label=row.querySelector('label');
      if(label){
        const required=label.querySelector('.dbestRequiredMark');
        label.textContent='Payment completed';
        if(required)label.appendChild(required);
      }else{
        [...row.childNodes].forEach(n=>{if(n.nodeType===Node.TEXT_NODE&&String(n.nodeValue||'').trim())n.nodeValue=' '});
        if(!row.querySelector('.dbestPaymentShortLabel')){
          const s=document.createElement('span');
          s.className='dbestPaymentShortLabel';
          s.textContent='Payment completed';
          cb.insertAdjacentElement('afterend',s);
        }
      }
    }
  }

  [...form.querySelectorAll('button')].forEach(b=>{
    if(/submit registration/i.test(b.textContent||''))b.textContent='Submit Registration';
  });
}
function schedule(){requestAnimationFrame(clean);setTimeout(clean,80)}
const root=document.getElementById('m')||document.body;
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(clean,70),true);
[0,120,400,1000].forEach(ms=>setTimeout(clean,ms));
window.DBEST_MEMBER_UPI_CLEAN={version:V,clean};
})();
