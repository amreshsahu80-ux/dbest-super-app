(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const H={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  const TOKEN_KEY='dbest_member_live_token';

  async function lookup(v){
    const r=await fetch(base+'/functions/v1/member-login-live',{method:'POST',headers:H,body:JSON.stringify({login:String(v||'').trim()})});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const err=new Error(data.error||'member_lookup_failed');err.status=r.status;throw err}
    if(data.token){try{localStorage.setItem(TOKEN_KEY,String(data.token))}catch(e){}}
    return data;
  }
  function upsertUser(u){
    if(!u)return null;
    try{
      if(Array.isArray(users)){
        const i=users.findIndex(x=>String(x.id||'')===String(u.id||''));
        if(i>=0)users[i]={...users[i],...u}; else users.push(u);
      }
    }catch(e){}
    return u;
  }
  function hydrateNetwork(data){
    const network=Array.isArray(data?.network)?data.network:[];
    network.forEach(upsertUser);
    try{
      if(Array.isArray(txs)&&Array.isArray(data?.transactions)){
        const seen=new Set(txs.map(x=>String(x.id||'')));
        for(const x of data.transactions){if(!seen.has(String(x.id||''))){txs.push(x);seen.add(String(x.id||''));}}
        txs.sort((a,b)=>new Date(b.createdISO||b.created||0)-new Date(a.createdISO||a.created||0));
      }
    }catch(e){}
    return upsertUser(data?.member||null);
  }
  window.DBEST_MEMBER_LIVE={
    getToken:()=>{try{return localStorage.getItem(TOKEN_KEY)||''}catch(e){return''}},
    clear:()=>{try{localStorage.removeItem(TOKEN_KEY)}catch(e){}},
    hydrateNetwork
  };
  window.memberGo=async function(e){
    e.preventDefault();
    const form=e.target, btn=form.querySelector('button');
    if(btn){btn.disabled=true;btn.textContent='Checking…';}
    try{
      const v=new FormData(form).get('id');
      const data=await lookup(v);
      const u=hydrateNetwork(data);
      if(!u){if(typeof toast==='function')toast('Active approved member not found.');return;}
      session={role:u.tier,id:u.id};
      u.lastLoginAt=new Date().toLocaleString('en-IN');
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      if(typeof memberDash==='function')memberDash(u.id);
      if(typeof toast==='function')toast('Login successful — live branch hierarchy loaded');
    }catch(err){
      console.error('DBest live member login',err);
      if(typeof toast==='function')toast(err.status===404?'Active approved member not found.':'Login could not complete. Please retry.');
    } finally {
      if(btn){btn.disabled=false;btn.textContent='Login';}
    }
  };
})();
