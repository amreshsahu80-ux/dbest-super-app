(function(){
'use strict';
const VERSION='1.2.0';
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
  .dbestShowcase{margin-top:8px!important}
  .dbestShowIntro{margin-bottom:7px!important}
  .dbestShowIntro h2{margin:0!important;font-size:22px!important}
  .dbestShowIntro p{display:none!important}
  .dbestShowGrid{gap:9px!important;align-items:stretch!important}
  .dbestShowCard{position:relative!important;display:block!important;overflow:hidden!important;border-radius:19px!important;background:#fff!important;border:1px solid #e5ebf5!important;box-shadow:0 8px 20px rgba(20,50,100,.08)!important;transition:transform .16s ease,box-shadow .16s ease!important;isolation:isolate!important}
  .dbestShowCard:active{transform:scale(.985)}
  .dbestShowCard img{display:block!important;width:100%!important;height:clamp(220px,43vw,330px)!important;object-fit:cover!important;object-position:center!important;background:#fff!important;border-radius:inherit!important}
  [data-dbest-showcase="insurance"] .dbestShowCard img,
  [data-dbest-showcase="mutual_fund"] .dbestShowCard img{object-fit:contain!important;padding:0!important;box-sizing:border-box!important;background:#fff!important}
  .dbestShowBody{position:absolute!important;left:0!important;right:0!important;bottom:0!important;z-index:2!important;display:flex!important;align-items:flex-end!important;min-height:34px!important;padding:12px 32px 7px 9px!important;background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,.82) 36%,rgba(255,255,255,.97) 68%,#fff 100%)!important;pointer-events:none!important}
  .dbestShowBody h3{margin:0!important;width:100%!important;color:#13213a!important;font-size:12px!important;line-height:1.05!important;font-weight:850!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;letter-spacing:-.08px!important;text-shadow:0 1px 0 rgba(255,255,255,.9)!important}
  .dbestShowBody b,.dbestShowBody p,.dbestShowBody small{display:none!important}
  .dbestShowBody::after{content:'›';position:absolute!important;right:6px!important;bottom:5px!important;display:grid!important;place-items:center!important;width:18px!important;height:18px!important;border-radius:999px!important;background:rgba(237,243,255,.94)!important;color:#175cff!important;font-size:15px!important;font-weight:900!important;line-height:1!important;box-shadow:0 1px 5px rgba(30,70,150,.08)!important}
  @media(max-width:520px){
    .dbestShowGrid{gap:8px!important}
    .dbestShowCard{border-radius:18px!important}
    .dbestShowCard img{height:218px!important}
    .dbestShowBody{min-height:32px!important;padding:11px 29px 6px 8px!important}
    .dbestShowBody h3{font-size:11.5px!important}
    .dbestShowBody::after{width:17px!important;height:17px!important;right:5px!important;bottom:4px!important;font-size:14px!important}
  }
  @media(max-width:390px){
    .dbestShowCard img{height:205px!important}
    .dbestShowBody h3{font-size:11px!important}
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