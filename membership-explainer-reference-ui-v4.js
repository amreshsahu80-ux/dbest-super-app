(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_REFERENCE_UI_V4)return;
window.DBEST_MEMBERSHIP_REFERENCE_UI_V4=true;
function closeModal(e){
  if(e){try{e.preventDefault()}catch(_){ }try{e.stopPropagation()}catch(_){ }try{e.stopImmediatePropagation()}catch(_){ }}
  var m=document.getElementById('dbestMembershipPlanModal');
  if(m&&m.parentNode)m.parentNode.removeChild(m);
}
function tune(){
  var m=document.getElementById('dbestMembershipPlanModal');
  if(!m)return;
  var shell=m.querySelector('.dbmShell'), head=m.querySelector('.dbmHead'), grid=m.querySelector('.dbmGrid');
  if(!shell||!grid)return;
  m.style.padding='6px';m.style.alignItems='center';m.style.justifyContent='center';m.style.overflow='hidden';
  shell.style.width='min(1180px,calc(100vw - 12px))';shell.style.height='min(92vh,720px)';shell.style.maxHeight='92vh';shell.style.overflow='hidden';shell.style.padding='14px';shell.style.borderRadius='20px';shell.style.display='grid';shell.style.gridTemplateRows='auto 1fr auto';shell.style.boxSizing='border-box';
  if(head){head.style.marginBottom='10px';head.style.gap='10px'}
  grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';grid.style.gap='10px';grid.style.minHeight='0';grid.style.overflow='hidden';
  var plans=grid.querySelectorAll('.dbmPlan');
  plans.forEach(function(p){p.style.minHeight='0';p.style.height='100%';p.style.padding='12px 10px';p.style.borderRadius='15px';p.style.boxSizing='border-box';p.style.overflow='hidden'});
  var buttons=m.querySelectorAll('.dbmChoose');
  buttons.forEach(function(b){b.textContent='Select';b.style.minHeight='38px';b.style.fontWeight='900'});
  var x=m.querySelector('.dbmClose');
  if(x){x.setAttribute('type','button');x.setAttribute('aria-label','Close');x.style.zIndex='2147483647';x.style.pointerEvents='auto';x.onclick=closeModal;x.onpointerup=closeModal;x.ontouchend=closeModal}
}
var css=document.createElement('style');css.id='dbestMembershipReferenceUIV4';css.textContent=`
#dbestMembershipPlanModal .dbmShell{background:#fff!important;box-shadow:0 22px 75px rgba(0,0,0,.30)!important}
#dbestMembershipPlanModal .dbmHead h2{font-size:clamp(17px,2.2vw,23px)!important;color:#10234a!important}
#dbestMembershipPlanModal .dbmHead p{font-size:clamp(10px,1.25vw,13px)!important;color:#667085!important}
#dbestMembershipPlanModal .dbmCrown{background:#fff8e6!important;border:1px solid #f3d38a!important}
#dbestMembershipPlanModal .dbmClose{background:#fff!important;border:1px solid #e4e7ec!important;box-shadow:0 3px 12px rgba(16,24,40,.12)!important;color:#101828!important;cursor:pointer!important}
#dbestMembershipPlanModal .dbmPlan{box-shadow:none!important}
#dbestMembershipPlanModal .dbmIcon{text-align:center!important;font-size:29px!important}
#dbestMembershipPlanModal .dbmPlan h3{text-align:center!important;font-size:18px!important;margin:5px 0 0!important}
#dbestMembershipPlanModal .dbmPrice{text-align:center!important;font-size:24px!important;margin:5px 0 8px!important}
#dbestMembershipPlanModal .dbmBest{text-align:center!important;font-size:11px!important;line-height:1.25!important;min-height:30px!important}
#dbestMembershipPlanModal .dbmList{margin:10px 0 12px!important;gap:6px!important}
#dbestMembershipPlanModal .dbmList li{font-size:10.5px!important;line-height:1.25!important}
#dbestMembershipPlanModal .dbmChoose{border-radius:9px!important;font-size:12px!important}
#dbestMembershipPlanModal .dbmFoot{margin-top:10px!important;gap:8px!important}
#dbestMembershipPlanModal .dbmTrust{font-size:9px!important;padding:7px 5px!important}
#dbestMembershipPlanModal .dbmTrust b{font-size:10px!important}
@media(max-width:700px){
 #dbestMembershipPlanModal{padding:3px!important}
 #dbestMembershipPlanModal .dbmShell{width:calc(100vw - 6px)!important;height:calc(100dvh - 6px)!important;max-height:calc(100dvh - 6px)!important;padding:7px 4px!important;border-radius:14px!important;grid-template-rows:auto 1fr!important}
 #dbestMembershipPlanModal .dbmHead{margin-bottom:4px!important;gap:4px!important}
 #dbestMembershipPlanModal .dbmCrown{display:none!important}
 #dbestMembershipPlanModal .dbmHead h2{font-size:12px!important}
 #dbestMembershipPlanModal .dbmHead p{font-size:7.5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 #dbestMembershipPlanModal .dbmClose{width:30px!important;height:30px!important;font-size:20px!important;flex:0 0 auto!important}
 #dbestMembershipPlanModal .dbmGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important}
 #dbestMembershipPlanModal .dbmPlan{padding:5px 2px!important;border-radius:9px!important}
 #dbestMembershipPlanModal .dbmIcon{font-size:16px!important}
 #dbestMembershipPlanModal .dbmPlan h3{font-size:9px!important;white-space:nowrap!important}
 #dbestMembershipPlanModal .dbmPrice{font-size:11px!important;white-space:nowrap!important;margin:2px 0 3px!important}
 #dbestMembershipPlanModal .dbmPrice small{display:none!important}
 #dbestMembershipPlanModal .dbmBest{font-size:6.4px!important;line-height:1.12!important;min-height:0!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
 #dbestMembershipPlanModal .dbmList{gap:2px!important;margin:4px 0!important}
 #dbestMembershipPlanModal .dbmList li{font-size:6.2px!important;line-height:1.12!important;padding-left:8px!important;overflow-wrap:anywhere!important}
 #dbestMembershipPlanModal .dbmList li:nth-child(n+5){display:none!important}
 #dbestMembershipPlanModal .dbmChoose{min-height:27px!important;font-size:7px!important;padding:2px!important}
 #dbestMembershipPlanModal .dbmFoot{display:none!important}
}
@media(max-height:650px){#dbestMembershipPlanModal .dbmFoot{display:none!important}#dbestMembershipPlanModal .dbmList li:nth-child(n+5){display:none!important}}
`;
document.head.appendChild(css);
document.addEventListener('click',function(e){var m=document.getElementById('dbestMembershipPlanModal');if(!m)return;var x=e.target&&e.target.closest?e.target.closest('.dbmClose'):null;if(x&&m.contains(x))closeModal(e)},true);
document.addEventListener('pointerup',function(e){var m=document.getElementById('dbestMembershipPlanModal');if(!m)return;var x=e.target&&e.target.closest?e.target.closest('.dbmClose'):null;if(x&&m.contains(x))closeModal(e)},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('dbestMembershipPlanModal'))closeModal(e)},true);
var observer=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){if(ms[i].addedNodes&&ms[i].addedNodes.length){tune();break}}});
observer.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(tune,0);setTimeout(tune,150);
window.DBEST_MEMBERSHIP_REFERENCE_UI_V4_API={tune:tune,close:closeModal};
})();
