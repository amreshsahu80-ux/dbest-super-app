(()=>{
'use strict';
const VERSION='1.0.0';
const css=`
:root{--dbest-card:#fff;--dbest-shadow:0 12px 30px rgba(20,42,84,.09);--dbest-shadow2:0 18px 44px rgba(20,42,84,.13)}
html{scroll-behavior:smooth}
body{background:linear-gradient(180deg,#f7f9fd 0%,#f3f6fb 100%)}
.nav{box-shadow:0 8px 24px rgba(22,42,78,.05);border-bottom-color:#edf1f7}
.search input{border-color:#e7ebf2;background:#fff;box-shadow:0 4px 14px rgba(24,48,92,.04)}
.hero{padding:18px 0 10px}.heroBox{border-radius:24px;padding:26px;box-shadow:0 18px 42px rgba(22,46,98,.16)}
.hero h1{font-size:clamp(28px,4vw,38px);letter-spacing:-.6px}.hero p{max-width:720px;margin-bottom:0}
.head{margin:20px 0 10px}.head h2{font-size:clamp(19px,2.4vw,25px);letter-spacing:-.25px}
.grid{gap:14px}.tile{min-height:245px;border-radius:24px;box-shadow:var(--dbest-shadow)}.tile:hover,.tile:active{transform:translateY(-2px);box-shadow:var(--dbest-shadow2)}
.tileIn{padding:13px}.tileVisual{height:142px;margin-top:8px;border-radius:19px}.tileTag{padding:5px 9px;font-size:9px;opacity:.9}.tileBody{margin-top:11px}.tileBody b{font-size:18px;letter-spacing:-.2px}.tileBody small{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;opacity:.82;margin-top:5px}.tileCta{font-size:11px;padding-top:8px;opacity:.75}
.subs,.cards{gap:12px}.sub,.card,.ownerPanelCard,.checkoutCard,.orderStatusCard,.payCard{border:1px solid #edf1f6!important;background:var(--dbest-card)!important;border-radius:18px!important;box-shadow:var(--dbest-shadow);padding:14px!important}.sub:hover,.card:hover{transform:translateY(-1px);box-shadow:var(--dbest-shadow2)}
.sub small,.card small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35}
.btn{min-height:42px;border-radius:12px;padding:10px 14px;box-shadow:0 6px 16px rgba(23,92,255,.12)}.btn.soft{box-shadow:none}.mini{min-height:34px;border-radius:10px}
.tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:7px;padding:2px 2px 7px;margin-bottom:12px;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tabs button{white-space:nowrap;border-radius:999px;padding:8px 12px;background:#f1f4f8;color:#536174;font-size:12px}.tabs .on{background:#e9efff;color:#1556e8}
.notice{border-radius:14px!important;line-height:1.45}.table{border-radius:16px;box-shadow:0 6px 18px rgba(20,42,84,.05)}
.sectionContent{animation:dbestFade .18s ease-out}.toast{border-radius:13px;box-shadow:0 12px 30px rgba(8,22,52,.28)}
@keyframes dbestFade{from{opacity:.65;transform:translateY(4px)}to{opacity:1;transform:none}}
@media(max-width:700px){
  .w{padding:0 12px}.navin{gap:8px}.dbestTopLogo{width:132px!important;height:44px!important}.heroBox{padding:20px;border-radius:20px}.hero p{font-size:13px;line-height:1.45}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px}.tile{min-height:205px;border-radius:19px}.tileIn{padding:10px}.tileVisual{height:104px!important;border-radius:15px}.tileTag{display:none}.tileBody{margin-top:9px}.tileBody b{font-size:15px}.tileBody small{display:none}.tileCta{display:none}
  .subs,.cards{grid-template-columns:1fr 1fr!important;gap:9px}.sub,.card{padding:12px!important;border-radius:15px!important}.sub b,.card b{font-size:13px}.sub small,.card small{font-size:10px;-webkit-line-clamp:1}
  .head{align-items:flex-end}.head h2{font-size:20px}.toggle{padding:3px;border-radius:11px}.toggle button{padding:7px 9px;font-size:11px}
  .sectionContent{padding-left:12px!important;padding-right:12px!important}.serviceFormGrid{gap:10px!important}
}
@media(max-width:390px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.tile{min-height:194px}.tileVisual{height:96px!important}.tileBody b{font-size:14px}.subs,.cards{grid-template-columns:1fr!important}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
function installCss(){if(document.getElementById('dbestModernPolish'))return;const s=document.createElement('style');s.id='dbestModernPolish';s.textContent=css;document.head.appendChild(s)}
function dedupeTabs(){document.querySelectorAll('.tabs').forEach(t=>{const seen=new Set();[...t.querySelectorAll('button')].forEach(b=>{const k=String(b.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');if(!k)return;if(seen.has(k)){b.style.display='none';b.dataset.dbestDuplicate='1'}else seen.add(k)})})}
function trimNoise(){document.querySelectorAll('.tileBody small,.sub small,.card small').forEach(el=>{const t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(t.length>140)el.title=t});
  document.querySelectorAll('button').forEach(b=>{const t=String(b.textContent||'').trim();if(/^click here$/i.test(t))b.textContent='Open';if(/^view details$/i.test(t))b.textContent='View';if(/^proceed to continue$/i.test(t))b.textContent='Continue'})}
function tidy(){installCss();dedupeTabs();trimNoise()}
tidy();new MutationObserver(()=>requestAnimationFrame(tidy)).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_UI_POLISH={version:VERSION,refresh:tidy};
})();