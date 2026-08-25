(function(){
'use strict';
const VERSION='1.0.0';
function isOwner(){try{return typeof session!=='undefined'&&session?.role==='owner'}catch(e){return false}}
function openPayout(){
  if(typeof window.ownerPayoutStudio==='function')return window.ownerPayoutStudio();
  if(typeof window.DBEST_PAYOUT_PERCENT_MATRIX?.open==='function')return window.DBEST_PAYOUT_PERCENT_MATRIX.open();
  if(typeof window.toast==='function')window.toast('Percentage Payout Rules are still loading. Please tap again.');
}
function inject(){
  if(!isOwner())return;
  const root=document.querySelector('.sectionContent.owner55');
  if(!root)return;
  const groups=[...root.querySelectorAll('.owner55Group')];
  const finance=groups.find(g=>/Finance\s*&\s*Integrations/i.test(g.innerText||''))||groups.find(g=>/payout|payment/i.test(g.innerText||''))||root;
  const grid=finance.querySelector?.('.owner55Grid')||root.querySelector('.owner55Grid');
  if(!grid||document.getElementById('dbestPercentagePayoutRulesEntry'))return;
  const b=document.createElement('button');
  b.id='dbestPercentagePayoutRulesEntry';
  b.className='owner55Action';
  b.innerHTML='<span>📊</span><b>Percentage Payout Rules</b><small>Set editable payout % for every section and subsection across Direct / Self, Level 1, Level 2 and Level 3.</small><span class="owner55Badge">ALL SECTIONS • %</span>';
  b.onclick=openPayout;
  grid.prepend(b);
}
function boot(){inject()}
const mo=new MutationObserver(boot);
mo.observe(document.body,{childList:true,subtree:true});
[0,150,500,1200,2500].forEach(ms=>setTimeout(boot,ms));
document.addEventListener('click',e=>{const b=e.target.closest?.('#dbestPercentagePayoutRulesEntry');if(!b)return;e.preventDefault();e.stopPropagation();openPayout()},true);
window.DBEST_OWNER_PAYOUT_ENTRY={version:VERSION,refresh:inject,open:openPayout};
})();