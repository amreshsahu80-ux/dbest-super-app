(function(){
'use strict';
const VERSION='1.1.0';
function localUsers(){try{return typeof users!=='undefined'&&Array.isArray(users)?users:(Array.isArray(window.users)?window.users:[])}catch(e){return Array.isArray(window.users)?window.users:[]}}
function uniqueSuffix(){
  try{
    const a=new Uint32Array(2);crypto.getRandomValues(a);
    const n=((BigInt(a[0])<<32n)|BigInt(a[1]))%1000000000n;
    return n.toString().padStart(9,'0');
  }catch(e){return String(Date.now()).slice(-7)+String(Math.floor(Math.random()*100)).padStart(2,'0')}
}
function makeIdentity(tier){
  const isGuest=String(tier||'').toLowerCase()==='guest';
  const taken=new Set(localUsers().map(u=>String(u?.id||'')));
  let id='',ref='';
  for(let tries=0;tries<30;tries++){
    const s=uniqueSuffix();id=(isGuest?'CU':'PR')+s;ref=isGuest?'':'DB'+s;
    if(!taken.has(id))return {id,ref};
  }
  const s=String(Date.now());return {id:(isGuest?'CU':'PR')+s,ref:isGuest?'':'DB'+s};
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
    const oldId=String(created.id||''),oldRef=String(created.ref||''),fresh=makeIdentity(tier);
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
window.DBEST_MEMBER_ID_COLLISION_FIX={version:VERSION,install,makeIdentity};
})();