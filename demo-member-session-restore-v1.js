(function(){
  function restoreDemo(){
    try{
      const qs=new URLSearchParams(location.search);
      const demoId=String(qs.get('demoMember')||'').trim().toUpperCase();
      if(!demoId)return false;
      const raw=localStorage.getItem('dbest_demo_login_member');
      if(!raw)return false;
      const member=JSON.parse(raw||'{}');
      if(!member||String(member.id||'').trim().toUpperCase()!==demoId)return false;
      if(!Array.isArray(window.users) || typeof window.render!=='function')return false;
      const i=window.users.findIndex(x=>String(x&&x.id||'').trim().toUpperCase()===demoId);
      if(i>=0)window.users[i]={...window.users[i],...member}; else window.users.push(member);
      window.session={role:String(member.tier||'guest').toLowerCase(),id:String(member.id||demoId)};
      try{if(typeof window.save==='function')window.save()}catch(_){ }
      try{window.render()}catch(_){ }
      try{if(typeof window.memberDash==='function')window.memberDash(String(member.id||demoId))}catch(_){ }
      document.documentElement.setAttribute('data-dbest-demo-member',demoId);
      return true;
    }catch(e){console.warn('DBest demo restore warning',e);return false}
  }
  let tries=0;
  const t=setInterval(()=>{tries++;if(restoreDemo()||tries>40)clearInterval(t)},150);
  window.addEventListener('load',()=>setTimeout(restoreDemo,50),{once:true});
})();
