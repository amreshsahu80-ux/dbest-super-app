(function(){
  const qs=new URLSearchParams(location.search);
  const demoId=String(qs.get('demoMember')||'').trim().toUpperCase();
  if(!/^DM(?:GUEST|PROMO|PRIME|LEADER)01$/.test(demoId)) return;

  function readMember(){
    try{
      const raw=localStorage.getItem('dbest_demo_login_member');
      const m=raw?JSON.parse(raw):null;
      return m&&String(m.id||'').toUpperCase()===demoId?m:null;
    }catch(_){return null}
  }

  let tries=0;
  const timer=setInterval(function(){
    tries++;
    const m=readMember();
    if(!m){if(tries>80)clearInterval(timer);return}
    try{
      if(typeof users==='undefined'||!Array.isArray(users)||typeof session==='undefined'){
        if(tries>80)clearInterval(timer);return;
      }
      const i=users.findIndex(function(x){return String(x&&x.id||'').toUpperCase()===demoId});
      if(i>=0) users[i]=Object.assign({},users[i],m,{status:'Active'});
      else users.push(Object.assign({},m,{status:'Active'}));
      session={role:String(m.tier||'guest').toLowerCase(),id:String(m.id||demoId)};
      try{if(typeof save==='function')save()}catch(_){}
      try{if(typeof render==='function')render()}catch(_){}
      setTimeout(function(){try{if(typeof memberDash==='function')memberDash(String(m.id||demoId))}catch(_){}},100);
      clearInterval(timer);
    }catch(_){if(tries>80)clearInterval(timer)}
  },100);
})();
