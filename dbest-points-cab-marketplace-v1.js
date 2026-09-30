(function(){'use strict';
if(window.__DBEST_POINTS_UI_V3)return;window.__DBEST_POINTS_UI_V3=true;
const V='1.1.0-single-node',C=window.DBEST_RUNTIME_CONFIG||{},B=String(C.supabaseUrl||'').replace(/\/$/,''),K=String(C.supabasePublishableKey||''),API=B+'/functions/v1/dbest-points-live',TK='dbest_member_live_token';if(!B||!K)return;
const token=()=>{try{return localStorage.getItem(TK)||''}catch(_){return''}},role=()=>{try{return String(window.DBEST_SESSION_COMPAT?.read?.().role||window.session?.role||'').toLowerCase()}catch(_){return''}},eligible=()=>['guest','promoter','prime','leader'].includes(role())&&!!token();
const enabled=s=>{try{return localStorage.getItem('dbest_points_use_'+s)==='1'}catch(_){return false}},setEnabled=(s,v)=>{try{localStorage.setItem('dbest_points_use_'+s,v?'1':'0')}catch(_){}};
async function call(action,body={}){if(!eligible())return{eligible:false,balancePoints:0,rupeeValue:0};const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json','x-dbest-member-token':token()},body:JSON.stringify({action,...body})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'points_error');return d}
const status=()=>call('status'),quote=(service,eligibleCharge)=>call('quote',{service,eligibleCharge}),redeem=(service,reference,eligibleCharge,points)=>call('redeem',{service,reference,eligibleCharge,points});
let seq=0,busy=false;
function cleanup(host,service){document.querySelectorAll('.dbestPointsCard,[data-dbest-points-mount]').forEach(n=>{if(!host||!host.contains(n))n.remove()});if(!host)return null;const all=[...host.querySelectorAll('[data-dbest-points-slot="'+service+'"]')];all.slice(1).forEach(n=>n.remove());return all[0]||null}
function html(service,d){const pts=Number(d.balancePoints||0),max=Number(d.maxDiscount||0);return '<label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-dbest-points="'+service+'" '+(enabled(service)?'checked':'')+'><span><b>⭐ DBest Points: '+pts.toLocaleString('en-IN')+'</b><small style="display:block;color:#687386">4 Points = ₹1 • '+(service==='cab'?'Use up to 20% of this ride':'Use against delivery charge only')+(max?' • Up to ₹'+max.toLocaleString('en-IN'):'')+'</small></span></label>'}
async function render(){if(busy)return;busy=true;const my=++seq;try{if(!eligible()){cleanup(null);return}
 for(const service of ['cab','marketplace']){const host=document.querySelector(service==='cab'?'.cab6Confirm':'.checkoutCard');if(!host)continue;
   let slot=cleanup(host,service);if(!slot){slot=document.createElement('div');slot.dataset.dbestPointsSlot=service;slot.className='dbestPointsCard';slot.style.cssText='margin:10px 0;padding:12px;border:1px solid #d8e3ff;border-radius:14px;background:#f6f9ff';const anchor=host.querySelector(service==='cab'?'.cab6Pay':'.orderSummary');anchor?anchor.before(slot):host.appendChild(slot)}
   if(slot.dataset.ready==='1')continue;slot.dataset.ready='loading';
   let charge=0;if(service==='cab')charge=Number((host.querySelector('.cab6Fare strong')?.textContent||'').replace(/[^0-9.]/g,''));else try{charge=Number(window.marketTotals?.(window.marketState?.type||'grocery')?.delivery||0)}catch(_){}
   try{const d=await quote(service,charge);if(my!==seq||!slot.isConnected)continue;slot.innerHTML=html(service,d);slot.dataset.ready='1';const x=slot.querySelector('input[data-dbest-points]');if(x)x.onchange=()=>setEnabled(service,x.checked)}catch(_){slot.remove()}
 }
}finally{busy=false}}
const observer=new MutationObserver(()=>{if(!busy)requestAnimationFrame(render)});observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',render,{once:true});
window.DBEST_POINTS={version:V,eligible,enabled,setEnabled,status,quote,redeem,refresh:render};
})();