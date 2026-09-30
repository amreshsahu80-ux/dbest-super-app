(function(){'use strict';const V='1.0.2-loyalty-singleflight',C=window.DBEST_RUNTIME_CONFIG||{},B=String(C.supabaseUrl||'').replace(/\/$/,''),K=String(C.supabasePublishableKey||''),API=B+'/functions/v1/dbest-points-live',TK='dbest_member_live_token';if(!B||!K)return;
function token(){try{return localStorage.getItem(TK)||''}catch(_){return''}}function role(){try{return String(window.DBEST_SESSION_COMPAT?.read?.().role||window.session?.role||'').toLowerCase()}catch(_){return''}}function eligible(){return ['guest','promoter','prime','leader'].includes(role())&&!!token()}function enabled(s){try{return localStorage.getItem('dbest_points_use_'+s)==='1'}catch(_){return false}}function setEnabled(s,v){try{localStorage.setItem('dbest_points_use_'+s,v?'1':'0')}catch(_){}}
async function call(action,body={}){if(!eligible())return {eligible:false,balancePoints:0,rupeeValue:0};const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json','x-dbest-member-token':token()},body:JSON.stringify({action,...body})}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'points_error');return d}
async function status(){return call('status')}async function quote(service,eligibleCharge){return call('quote',{service,eligibleCharge})}async function redeem(service,reference,eligibleCharge,points){return call('redeem',{service,reference,eligibleCharge,points})}
function card(service,d){const max=Number(d.maxDiscount||0),pts=Number(d.balancePoints||0);return '<div class="dbestPointsCard" style="margin:10px 0;padding:12px;border:1px solid #d8e3ff;border-radius:14px;background:#f6f9ff"><label style="display:flex;gap:9px;align-items:center"><input type="checkbox" data-dbest-points="'+service+'" '+(enabled(service)?'checked':'')+'><span><b>⭐ Loyalty Points: '+pts.toLocaleString('en-IN')+'</b><small style="display:block;color:#687386">4 Points = ₹1 • '+(service==='cab'?'Use up to 20% of this ride':'Use against delivery charge only')+(max?' • Up to ₹'+max.toLocaleString('en-IN'):'')+'</small></span></label></div>'}
let decorating=false,cabFlight=false,marketFlight=false;
async function decorate(){
 if(decorating)return;decorating=true;
 try{
  if(!eligible()){document.querySelectorAll('.dbestPointsCard').forEach(x=>x.remove());return}
  const cab=document.querySelector('.cab6Confirm');
  if(cab){
   const cards=[...cab.querySelectorAll('.dbestPointsCard')];cards.slice(1).forEach(x=>x.remove());
   if(!cards[0]&&!cabFlight){
    cabFlight=true;
    const fare=Number((cab.querySelector('.cab6Fare strong')?.textContent||'').replace(/[^0-9.]/g,''));
    try{
     const d=await quote('cab',fare);
     if(document.contains(cab)&&!cab.querySelector('.dbestPointsCard')){
      const pay=cab.querySelector('.cab6Pay');if(pay)pay.insertAdjacentHTML('beforebegin',card('cab',d));
     }
    }catch(_){}finally{cabFlight=false}
   }
  }
  const m=document.querySelector('.checkoutCard');
  if(m){
   const cards=[...m.querySelectorAll('.dbestPointsCard')];cards.slice(1).forEach(x=>x.remove());
   if(!cards[0]&&!marketFlight){
    marketFlight=true;let fee=0;
    try{const type=window.marketState?.type||'grocery';fee=Number(window.marketTotals?.(type)?.delivery||0)}catch(_){}
    try{
     const d=await quote('marketplace',fee);
     if(document.contains(m)&&!m.querySelector('.dbestPointsCard')){
      const os=m.querySelector('.orderSummary');if(os)os.insertAdjacentHTML('beforebegin',card('marketplace',d));
     }
    }catch(_){}finally{marketFlight=false}
   }
  }
  document.querySelectorAll('input[data-dbest-points]').forEach(x=>{if(x.dataset.bound)return;x.dataset.bound='1';x.onchange=()=>setEnabled(x.dataset.dbestPoints,x.checked)})
 }finally{decorating=false}
}
new MutationObserver(()=>requestAnimationFrame(decorate)).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',decorate,{once:true});window.DBEST_POINTS={version:V,eligible,enabled,setEnabled,status,quote,redeem,refresh:decorate};})();