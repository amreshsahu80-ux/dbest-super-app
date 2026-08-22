(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const H={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  async function lookup(v){
    const r=await fetch(base+'/functions/v1/member-login-live',{method:'POST',headers:H,body:JSON.stringify({login:String(v||'').trim()})});
    let data={};try{data=await r.json()}catch(e){}
    if(!r.ok){const err=new Error(data.error||'member_lookup_failed');err.status=r.status;throw err}
    return data.member||null;
  }
  function hydrate(u){
    try{
      if(Array.isArray(users)){
        const i=users.findIndex(x=>String(x.id||'')===String(u.id||''));
        if(i>=0)users[i]={...users[i],...u}; else users.push(u);
      }
    }catch(e){}
    return u;
  }
  window.memberGo=async function(e){
    e.preventDefault();
    const form=e.target, btn=form.querySelector('button');
    if(btn){btn.disabled=true;btn.textContent='Checking…';}
    try{
      const v=new FormData(form).get('id');
      const u=hydrate(await lookup(v));
      if(!u){if(typeof toast==='function')toast('Active approved member not found.');return;}
      session={role:u.tier,id:u.id};
      u.lastLoginAt=new Date().toLocaleString('en-IN');
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      if(typeof memberDash==='function')memberDash(u.id);
      if(typeof toast==='function')toast('Login successful');
    }catch(err){
      console.error('DBest live member login',err);
      if(typeof toast==='function')toast(err.status===404?'Active approved member not found.':'Login could not complete. Please retry.');
    } finally {
      if(btn){btn.disabled=false;btn.textContent='Login';}
    }
  };
})();
