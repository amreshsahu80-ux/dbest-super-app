(function(){
'use strict';
const VERSION='1.1.0';
const SHORT_TITLES={
  'Top Health Insurance Companies':'Health Insurance',
  'Top Life Insurance Companies':'Life Insurance',
  'Top Motor Insurance Companies':'Motor Insurance',
  'Sample Term Plan Table':'Term Plans',
  'Health Insurance Comparison':'Health Comparison',
  '24/7 Claims & Service Support':'24/7 Support',
  '24/7 Claims and Service Support':'24/7 Support',
  'Top Mutual Fund Companies':'Mutual Funds',
  'Top Mutual Fund Houses':'Mutual Funds',
  'Mutual Fund Companies':'Mutual Funds',
  'Holiday Packages':'Packages',
  'International Holidays':'International',
  'Domestic Holidays':'Domestic',
  'Visa & Travel Assistance':'Visa'
};
function removeVersionBadge(){
  try{if(/V5\.5/i.test(document.title)||!document.title.trim())document.title='DBest Super Platform'}catch(_){}
  document.querySelectorAll('.buildBadge').forEach(el=>el.remove());
  document.querySelectorAll('body *').forEach(el=>{
    if(/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(el.tagName))return;
    if(el.childElementCount===0&&/^\s*V5\.5\s*$/i.test(el.textContent||''))el.remove();
  });
}
function installStyle(){
  if(document.getElementById('dbestVisualFirstPartnerTilesStyle'))return;
  const s=document.createElement('style');
  s.id='dbestVisualFirstPartnerTilesStyle';
  s.textContent=`
  .buildBadge{display:none!important}
  .dbestShowcase{margin-top:10px!important}
  .dbestShowIntro{margin-bottom:8px!important}
  .dbestShowIntro h2{margin:0 0 2px!important;font-size:22px!important}
  .dbestShowIntro p{display:none!important}
  .dbestShowGrid{gap:10px!important;align-items:stretch!important}
  .dbestShowCard{position:relative;display:flex!important;flex-direction:column!important;overflow:hidden!important;border-radius:20px!important;background:#fff!important;border:1px solid #e8edf7!important;box-shadow:0 10px 24px rgba(20,50,100,.08)!important;transition:transform .16s ease,box-shadow .16s ease!important}
  .dbestShowCard:active{transform:scale(.985)}
  .dbestShowCard img{display:block!important;width:100%!important;height:clamp(190px,38vw,300px)!important;object-fit:cover!important;object-position:center!important;background:#fff!important}
  [data-dbest-showcase="insurance"] .dbestShowCard img,
  [data-dbest-showcase="mutual_fund"] .dbestShowCard img{object-fit:contain!important;padding:3px!important;box-sizing:border-box!important;background:#fff!important}
  .dbestShowBody{position:relative!important;display:flex!important;align-items:center!important;min-height:42px!important;padding:7px 38px 7px 10px!important;background:#fff!important}
  .dbestShowBody h3{margin:0!important;width:100%!important;color:#13213a!important;font-size:13px!important;line-height:1.12!important;font-weight:850!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;letter-spacing:-.1px!important}
  .dbestShowBody b,.dbestShowBody p,.dbestShowBody small{display:none!important}
  .dbestShowBody::after{content:'›';position:absolute;right:8px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#edf3ff;color:#175cff;font-size:18px;font-weight:800;line-height:1}
  @media(max-width:520px){
    .dbestShowGrid{gap:10px!important}
    .dbestShowCard{border-radius:19px!important}
    .dbestShowCard img{height:190px!important}
    .dbestShowBody{min-height:40px!important;padding:7px 36px 7px 10px!important}
    .dbestShowBody h3{font-size:12.5px!important}
    .dbestShowBody::after{width:21px;height:21px;right:8px;font-size:17px}
  }
  @media(max-width:390px){
    .dbestShowCard img{height:178px!important}
    .dbestShowBody h3{font-size:12px!important}
  }
  `;
  document.head.appendChild(s);
}
function compactTitles(root=document){
  root.querySelectorAll?.('.dbestShowCard .dbestShowBody h3').forEach(h=>{
    const original=h.dataset.dbestFullTitle||String(h.textContent||'').trim();
    if(!original)return;
    if(!h.dataset.dbestFullTitle)h.dataset.dbestFullTitle=original;
    let short=SHORT_TITLES[original]||original;
    short=short.replace(/^Top\s+/i,'').replace(/\s+Companies$/i,'').replace(/^Sample\s+/i,'').replace(/\s+Table$/i,'');
    if(h.textContent!==short)h.textContent=short;
    h.title=original;
  });
}
function apply(){installStyle();removeVersionBadge();compactTitles(document);removeVersionBadge()}
let timer;
function schedule(){clearTimeout(timer);timer=setTimeout(apply,55)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(apply,80),true);
[0,120,350,800,1600,3200,6000].forEach(ms=>setTimeout(apply,ms));
window.DBEST_VISUAL_FIRST_PARTNER_TILES={version:VERSION,apply};
})();