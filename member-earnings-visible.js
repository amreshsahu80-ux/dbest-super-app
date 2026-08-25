(function(){
'use strict';
const VERSION='1.0.0';
const MEMBER_ROLES=['guest','promoter','prime','leader'];
function isMember(){try{return MEMBER_ROLES.includes(String(window.session?.role||''))&&!!window.session?.id}catch(e){return false}}
function member(){try{return Array.isArray(window.users)?window.users.find(u=>String(u.id||'')===String(window.session?.id||'')):null}catch(e){return null}}
function money(v){return '₹'+Math.round(Number(v||0)).toLocaleString('en-IN')}
function earnings(u,period){try{return Number(window.combinedEarningsForPeriod?.(u,period)||0)}catch(e){return 0}}
function isDashboard(root){if(!root||!isMember())return false;const t=(root.innerText||'');if(/Member Business Dashboard|My Business Dashboard/i.test(t))return true;if(root.querySelector('button[onclick*="directBusinessDashboard"]'))return true;if(root.querySelector('button[onclick*="memberProfile"]')&&root.querySelector('button[onclick*="memberDash"]'))return true;return false}
function ensure(){
  if(!isMember()){document.getElementById('dbestMemberEarningsGuaranteed')?.remove();return false}
  const root=document.querySelector('.sectionContent');
  if(!isDashboard(root))return false;
  const u=member();if(!u)return false;
  let box=document.getElementById('dbestMemberEarningsGuaranteed');
  if(box&&box.parentElement!==root){box.remove();box=null}
  const vals={today:earnings(u,'today'),month:earnings(u,'month'),year:earnings(u,'year'),all:earnings(u,'all')};
  if(!box){
    box=document.createElement('section');
    box.id='dbestMemberEarningsGuaranteed';
    box.style.cssText='margin:12px 0 16px;padding:14px;border:1px solid #dbe6ff;border-radius:18px;background:linear-gradient(135deg,#f8fbff,#eef4ff);box-shadow:0 8px 22px rgba(23,92,255,.07)';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px"><div><b style="font-size:17px;color:#173a78">💰 My Earnings</b><small style="display:block;color:#687386;margin-top:2px">Direct + eligible downline earnings</small></div><button type="button" data-open-direct style="border:0;border-radius:10px;padding:8px 10px;background:#eaf1ff;color:#175cff;font-weight:900">Direct Business</button></div><div data-earn-grid style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"></div>';
    const anchor=root.querySelector('.memberMiniHead,.sectionHero');
    if(anchor?.nextSibling)root.insertBefore(box,anchor.nextSibling);else root.prepend(box);
    box.querySelector('[data-open-direct]').onclick=()=>{try{window.directBusinessDashboard?.(u.id)}catch(e){}};
  }
  const grid=box.querySelector('[data-earn-grid]');
  if(grid)grid.innerHTML=[['Today',vals.today],['This Month',vals.month],['This Year',vals.year],['Since Joining',vals.all]].map(([label,val])=>'<div style="background:#fff;border:1px solid #dfe7f4;border-radius:14px;padding:12px;min-height:82px"><small style="display:block;color:#687386;font-weight:700">'+label+'</small><b style="display:block;font-size:20px;color:#13213a;margin-top:5px">'+money(val)+'</b><small style="display:block;color:#7b8799;margin-top:3px">Direct + Downline</small></div>').join('');
  const native=root.querySelector('.earnGrid');
  if(native){native.style.setProperty('display','grid','important');native.style.setProperty('visibility','visible','important');native.style.setProperty('opacity','1','important')}
  return true;
}
async function syncAndRefresh(){try{await window.DBEST_TRANSACTION_LEDGER?.syncAll?.(true);await window.DBEST_TRANSACTION_LEDGER?.refreshNetwork?.(true)}catch(e){}ensure()}
const obs=new MutationObserver(()=>setTimeout(ensure,0));obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(b&&/dashboard|account|profile|transaction|business/i.test(b.textContent||''))setTimeout(()=>{ensure();syncAndRefresh()},100)},true);
[100,500,1200,2500].forEach(ms=>setTimeout(()=>{ensure();if(ms===1200)syncAndRefresh()},ms));
setInterval(ensure,1200);
window.DBEST_MEMBER_EARNINGS_VISIBLE={version:VERSION,ensure,refresh:syncAndRefresh};
})();
