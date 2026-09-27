(function(){
'use strict';
const VERSION='20260927-starter-v1';
function sess(){try{return JSON.parse(localStorage.getItem('d2_session')||'{}')}catch(_){return{}}}
function isStarter(){return String(sess().role||'').toLowerCase()==='starter'&&!!sess().id}
function member(id){try{return (window.users||users||[]).find(x=>String(x.id||'')===String(id||sess().id))||null}catch(_){return null}}
function escx(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderStarter(id){
 const u=member(id);if(!u)return;
 const tx=(()=>{try{return (window.txs||txs||[]).filter(x=>String(x.userId||'')===String(u.id))}catch(_){return[]}})();
 const txhtml=tx.length?'<div class="table"><table><tr><th>Transaction</th><th>Service</th><th>Amount</th><th>Status</th></tr>'+tx.slice(0,20).map(x=>'<tr><td>'+escx(x.id||'')+'</td><td>'+escx(x.section||'')+'</td><td>'+(Number(x.amount||0)?'₹'+Number(x.amount).toLocaleString('en-IN'):'—')+'</td><td>'+escx(x.status||'')+'</td></tr>').join('')+'</table></div>':'<div class="notice">No transactions yet.</div>';
 const top=typeof sectionTopBar==='function'?sectionTopBar('🌱 '+escx(u.name||'Starter'),escx(u.id||'')+' • Starter • FREE','backHome()'):'';
 if(typeof sectionScreen==='function')sectionScreen(top+'<div class="sectionContent classicDash"><div class="memberMiniHead"><div><b>Starter Dashboard</b><small>'+escx(u.name||'')+' • '+escx(u.id||'')+'</small></div><span class="memberStatus">FREE</span></div><div class="notice" style="background:linear-gradient(135deg,#eaf9ef,#f7fff9);border-color:#bfe6cc;color:#17623a"><b>DBest Starter</b><br>Enjoy DBest services and attractive platform rates. Starter has no wallet, cashback, referral income, team earnings or payouts.</div><div class="subs"><button class="sub" onclick="memberProfile(\''+escx(u.id)+'\')"><b>👤 My Profile</b><small>Contact and membership details</small></button><button class="sub" onclick="card(\''+escx(u.id)+'\')"><b>🪪 Starter ID Card</b><small>View / Print your DBest ID</small></button><button class="sub" onclick="location.href=\'/membership-choose.html\'"><b>⬆️ Upgrade Membership</b><small>Guest • Promoter • Prime • Leader</small></button><button class="sub" onclick="backHome()"><b>🧩 Explore All Services</b><small>Use DBest platform rates</small></button></div><h3>My Transactions</h3>'+txhtml+'</div>');
}
let rawDash=null,rawVisible=null;
function install(){
 try{
  if(typeof memberDash==='function'&&!memberDash.__starterWrapped){
   rawDash=memberDash;
   const w=function(id){const u=member(id);if(u&&String(u.tier||'').toLowerCase()==='starter')return renderStarter(id);return rawDash.apply(this,arguments)};
   w.__starterWrapped=true;memberDash=w;
  }
 }catch(_){}
 try{
  if(typeof serviceVisible==='function'&&!serviceVisible.__starterWrapped){
   rawVisible=serviceVisible;
   const w=function(id){if(isStarter()&&String(id)==='wallet')return false;return rawVisible.apply(this,arguments)};
   w.__starterWrapped=true;serviceVisible=w;
  }
 }catch(_){}
 try{
  if(isStarter()){
   document.querySelectorAll('#dbestWalletSummaryBtn,[data-wallet],button[onclick*="wallet"],button[onclick*="payout"]').forEach(e=>{if(/wallet|payout|earn/i.test(String(e.textContent||'')))e.style.display='none'});
  }
 }catch(_){}
}
new MutationObserver(()=>setTimeout(install,0)).observe(document.documentElement,{childList:true,subtree:true});
[0,100,500,1200,2500].forEach(ms=>setTimeout(install,ms));
setInterval(install,1800);
window.DBEST_STARTER_MEMBER={version:VERSION,isStarter,render:renderStarter};
})();