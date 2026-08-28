(function(){
'use strict';
const VERSION='1.0.0';
const SHORT_TITLES={
  'Top Health Insurance Companies':'Health Insurance',
  'Top Life Insurance Companies':'Life Insurance',
  'Top Motor Insurance Companies':'Motor Insurance',
  'Sample Term Plan Table':'Term Plans',
  'Top Mutual Fund Companies':'Mutual Funds',
  'Top Mutual Fund Houses':'Mutual Funds',
  'Mutual Fund Companies':'Mutual Funds',
  'Holiday Packages':'Packages'
};
function installStyle(){
  if(document.getElementById('dbestVisualFirstPartnerTilesStyle'))return;
  const s=document.createElement('style');
  s.id='dbestVisualFirstPartnerTilesStyle';
  s.textContent=`
  .dbestShowcase{margin-top:16px!important}
  .dbestShowIntro{margin-bottom:10px!important}
  .dbestShowIntro h2{margin-bottom:0!important}
  .dbestShowIntro p{display:none!important}
  .dbestShowGrid{gap:12px!important}
  .dbestShowCard{position:relative;display:flex!important;flex-direction:column!important;overflow:hidden!important;border-radius:20px!important;background:#fff!important;transition:transform .16s ease,box-shadow .16s ease!important}
  .dbestShowCard:active{transform:scale(.985)}
  .dbestShowCard img{display:block!important;width:100%!important;height:clamp(165px,32vw,260px)!important;object-fit:cover!important;object-position:center!important;background:#f8fbff!important}
  [data-dbest-showcase="insurance"] .dbestShowCard img,
  [data-dbest-showcase="mutual_fund"] .dbestShowCard img{object-fit:contain!important;padding:5px!important;box-sizing:border-box!important;background:#fff!important}
  .dbestShowBody{position:relative!important;display:flex!important;align-items:center!important;gap:8px!important;min-height:52px!important;padding:9px 38px 9px 12px!important;background:#fff!important}
  .dbestShowBody h3{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;margin:0!important;color:#13213a!important;font-size:15px!important;line-height:1.18!important;font-weight:850!important;letter-spacing:-.1px!important}
  .dbestShowBody b,.dbestShowBody p,.dbestShowBody small{display:none!important}
  .dbestShowBody::after{content:'›';position:absolute;right:12px;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:#eef4ff;color:#175cff;font-size:22px;font-weight:800;line-height:1}
  @media(max-width:520px){
    .dbestShowGrid{gap:10px!important}
    .dbestShowCard{border-radius:18px!important}
    .dbestShowCard img{height:165px!important}
    .dbestShowBody{min-height:48px!important;padding:8px 34px 8px 10px!important}
    .dbestShowBody h3{font-size:14px!important}
    .dbestShowBody::after{right:9px;width:22px;height:22px;font-size:20px}
  }
  @media(max-width:380px){
    .dbestShowCard img{height:150px!important}
    .dbestShowBody h3{font-size:13px!important}
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
    if(short.length>34&&/Insurance/i.test(short))short=short.replace(/\s+Insurance\s+/i,' Insurance ');
    if(h.textContent!==short)h.textContent=short;
    h.title=original;
  });
}
function apply(){installStyle();compactTitles(document)}
let timer;
function schedule(){clearTimeout(timer);timer=setTimeout(apply,55)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(apply,80),true);
[0,120,350,800,1600,3200].forEach(ms=>setTimeout(apply,ms));
window.DBEST_VISUAL_FIRST_PARTNER_TILES={version:VERSION,apply};
})();