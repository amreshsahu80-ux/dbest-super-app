(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{}; const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  let loading=false,lastLoaded=0;
  function token(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}}
  function isOwner(){try{return typeof session!=='undefined'&&session&&session.role==='owner'}catch(e){return false}}
  async function load(force=false){
    if(!isOwner()||loading)return false;
    if(!force&&Date.now()-lastLoaded<10000)return true;
    const t=token(); if(!t)return false;
    loading=true;
    try{
      const r=await fetch(base+'/functions/v1/owner-live-network',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','x-dbest-owner-token':t},body:'{}'});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'owner_live_network_failed');
      if(Array.isArray(d.members)&&typeof users!=='undefined'&&Array.isArray(users)){
        const byId=new Map(users.map(x=>[String(x.id||''),x]));
        d.members.forEach(m=>{const id=String(m.id||'');if(!id)return;if(byId.has(id))Object.assign(byId.get(id),m);else{users.push(m);byId.set(id,m)}});
      }
      if(Array.isArray(d.transactions)&&typeof txs!=='undefined'&&Array.isArray(txs)){
        const byId=new Map(txs.map(x=>[String(x.id||''),x]));
        d.transactions.forEach(t=>{const id=String(t.id||'');if(!id)return;if(byId.has(id))Object.assign(byId.get(id),t);else{txs.push(t);byId.set(id,t)}});
        txs.sort((a,b)=>new Date(b.createdISO||b.created||0)-new Date(a.createdISO||a.created||0));
      }
      lastLoaded=Date.now(); if(typeof save==='function')save(); return true;
    }catch(e){console.warn('DBest owner live network',e);return false}finally{loading=false}
  }
  function wrap(name){const fn=window[name];if(typeof fn!=='function'||fn.__dbestLiveWrapped)return;const w=async function(...args){await load(true);return fn.apply(this,args)};w.__dbestLiveWrapped=true;window[name]=w;}
  ['owner','ownerOperations','ownerMemberOnboarding','ownerTransactions','ownerNetwork'].forEach(wrap);
  document.addEventListener('click',e=>{if(!isOwner())return;const t=(e.target.closest?.('button')?.innerText||'').toLowerCase();if(/member|hierarchy|branch|transaction|owner operations|master control/.test(t))load(true);},true);
  window.DBEST_OWNER_LIVE_NETWORK={load};
  setTimeout(()=>{if(isOwner())load(true)},500);
})();