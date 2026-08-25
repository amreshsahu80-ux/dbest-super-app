(function(){
'use strict';
const VERSION='1.1.0';
const MEMBER_ROLES=['guest','promoter','prime','leader'];
function appSession(){try{return typeof session!=='undefined'?session:null}catch(e){return null}}
function appUsers(){try{return (typeof users!=='undefined'&&Array.isArray(users))?users:[]}catch(e){return []}}
function isMember(){const s=appSession();return !!(s&&MEMBER_ROLES.includes(String(s.role||''))&&s.id)}
function member(){const s=appSession();if(!s)return null;return appUsers().find(u=>String(u.id||'')===String(s.id||''))||null}
function money(v){return '₹'+Math.round(Number(v||0)).toLocaleString('en-IN')}
function earnings(u,period){try{return typeof combinedEarningsForPeriod==='function'?Number(combinedEarningsForPeriod(u,period)||0):0}catch(e){return 0}}
function openDirect(u){try{if(typeof directBusinessDashboard==='function')return directBusinessDashboard(u.id)}catch(e){}try{window.toast?.('Direct Business is loading. Please try again.')}catch(e){}}
function isDashboard(root){if(!root||!isMember())return false;const t=(root.innerText||'');if(/Member Business Dashboard|My Business Dashboard/i.test(t))return true;if(root.querySelector('button[onclick*="directBusinessDashboard"]'))return true;if(root.querySelector('button[onclick*="memberProfile"]')&&root.querySelector('button[onclick*="memberDash"]'))return true;return false}
function forceNative(root){const native=root?.querySelector('.earnGrid');if(!native)return;native.style.setProperty('display','grid','important');native.style.setProperty('visibility','visible','important');native.style.setProperty('opacity','1','important');native.style.setProperty('height','auto','important');native.style.setProperty('overflow','visible','important')}
function ensure(){
  if(!isMember()){document.getElementById('dbestMemberEarningsGuaranteed')?.remove();return false}
  const roots=[...document.querySelectorAll('.sectionContent')];
  const root=roots.find(isDashboard)||null;
  if(!root)return false;
  const u=member();if(!u)return false;
  forceNative(root);
  let box=document.getElementById('dbestMemberEarningsGuaranteed');
  if(box&&box.parentElement!==root){box.remove();box=null}
  const vals={today:earnings(u,'today'),month:earnings(u,'month'),year:earnings(u,'year'),all:earnings(u,'all')};
  if(!box){
    box=document.createElement('section');
    box.id='dbestMemberEarningsGuaranteed';
    box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;margin:12px 0 16px;padding:14px;border:1px solid #dbe6ff;border-radius:18px;background:linear-gradient(135deg,#f8fbff,#eef4ff);box-shadow:0 8px 22px rgba(23,92,255,.07);width:100%;position:relative;z-index:1';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px"><div><b style="font-size:17px;color:#173a78">💰 My Earnings</b><small style="display:block;color:#687386;margin-top:2px">Direct + eligible downline earnings</small></div><button type="button" data-open-direct style="border:0;border-radius:10px;padding:8px 10px;background:#eaf1ff;color:#175cff;font-weight:900">Direct Business</button></div><div data-earn-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"></div>';
    const anchor=root.querySelector('.memberMiniHead,.sectionHero');
    if(anchor)anchor.insertAdjacentElement('afterend',box);else root.prepend(box);
    box.querySelector('[data-open-direct]').onclick=()=>openDirect(u);
  }
  box.style.setProperty('display','block','important');box.style.setProperty('visibility','visible','important');box.style.setProperty('opacity','1','important');
  const grid=box.querySelector('[data-earn-grid]');
  if(grid)grid.innerHTML=[['Today',vals.today],['This Month',vals.month],['This Year',vals.year],['Since Joining',vals.all]].map(([label,val])=>'<div style="display:block;background:#fff;border:1px solid #dfe7f4;border-radius:14px;padding:12px;min-height:82px"><small style="display:block;color:#687386;font-weight:700">'+label+'</small><b style="display:block;font-size:20px;color:#13213a;margin-top:5px">'+money(val)+'</b><small style="display:block;color:#7b8799;margin-top:3px">Direct + Downline</small></div>').join('');
  return true;
}
async function syncAndRefresh(){try{await window.DBEST_TRANSACTION_LEDGER?.syncAll?.(true);await window.DBEST_TRANSACTION_LEDGER?.refreshNetwork?.(true)}catch(e){}ensure()}
function wrapMemberDash(){try{if(typeof memberDash!=='function'||memberDash.__earningsWrapped)return;const raw=memberDash;const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(ensure,0);setTimeout(ensure,80);setTimeout(syncAndRefresh,250);return out};wrapped.__earningsWrapped=true;window.DBEST_ORIGINAL_MEMBER_DASH=raw;memberDash=wrapped}catch(e){}}
function maintain(){wrapMemberDash();ensure()}
const obs=new MutationObserver(()=>setTimeout(maintain,0));obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(b&&/dashboard|account|profile|transaction|business/i.test(b.textContent||''))setTimeout(()=>{maintain();syncAndRefresh()},100)},true);
[0,100,500,1200,2500].forEach(ms=>setTimeout(()=>{maintain();if(ms===1200)syncAndRefresh()},ms));
setInterval(maintain,1200);
window.DBEST_MEMBER_EARNINGS_VISIBLE={version:VERSION,ensure,refresh:syncAndRefresh};
})();
