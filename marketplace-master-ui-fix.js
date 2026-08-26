(function(){
'use strict';
const VERSION='1.1.0';
function style(){if(document.getElementById('dbestMasterOrderUiFixStyle'))return;const s=document.createElement('style');s.id='dbestMasterOrderUiFixStyle';s.textContent=`
.orderStatusCard>div:first-child,.orderStatusCard .ownerPanelCard>div:first-child{align-items:flex-start!important;flex-wrap:wrap!important}
.orderStatusCard>div:first-child>span,.orderStatusCard .ownerPanelCard>div:first-child>span{display:inline-block!important;max-width:210px!important;white-space:normal!important;text-align:center!important;line-height:1.15!important;overflow-wrap:anywhere!important;flex:0 1 auto!important}
.dbestMinBillingNote{margin-top:8px;padding:8px 10px;border-radius:11px;background:#fff8e8;border:1px solid #f0ddb0;color:#745400;font-size:12px;line-height:1.35}
@media(max-width:600px){.orderStatusCard>div:first-child,.orderStatusCard .ownerPanelCard>div:first-child{display:block!important}.orderStatusCard>div:first-child>span,.orderStatusCard .ownerPanelCard>div:first-child>span{max-width:100%!important;margin-top:8px!important}.orderStatusCard h2{font-size:28px!important;overflow-wrap:anywhere}.orderStatusCard .ownerPanelCard{overflow:hidden!important}}
`;document.head.appendChild(s)}
function annotate(){style();document.querySelectorAll('.orderStatusCard .ownerPanelCard').forEach(card=>{if(card.querySelector('.dbestMinBillingNote'))return;const t=String(card.innerText||''),m=t.match(/Delivery:\s*₹\s*([\d,.]+)\s*•\s*([\d.]+)\s*km/i);if(!m)return;const fee=Number(m[1].replace(/,/g,'')),km=Number(m[2]);if(fee>0&&km<0.01){const d=document.createElement('div');d.className='dbestMinBillingNote';d.textContent='Minimum delivery charge applied.';const details=[...card.querySelectorAll('div')].find(x=>/Order total:/i.test(String(x.innerText||'')));(details||card).insertAdjacentElement('afterend',d)}})}
function wrap(){const a=window.DBEST_MASTER_MARKET;if(!a||typeof a.status!=='function'||a.status.__dbestUiFixed)return;const old=a.status;a.status=async function(){const r=await old.apply(this,arguments);setTimeout(annotate,60);setTimeout(annotate,250);return r};a.status.__dbestUiFixed=true}
function boot(){style();wrap();annotate()}
[100,400,900,1800,3500].forEach(ms=>setTimeout(boot,ms));new MutationObserver(()=>{clearTimeout(window.__dbestMasterUiFixTimer);window.__dbestMasterUiFixTimer=setTimeout(boot,80)}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_MASTER_ORDER_UI_FIX={version:VERSION,apply:boot};
})();