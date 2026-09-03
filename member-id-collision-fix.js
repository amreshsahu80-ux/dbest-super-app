(function(){
'use strict';
const VERSION='1.3.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=cfg.supabasePublishableKey||'';
const ALLOC=BASE?BASE+'/functions/v1/allocate-member-id':'';
function localUsers(){try{return typeof users!=='undefined'&&Array.isArray(users)?users:(Array.isArray(window.users)?window.users:[])}catch(e){return Array.isArray(window.users)?window.users:[]}}
function fallbackSuffix(){
  try{
    const a=new Uint32Array(1);crypto.getRandomValues(a);
    const n=1+(a[0]%9999999);
    return String(n).padStart(7,'0');
  }catch(e){return String((Date.now()%9999999)||1).padStart(7,'0')}
}
function fallbackIdentity(tier){
  const isGuest=String(tier||'').toLowerCase()==='guest';
  const taken=new Set(localUsers().map(u=>String(u?.id||'').toUpperCase()));
  for(let tries=0;tries<40;tries++){
    const s=fallbackSuffix(),id=(isGuest?'CU':'PR')+s,ref=isGuest?'':'DB'+s;
    if(!taken.has(id))return {id,ref};
  }
  throw new Error('member_id_allocation_failed');
}
async function allocateIdentity(tier){
  if(!ALLOC||!KEY)return fallbackIdentity(tier);
  try{
    for(let tries=0;tries<5;tries++){
      const r=await fetch(ALLOC,{method:'POST',cache:'no-store',headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({tier:String(tier||'guest').toLowerCase()})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.id)throw new Error(d?.error||'member_id_allocation_failed');
      const id=String(d.id||'').trim().toUpperCase(),ref=String(d.ref||'').trim().toUpperCase();
      if(!/^(PR|CU)\d{7}$/.test(id))throw new Error('invalid_member_id');
      if(ref&&!/^DB\d{7}$/.test(ref))throw new Error('invalid_referral_id');
      const taken=new Set(localUsers().map(u=>String(u?.id||'').toUpperCase()));
      if(!taken.has(id))return {id,ref};
    }
  }catch(e){console.warn('DBest seven-digit member ID allocation fallback',e?.message||e)}
  return fallbackIdentity(tier);
}
function install(){
  const raw=window.regGo;
  if(typeof raw!=='function'||raw.__dbestIdCollisionFixed)return false;
  const wrapped=async function(e,tier){
    const beforeUsers=new Set(localUsers().map(u=>String(u?.id||'')));
    const beforeTx=new Set((typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).map(x=>String(x?.id||'')));
    const out=await raw.apply(this,arguments);
    const list=localUsers();
    const created=[...list].reverse().find(u=>!beforeUsers.has(String(u?.id||'')));
    if(!created)return out;
    const oldId=String(created.id||''),oldRef=String(created.ref||''),fresh=await allocateIdentity(tier);
    created.id=fresh.id;created.ref=fresh.ref;
    try{if(typeof session!=='undefined'&&String(session?.id||'')===oldId)session.id=fresh.id}catch(_){ }
    try{
      if(typeof txs!=='undefined'&&Array.isArray(txs)){
        txs.forEach(x=>{
          if(beforeTx.has(String(x?.id||'')))return;
          if(String(x?.userId||'')===oldId)x.userId=fresh.id;
          if(String(x?.user||'')===oldId)x.user=fresh.id;
        });
      }
    }catch(_){ }
    try{if(typeof save==='function')save()}catch(_){ }
    try{
      document.querySelectorAll('.sectionContent,.sectionOverlay').forEach(root=>root.querySelectorAll('*').forEach(el=>{
        if(el.children.length!==0||typeof el.textContent!=='string')return;
        let t=el.textContent;if(oldId&&t.includes(oldId))t=t.replaceAll(oldId,fresh.id);if(oldRef&&t.includes(oldRef))t=t.replaceAll(oldRef,fresh.ref);el.textContent=t;
      }));
    }catch(_){ }
    return out;
  };
  wrapped.__dbestIdCollisionFixed=true;wrapped.__dbestOriginal=raw;window.regGo=wrapped;return true;
}
[0,50,150,400,900].forEach(ms=>setTimeout(install,ms));
window.DBEST_MEMBER_ID_COLLISION_FIX={version:VERSION,install,allocateIdentity,fallbackIdentity};
})();