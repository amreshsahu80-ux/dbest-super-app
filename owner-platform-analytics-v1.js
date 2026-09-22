(function(){
'use strict';
const VERSION='20260922-owner-analytics-v1';
if(window.DBEST_OWNER_ANALYTICS?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/platform-analytics-live';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function token(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(_){return''}}
async function summary(){
 const t=token();if(!t)throw new Error('Owner login required');
 const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-owner-token':t},body:JSON.stringify({action:'summary'})});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'analytics_unavailable');return d.summary||{};
}
function fmt(n){return Number(n||0).toLocaleString('en-IN')}
async function open(){
 let root='';
 try{
   if(typeof sectionTopBar==='function')root=sectionTopBar('📊 Platform Analytics','Live visitor and usage insights','owner()');
 }catch(_){}
 try{
   if(typeof sectionScreen==='function')sectionScreen((root||'')+'<div class="sectionContent ownerStudio"><div id="dbestAnalyticsBody" class="notice">Loading analytics…</div></div>');
 }catch(_){}
 try{
   const s=await summary(),top=Array.isArray(s.topSections)?s.topSections:[];
   const html='<div class="sectionHero"><b>DBest Platform Analytics</b><small>Tracking started when this analytics layer was activated. Earlier historical visits cannot be reconstructed exactly.</small></div>'+
   '<div class="kpis">'+
    '<div class="kpi"><small>Lifetime Page Views</small><b>'+fmt(s.totalPageViews)+'</b></div>'+
    '<div class="kpi"><small>Unique Browser Visitors</small><b>'+fmt(s.uniqueVisitors)+'</b></div>'+
    '<div class="kpi"><small>Today</small><b>'+fmt(s.todayPageViews)+'</b></div>'+
    '<div class="kpi"><small>This Month</small><b>'+fmt(s.monthPageViews)+'</b></div>'+
    '<div class="kpi"><small>Logged-in Activity</small><b>'+fmt(s.loggedInActivity)+'</b></div>'+
   '</div>'+
   '<div class="ownerPanelCard" style="margin-top:14px"><h3>Top Sections</h3>'+
   (top.length?'<div class="ownerList">'+top.map((x,i)=>'<div class="ownerRow"><div><label>#'+(i+1)+'</label><b>'+esc(x.section_key||'Unknown')+'</b></div><div><label>Views</label><b>'+fmt(x.views)+'</b></div></div>').join('')+'</div>':'<div class="notice">No section activity recorded yet.</div>')+
   '<div class="notice" style="margin-top:12px"><b>Privacy:</b> No precise GPS location or raw IP address is stored. Unique visitor counts are browser-scoped, so one person using multiple browsers/devices may count more than once.</div></div>';
   const el=document.getElementById('dbestAnalyticsBody');if(el){el.className='';el.innerHTML=html}
 }catch(e){
   const el=document.getElementById('dbestAnalyticsBody');if(el)el.innerHTML='<b>Analytics unavailable</b><br><small>'+esc(e.message||e)+'</small>';
 }
}
function inject(){
 try{
  const roots=[...document.querySelectorAll('.sectionContent')],r=roots.find(x=>/Project Owner|Owner Operations|Master Control/i.test(x.innerText||''));
  if(!r||r.querySelector('#dbestOwnerAnalyticsButton'))return;
  const b=document.createElement('button');b.id='dbestOwnerAnalyticsButton';b.className='ownerControl';b.innerHTML='<span>📊</span><b>Platform Analytics</b><small>Lifetime visits, unique visitors, today/month traffic and top sections.</small>';b.onclick=open;
  const holder=r.querySelector('.ownerControlGrid,.subs,.cards');if(holder)holder.prepend(b);else r.prepend(b);
 }catch(_){}
}
new MutationObserver(()=>setTimeout(inject,50)).observe(document.documentElement,{childList:true,subtree:true});
[100,500,1200,2500].forEach(ms=>setTimeout(inject,ms));
window.DBEST_OWNER_ANALYTICS={version:VERSION,open,summary,inject};
})();