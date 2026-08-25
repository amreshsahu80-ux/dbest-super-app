(function(){
'use strict';
const VERSION='1.0.0';
function uniqueSuffix(){
  try{
    const a=new Uint32Array(2);crypto.getRandomValues(a);
    const n=((BigInt(a[0])<<32n)|BigInt(a[1]))%1000000000n;
    return n.toString().padStart(9,'0');
  }catch(e){return String(Date.now()).slice(-7)+String(Math.floor(Math.random()*100)).padStart(2,'0')}
}
function makeIdentity(tier){
  const isGuest=String(tier||'').toLowerCase()==='guest';
  let tries=0,id='',ref='';
  do{
    const s=uniqueSuffix();id=(isGuest?'CU':'PR')+s;ref=isGuest?'':'DB'+s;tries++;
  }while(tries<20&&Array.isArray(window.users||[])&&(window.users||[]).some(u=>String(u?.id||'')===id));
  return {id,ref};
}
function install(){
  const raw=window.regGo;
  if(typeof raw!=='function'||raw.__dbestIdCollisionFixed)return false;
  const wrapped=async function(e,tier){
    const beforeUsers=new Set((Array.isArray(window.users)?window.users:(typeof users!=='undefined'&&Array.isArray(users)?users:[])).map(u=>String(u?.id||'')));
    const beforeTx=new Set((typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).map(x=>String(x?.id||'')));
    const out=await raw.apply(this,arguments);
    let list;try{list=(typeof users!=='undefined'&&Array.isArray(users)?users:window.users||[])}catch(_){list=window.users||[]}
    const created=[...list].reverse().find(u=>!beforeUsers.has(String(u?.id||'')));
    if(!created)return out;
    const oldId=String(created.id||''),oldRef=String(created.ref||'');
    const fresh=makeIdentity(tier);
    created.id=fresh.id;created.ref=fresh.ref;
    try{if(typeof session!=='undefined'&&String(session?.id||'')===oldId)session.id=fresh.id}catch(_){ }
    try{
      if(typeof txs!=='undefined'&&Array.isArray(txs)){
        txs.forEach(x=>{
          if(!beforeTx.has(String(x?.id||''))&&String(x?.userId||'')===oldId)x.userId=fresh.id;
          if(!beforeTx.has(String(x?.id||''))&&String(x?.user||'')===oldId)x.user=fresh.id;
        });
      }
    }catch(_){ }
    try{if(typeof save==='function')save()}catch(_){ }
    try{
      document.querySelectorAll('.sectionContent,.sectionOverlay').forEach(root=>{
        root.querySelectorAll('*').forEach(el=>{
          if(el.children.length===0&&typeof el.textContent==='string'&&el.textContent.includes(oldId))el.textContent=el.textContent.replaceAll(oldId,fresh.id);
          if(oldRef&&el.children.length===0&&typeof el.textContent==='string'&&el.textContent.includes(oldRef))el.textContent=el.textContent.replaceAll(oldRef,fresh.ref);
        });
      });
    }catch(_){ }
    return out;
  };
  wrapped.__dbestIdCollisionFixed=true;wrapped.__dbestOriginal=raw;window.regGo=wrapped;return true;
}
[0,100,300,800,1600].forEach(ms=>setTimeout(install,ms));
window.addEventListener('focus',install);
window.DBEST_MEMBER_ID_COLLISION_FIX={version:VERSION,install,makeIdentity};
})();