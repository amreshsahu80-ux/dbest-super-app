(function(){'use strict';
function addStyle(){if(document.getElementById('dbestTerrOpsPolishV2'))return;const s=document.createElement('style');s.id='dbestTerrOpsPolishV2';s.textContent=`
#dbestTerrOpsPanel{height:min(90vh,820px)!important}
.toHead{padding:12px 14px!important;min-height:72px}
.toHead b{font-size:18px}
.toNotice{margin:10px 12px 8px!important;padding:0!important;border:0!important;background:transparent!important}
.toNotice .opsInfoSummary{width:100%;border:1px solid #d9e5f5;background:#f5f8ff;color:#18345c;border-radius:12px;padding:10px 12px;font:800 12px system-ui;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
.toNotice .opsInfoBody{display:none;margin-top:7px;background:#eef5ff;border:1px solid #cfe0ff;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.45;color:#41516d}
.toNotice.open .opsInfoBody{display:block}
.toTabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;overflow:visible!important;padding:2px 12px 10px!important;background:#f7f9fd}
.toTab{width:100%!important;min-width:0!important;white-space:normal!important;border-radius:12px!important;padding:10px 8px!important;line-height:1.15!important;font-size:12px!important;border:1px solid #dbe5f2!important;box-shadow:0 2px 8px rgba(25,55,100,.05)!important}
.toTab:nth-child(1){background:#eaf0ff;color:#173f9f}.toTab:nth-child(2){background:#e8fbf5;color:#087a5f}.toTab:nth-child(3){background:#f2eaff;color:#6d34bd}.toTab:nth-child(4){background:#eaf7ff;color:#14688a}.toTab:nth-child(5){background:#fff0f6;color:#a52a68}.toTab:nth-child(6){background:#fff5e8;color:#9a5a00}.toTab:nth-child(7){background:#eef1f7;color:#35405c}
.toTab.on{background:linear-gradient(135deg,#10264d,#175cff)!important;color:#fff!important;border-color:transparent!important;box-shadow:0 7px 18px rgba(23,92,255,.22)!important}
.toBody{padding:2px 12px 18px!important;overflow:auto!important;min-height:0!important}
.toCard{border-radius:16px!important;padding:13px!important;margin-bottom:10px!important;box-shadow:0 4px 14px rgba(20,42,75,.05)!important}
.toBtns{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
.toBtn{width:100%!important;padding:10px 8px!important;border-radius:10px!important;font-size:12px!important}
.toBtn.soft{background:#eaf2ff!important;color:#1760d8!important}.toBtn.danger{background:#ffecec!important;color:#a52c2c!important}
@media(max-width:390px){.toTabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}.toTab{font-size:11px!important;padding:9px 6px!important}.toBtns{grid-template-columns:1fr!important}}
@media(min-width:700px){.toTabs{grid-template-columns:repeat(4,minmax(0,1fr))!important}.toBtns{display:flex!important}.toBtn{width:auto!important}.toNotice{margin-bottom:10px!important}}
`;document.head.appendChild(s)}
function polish(){addStyle();const n=document.querySelector('#dbestTerrOpsPanel .toNotice');if(n&&!n.dataset.polished){const txt=n.textContent.trim();n.dataset.polished='1';n.innerHTML=`<button type="button" class="opsInfoSummary"><span>ⓘ Payment & money handling policy</span><span class="opsChevron">▾</span></button><div class="opsInfoBody"></div>`;n.querySelector('.opsInfoBody').textContent=txt;n.querySelector('.opsInfoSummary').onclick=()=>{n.classList.toggle('open');const c=n.querySelector('.opsChevron');if(c)c.textContent=n.classList.contains('open')?'▴':'▾'}}}
new MutationObserver(()=>polish()).observe(document.documentElement,{childList:true,subtree:true});[0,300,800,1500].forEach(ms=>setTimeout(polish,ms));
})();