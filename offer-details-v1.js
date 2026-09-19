(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
const id=new URLSearchParams(location.search).get('id')||'',card=document.getElementById('offerCard');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dest(o){const t=String(o.destination_type||'home');if(t==='custom')return o.destination_url||'/';return '/?openService='+encodeURIComponent(t)}
async function run(){
 try{
  const r=await fetch(BASE+'/functions/v1/push-notification-live',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'public_offer',id})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'offer_not_found');const o=d.offer||{};
  const expired=o.valid_till&&new Date(o.valid_till+'T23:59:59').getTime()<Date.now();
  card.innerHTML=(o.image_url?'<img class="hero" src="'+esc(o.image_url)+'" alt="DBest offer" style="display:block">':'')+
    '<div class="body"><div class="brand">DBest Special Offer</div><h1 class="title">'+esc(o.title)+'</h1><div class="msg">'+esc(o.body)+'</div>'+
    (o.valid_till?'<div class="valid '+(expired?'expired':'')+'" style="display:block">'+(expired?'Offer expired on ':'Valid till ')+esc(o.valid_till)+'</div>':'')+
    (!expired?'<a class="cta" href="'+esc(dest(o))+'">'+esc(o.cta_text||'View Offer')+'</a>':'')+
    '<a class="home" href="/">← Back to DBest Home</a></div>';
 }catch(e){card.innerHTML='<div class="loading">This offer is unavailable or has expired.<br><br><a href="/">Open DBest Home</a></div>'}
}
run();
})();