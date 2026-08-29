(function(){
'use strict';
const BUILD='20260829-1145-cab-visual-ui';
let styled=false;
function style(){
  if(styled||document.getElementById('dbestCabVisualFinalStyle'))return;
  styled=true;
  const s=document.createElement('style');
  s.id='dbestCabVisualFinalStyle';
  s.textContent=`
  .dcx{max-width:980px!important;padding-bottom:28px!important}
  .dcxHero{display:none!important}
  .dcxTabs{margin:0 8px 9px!important;border-radius:15px!important;padding:4px!important;background:#eef4ff!important;box-shadow:inset 0 0 0 1px #dbe7ff!important}
  .dcxTabs button{min-height:42px!important;font-size:13px!important;border-radius:12px!important}
  .dcxTabs button.on{background:linear-gradient(135deg,#1160ff,#3157ef)!important;box-shadow:0 7px 18px rgba(23,92,255,.22)!important}
  .dcxMap{height:355px!important;border-radius:24px!important;border:1px solid #d8e4f6!important;box-shadow:0 12px 30px rgba(21,57,115,.10)!important}
  .dcxPanel{margin:-14px 12px 0!important;padding:14px!important;border-radius:24px!important;border:1px solid #dce6f3!important;box-shadow:0 18px 42px rgba(19,33,58,.15)!important}
  .dcxField{margin-bottom:10px!important}
  .dcxInput{display:grid!important;grid-template-columns:28px 1fr 42px!important;align-items:center!important;gap:8px!important;min-height:76px!important;padding:0 10px!important;border:1px solid #d8e2ef!important;border-radius:19px!important;background:#fff!important;box-shadow:0 6px 16px rgba(29,61,111,.06)!important}
  .dcxInput:focus-within{border-color:#7fa7ff!important;box-shadow:0 0 0 3px #eef4ff,0 8px 18px rgba(29,61,111,.08)!important}
  .dcxDot{width:18px!important;height:18px!important;border:5px solid #fff!important;box-shadow:0 0 0 6px rgba(29,161,104,.12)!important}
  .dcxDot.d{box-shadow:0 0 0 6px rgba(238,82,96,.12)!important}
  .dcxInputText{min-width:0!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:2px!important}
  .dcxInputLabel{font-size:11px!important;line-height:1!important;font-weight:900!important;color:#17a168!important;letter-spacing:.2px!important}
  .dcxField.dbestDrop .dcxInputLabel{color:#ef3446!important}
  .dcxInput input{padding:3px 0 2px!important;font-size:15px!important;font-weight:750!important;color:#15233a!important;text-overflow:ellipsis!important}
  .dcxInput input::placeholder{font-weight:600!important;color:#8b94a4!important}
  .dcxQuickPin{width:40px!important;height:40px!important;border:0!important;border-radius:13px!important;background:#f4f8ff!important;color:#1765ff!important;font-size:19px!important;font-weight:900!important;box-shadow:0 4px 12px rgba(24,80,170,.08)!important}
  .dcxField.dbestDrop .dcxQuickPin{background:#fff4f5!important;color:#ef3446!important}
  .dcxSug{border-radius:16px!important;box-shadow:0 20px 42px rgba(19,33,58,.24)!important}
  .dcxBtns{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin:10px 0 9px!important}
  .dcxBtns button{min-height:48px!important;padding:8px 5px!important;border-radius:14px!important;background:#fff!important;color:#273a57!important;font-size:10.5px!important;line-height:1.2!important;border:1px solid #dce5f2!important;box-shadow:0 5px 14px rgba(28,57,103,.05)!important}
  .dcxBtns button.on{background:#eef4ff!important;color:#175cff!important;border-color:#b9ceff!important;box-shadow:inset 0 0 0 1px #d6e3ff!important}
  .dcxPanel>.dcxHint{display:none!important}
  .dbestCabSmartBar{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:7px!important;margin:7px 0 10px!important;padding:8px!important;background:#f8faff!important;border:1px solid #e3eaf5!important;border-radius:16px!important}
  .dbestCabChip{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-height:36px!important;border-radius:12px!important;font-size:10.5px!important;font-weight:900!important;white-space:nowrap!important}
  .dbestCabChip.gps{background:#eaf9f1!important;color:#118351!important}.dbestCabChip.search{background:#edf4ff!important;color:#175cff!important}.dbestCabChip.map{background:#f3efff!important;color:#6434d8!important}
  .dcxRental{padding:10px!important;border-radius:17px!important;background:#f8faff!important;border:1px solid #e2e9f4!important}
  .dcxRental h3{font-size:15px!important}.dcxRental .dcxHint{font-size:10px!important;padding:8px!important;margin-bottom:0!important}
  .dcxPack{border-radius:14px!important;padding:10px!important}.dcxPack.on{background:#edf4ff!important;box-shadow:0 5px 14px rgba(23,92,255,.08)!important}
  .dcxActions{display:flex!important;flex-direction:column!important;gap:8px!important;margin-top:10px!important}
  #dcxFind{order:1!important;width:100%!important;min-height:58px!important;border-radius:18px!important;background:linear-gradient(135deg,#0868ff,#264df1)!important;color:#fff!important;font-size:16px!important;font-weight:950!important;box-shadow:0 12px 24px rgba(21,91,239,.25)!important}
  #dcxSwap{order:2!important;width:100%!important;min-height:44px!important;border-radius:15px!important;background:#f1f5fd!important;color:#175cff!important;font-size:13px!important;font-weight:900!important}
  .dcxStats{gap:8px!important}.dcxStat{border-radius:15px!important;padding:10px!important;background:#fff!important;box-shadow:0 5px 14px rgba(28,57,103,.05)!important}.dcxStat small{font-size:9px!important}.dcxStat b{font-size:14px!important}
  .dcxPowered{font-size:9px!important;opacity:.72!important;margin-top:7px!important}
  .dcxVehicles{margin:14px 8px 0!important}.dcxVehicles h3{font-size:18px!important;margin-bottom:9px!important}.dcxVeh{border-radius:18px!important;padding:12px!important;box-shadow:0 7px 18px rgba(28,57,103,.06)!important}.dcxIcon{font-size:27px!important}.dcxFare{font-size:16px!important;color:#123c87!important}
  @media(max-width:700px){
    .sectionContent{padding-left:8px!important;padding-right:8px!important}
    .dcxMap{height:310px!important;border-radius:21px!important}
    .dcxPanel{margin:-12px 7px 0!important;padding:11px!important;border-radius:21px!important}
    .dcxInput{min-height:70px!important;border-radius:17px!important;grid-template-columns:24px 1fr 38px!important;padding:0 8px!important}
    .dcxDot{width:15px!important;height:15px!important;border-width:4px!important;box-shadow:0 0 0 5px rgba(29,161,104,.12)!important}.dcxDot.d{box-shadow:0 0 0 5px rgba(238,82,96,.12)!important}
    .dcxQuickPin{width:36px!important;height:36px!important;border-radius:12px!important;font-size:17px!important}
    .dcxInput input{font-size:14px!important}
    .dcxBtns{grid-template-columns:repeat(3,minmax(0,1fr))!important}.dcxBtns button:last-child{grid-column:auto!important}
    .dbestCabSmartBar{gap:5px!important;padding:6px!important}.dbestCabChip{font-size:9.5px!important;min-height:33px!important;gap:3px!important}
    #dcxFind{min-height:56px!important;font-size:15px!important}
  }
  @media(max-width:380px){.dcxBtns button{font-size:9.5px!important}.dbestCabChip{font-size:8.8px!important}.dcxMap{height:285px!important}}
  `;
  document.head.appendChild(s);
}
function labelField(id,label,k){
  const input=document.getElementById(id);if(!input||input.dataset.dbestVisual==='1')return;
  input.dataset.dbestVisual='1';
  const box=input.closest('.dcxInput'),field=input.closest('.dcxField');if(!box||!field)return;
  field.classList.add(k==='d'?'dbestDrop':'dbestPickup');
  const text=document.createElement('div');text.className='dcxInputText';
  const lab=document.createElement('span');lab.className='dcxInputLabel';lab.textContent=label;
  box.insertBefore(text,input);text.appendChild(lab);text.appendChild(input);
  const q=document.createElement('button');q.type='button';q.className='dcxQuickPin';q.setAttribute('aria-label',`Set ${label} on map`);q.textContent='◎';
  q.onclick=()=>document.querySelector(`[data-dcx-mode="${k}"]`)?.click();box.appendChild(q);
}
function smartBar(){
  if(document.getElementById('dbestCabSmartBar'))return;
  const btns=document.querySelector('.dcxBtns');if(!btns)return;
  const bar=document.createElement('div');bar.id='dbestCabSmartBar';bar.className='dbestCabSmartBar';
  bar.innerHTML='<span id="dbestCabGpsChip" class="dbestCabChip gps">📍 GPS Ready</span><span class="dbestCabChip search">🔎 Smart Search</span><span class="dbestCabChip map">🗺️ Easy Pin</span>';
  btns.insertAdjacentElement('afterend',bar);
}
function gpsChip(){
  const chip=document.getElementById('dbestCabGpsChip'),state=document.getElementById('dcxGpsState');if(!chip)return;
  const on=/GPS bias ON/i.test(state?.textContent||'');chip.textContent=on?'📍 GPS ON':'📍 GPS Ready';
}
function shorten(){
  const p=document.querySelector('[data-dcx-mode="p"]'),d=document.querySelector('[data-dcx-mode="d"]'),g=document.getElementById('dcxGps'),f=document.getElementById('dcxFind'),sw=document.getElementById('dcxSwap');
  if(p)p.textContent='📍 Pickup Map';if(d)d.textContent='🏁 Drop Map';if(g&&!/Locating/i.test(g.textContent||''))g.textContent='◎ Current';if(f)f.textContent='🚕 Continue → Choose Vehicle';if(sw)sw.textContent='⇅ Swap Pickup & Drop';
  const rent=document.querySelector('.dcxRental .dcxHint');if(rent&&!rent.dataset.shortened){rent.dataset.shortened='1';rent.textContent='Fare follows DBest live tariff. Extra distance/time uses Owner rules.'}
}
function decorate(){
  if(!document.querySelector('.dcx'))return;style();labelField('dcxPickup','Pickup','p');labelField('dcxDrop','Drop','d');smartBar();shorten();gpsChip();
}
[0,100,250,500,900,1500,2500].forEach(ms=>setTimeout(decorate,ms));
const mo=new MutationObserver(()=>setTimeout(decorate,0));
mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
window.DBEST_CAB_VISUAL_UI={build:BUILD,decorate};
})();