(function(){
'use strict';
const VERSION='1.2.0';
const MEMBER_ROLES=['guest','promoter','prime','leader'];
function appSession(){try{return typeof session!=='undefined'?session:null}catch(e){return null}}
function appUsers(){try{return (typeof users!=='undefined'&&Array.isArray(users))?users:[]}catch(e){return []}}
function isMember(){const s=appSession();return !!(s&&MEMBER_ROLES.includes(String(s.role||''))&&s.id)}
function member(){const s=appSession();if(!s)return null;return appUsers().find(u=>String(u.id||'')===String(s.id||''))||null}
function money(v){return '₹'+Math.round(Number(v||0)).toLocaleString('en-IN')}
function earnings(u,period){try{return typeof combinedEarningsForPeriod==='function'?Number(combinedEarningsForPeriod(u,period)||0):0}catch(e){return 0}}
function openDirect(u){try{if(typeof directBusinessDashboard==='function')return directBusinessDashboard(u.id)}catch(e){}try{window.toast?.('Direct Business is loading. Please try again.')}catch(e){}}
function openDashboard(u){try{if(typeof memberDash==='function')return memberDash(u.id)}catch(e){}try{window.toast?.('Member Dashboard is loading. Please try again.')}catch(e){}}
function visible(el){if(!el)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return !!(r.width||r.height)}
function currentRoot(){const roots=[...document.querySelectorAll('.sectionContent')];return roots.filter(visible).pop()||roots.pop()||null}
function isDashboard(root){if(!root)return false;const t=(root.innerText||'');return /Member Business Dashboard|My Business Dashboard/i.test(t)||!!root.querySelector('button[onclick*="directBusinessDashboard"]')}
function forceNative(root){const native=root?.querySelector('.earnGrid');if(!native)return;native.style.setProperty('display','grid','important');native.style.setProperty('visibility','visible','important');native.style.setProperty('opacity','1','important');native.style.setProperty('height','auto','important');native.style.setProperty('overflow','visible','important')}
function renderGrid(grid,vals){if(!grid)return;grid.innerHTML=[['Today',vals.today],['This Month',vals.month],['This Year',vals.year],['Since Joining',vals.all]].map(([label,val])=>'<div style="display:block;background:#fff;border:1px solid #dfe7f4;border-radius:14px;padding:11px;min-height:78px"><small style="display:block;color:#687386;font-weight:800;font-size:11px">'+label+'</small><b style="display:block;font-size:19px;color:#13213a;margin-top:5px">'+money(val)+'</b><small style="display:block;color:#7b8799;margin-top:3px;font-size:10px">Direct + Downline</small></div>').join('')}
function ensure(){
  if(!isMember()){document.getElementById('dbestMemberEarningsGuaranteed')?.remove();return false}
  const root=currentRoot();if(!root)return false;
  const u=member();if(!u)return false;
  forceNative(root);
  let box=document.getElementById('dbestMemberEarningsGuaranteed');
  if(box&&box.parentElement!==root){box.remove();box=null}
  const vals={today:earnings(u,'today'),month:earnings(u,'month'),year:earnings(u,'year'),all:earnings(u,'all')};
  if(!box){
    box=document.createElement('section');
    box.id='dbestMemberEarningsGuaranteed';
    box.setAttribute('aria-label','Member earnings');
    box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;margin:10px 0 16px;padding:13px;border:1px solid #dbe6ff;border-radius:18px;background:linear-gradient(135deg,#f8fbff,#eef4ff);box-shadow:0 8px 22px rgba(23,92,255,.08);width:100%;position:relative;z-index:3;clear:both';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px"><div><b style="font-size:17px;color:#173a78">💰 My Earnings</b><small style="display:block;color:#687386;margin-top:2px">Live member earnings • Direct + eligible downline</small></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-open-dashboard style="border:0;border-radius:10px;padding:8px 9px;background:#fff;color:#173a78;font-weight:900;border:1px solid #dbe6ff">Dashboard</button><button type="button" data-open-direct style="border:0;border-radius:10px;padding:8px 9px;background:#175cff;color:#fff;font-weight:900">Direct Business</button></div></div><div data-earn-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px"></div>';
    root.prepend(box);
    box.querySelector('[data-open-dashboard]').onclick=()=>openDashboard(u);
    box.querySelector('[data-open-direct]').onclick=()=>openDirect(u);
  }
  box.style.setProperty('display','block','important');
  box.style.setProperty('visibility','visible','important');
  box.style.setProperty('opacity','1','important');
  box.style.setProperty('height','auto','important');
  box.style.setProperty('max-height','none','important');
  box.style.setProperty('overflow','visible','important');
  renderGrid(box.querySelector('[data-earn-grid]'),vals);
  if(isDashboard(root))forceNative(root);
  return true;
}
async function syncAndRefresh(){try{await window.DBEST_TRANSACTION_LEDGER?.syncAll?.(true);await window.DBEST_TRANSACTION_LEDGER?.refreshNetwork?.(true)}catch(e){}ensure()}
function wrapMemberDash(){try{if(typeof memberDash!=='function'||memberDash.__earningsWrapped)return;const raw=memberDash;const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(ensure,0);setTimeout(ensure,80);setTimeout(syncAndRefresh,250);return out};wrapped.__earningsWrapped=true;window.DBEST_ORIGINAL_MEMBER_DASH=raw;memberDash=wrapped}catch(e){}}
function wrapSectionScreen(){try{if(typeof sectionScreen!=='function'||sectionScreen.__earningsWrapped)return;const raw=sectionScreen;const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(ensure,0);setTimeout(ensure,60);return out};wrapped.__earningsWrapped=true;sectionScreen=wrapped}catch(e){}}
function maintain(){wrapMemberDash();wrapSectionScreen();ensure()}
const obs=new MutationObserver(()=>setTimeout(maintain,0));obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(maintain,80),true);
[0,80,250,700,1400,2600].forEach(ms=>setTimeout(()=>{maintain();if(ms===700)syncAndRefresh()},ms));
setInterval(maintain,1000);
window.DBEST_MEMBER_EARNINGS_VISIBLE={version:VERSION,ensure,refresh:syncAndRefresh};
})();
