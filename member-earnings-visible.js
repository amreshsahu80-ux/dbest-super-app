(function(){
'use strict';
const VERSION='1.3.0';
const MEMBER_ROLES=['guest','promoter','prime','leader'];
function appSession(){try{return typeof session!=='undefined'?session:null}catch(e){return null}}
function appUsers(){try{return (typeof users!=='undefined'&&Array.isArray(users))?users:[]}catch(e){return []}}
function isMember(){const s=appSession();return !!(s&&MEMBER_ROLES.includes(String(s.role||''))&&s.id)}
function member(){const s=appSession();if(!s)return null;return appUsers().find(u=>String(u.id||'')===String(s.id||''))||null}
function money(v){return '₹'+Math.round(Number(v||0)).toLocaleString('en-IN')}
function earnings(u,period){try{return typeof combinedEarningsForPeriod==='function'?Number(combinedEarningsForPeriod(u,period)||0):0}catch(e){return 0}}
function visible(el){if(!el)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return !!(r.width||r.height)}
function currentRoot(){const roots=[...document.querySelectorAll('.sectionContent')];return roots.filter(visible).pop()||roots.pop()||null}
function isDashboard(root){
  if(!root||!isMember())return false;
  const text=String(root.innerText||'');
  if(/Member Business Dashboard/i.test(text))return true;
  if(root.querySelector('.memberMiniHead')&&root.querySelector('.earnGrid'))return true;
  if(root.querySelector('.earnGrid')&&root.querySelector('button[onclick*="directBusinessDashboard"]'))return true;
  return false;
}
function removeFallback(){document.getElementById('dbestMemberEarningsGuaranteed')?.remove()}
function forceNative(root){
  const grid=root?.querySelector('.earnGrid');
  if(!grid)return false;
  grid.style.setProperty('display','grid','important');
  grid.style.setProperty('visibility','visible','important');
  grid.style.setProperty('opacity','1','important');
  grid.style.setProperty('height','auto','important');
  grid.style.setProperty('max-height','none','important');
  grid.style.setProperty('overflow','visible','important');
  grid.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
  grid.style.setProperty('gap','10px','important');
  [...grid.querySelectorAll('.earnCard')].forEach(card=>{
    card.style.setProperty('display','block','important');
    card.style.setProperty('visibility','visible','important');
    card.style.setProperty('opacity','1','important');
    card.style.setProperty('height','auto','important');
    card.style.setProperty('min-height','94px','important');
  });
  return true;
}
function renderFallback(root,u){
  let box=document.getElementById('dbestMemberEarningsGuaranteed');
  if(box&&box.parentElement!==root){box.remove();box=null}
  const vals={today:earnings(u,'today'),month:earnings(u,'month'),year:earnings(u,'year'),all:earnings(u,'all')};
  if(!box){
    box=document.createElement('section');
    box.id='dbestMemberEarningsGuaranteed';
    box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;margin:12px 0 16px;padding:14px;border:1px solid #dbe6ff;border-radius:18px;background:linear-gradient(135deg,#f8fbff,#eef4ff);width:100%';
    box.innerHTML='<div style="font-weight:900;font-size:17px;color:#173a78;margin-bottom:9px">💰 My Earnings</div><div data-earn-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"></div>';
    const anchor=root.querySelector('.memberMiniHead,.sectionHero');
    if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box);
  }
  const grid=box.querySelector('[data-earn-grid]');
  if(grid)grid.innerHTML=[['Today',vals.today],['This Month',vals.month],['This Year',vals.year],['Since Joining',vals.all]].map(([label,val])=>'<div style="background:#fff;border:1px solid #dfe7f4;border-radius:14px;padding:12px;min-height:84px"><small style="display:block;color:#687386;font-weight:800">'+label+'</small><b style="display:block;font-size:20px;color:#13213a;margin-top:5px">'+money(val)+'</b><small style="display:block;color:#7b8799;margin-top:3px">Direct + Downline</small></div>').join('');
}
function ensure(){
  if(!isMember()){removeFallback();return false}
  const root=currentRoot();
  if(!root||!isDashboard(root)){removeFallback();return false}
  const u=member();if(!u){removeFallback();return false}
  if(forceNative(root)){removeFallback();return true}
  renderFallback(root,u);
  return true;
}
async function syncAndRefresh(){try{await window.DBEST_TRANSACTION_LEDGER?.syncAll?.(true);await window.DBEST_TRANSACTION_LEDGER?.refreshNetwork?.(true)}catch(e){}ensure()}
function wrapMemberDash(){try{if(typeof memberDash!=='function'||memberDash.__earningsDashboardWrapped)return;const raw=memberDash;const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(ensure,0);setTimeout(ensure,80);setTimeout(syncAndRefresh,250);return out};wrapped.__earningsDashboardWrapped=true;memberDash=wrapped}catch(e){}}
function wrapSectionScreen(){try{if(typeof sectionScreen!=='function'||sectionScreen.__earningsDashboardWrapped)return;const raw=sectionScreen;const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(ensure,0);setTimeout(ensure,80);return out};wrapped.__earningsDashboardWrapped=true;sectionScreen=wrapped}catch(e){}}
function maintain(){wrapMemberDash();wrapSectionScreen();ensure()}
const obs=new MutationObserver(()=>setTimeout(maintain,0));obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(maintain,80),true);
[0,100,400,1000,2200].forEach(ms=>setTimeout(()=>{maintain();if(ms===1000)syncAndRefresh()},ms));
setInterval(maintain,1200);
window.DBEST_MEMBER_EARNINGS_VISIBLE={version:VERSION,ensure,refresh:syncAndRefresh};
})();
