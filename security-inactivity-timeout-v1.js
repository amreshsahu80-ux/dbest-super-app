(function(){
  'use strict';
  var TIMEOUT_MS=5*60*1000;
  var WARNING_MS=4*60*1000;
  var lastActivity=Date.now();
  var warned=false;
  var busy=false;
  var appLogout=typeof window.logout==='function'?window.logout:null;

  function dbestSession(){
    try{return JSON.parse(localStorage.getItem('d2_session')||'null')||null}catch(e){return null}
  }
  function hasLogin(){
    try{
      var d=dbestSession();
      if(d&&d.id&&['guest','promoter','prime','leader','admin','owner'].indexOf(String(d.role||''))>=0)return true;
      if(window.currentUser||window.currentMember||window.loggedInUser||window.ownerSession||window.vendorSession||window.vaahakSession)return true;
      var keys=['dbest_user','dbestUser','dbest_member','dbestMember','currentUser','loggedInUser','ownerSession','vendorSession','vaahakSession','sb-access-token','supabase.auth.token'];
      for(var i=0;i<keys.length;i++)if(localStorage.getItem(keys[i])||sessionStorage.getItem(keys[i]))return true;
    }catch(e){}
    return false;
  }
  function reset(){lastActivity=Date.now();warned=false;try{document.getElementById('dbestIdleWarning')?.remove()}catch(e){}}
  ['pointerdown','mousedown','keydown','touchstart','scroll','wheel'].forEach(function(ev){document.addEventListener(ev,reset,{passive:true,capture:true})});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});

  function clearSecuritySessions(){
    try{
      localStorage.setItem('d2_session',JSON.stringify({role:'visitor',id:''}));
      sessionStorage.removeItem('dbest_ai_pending_external_v1');
      sessionStorage.removeItem('dbest_ai_pending_task_v1');
      ['dbest_user','dbestUser','dbest_member','dbestMember','currentUser','loggedInUser','ownerSession','vendorSession','vaahakSession'].forEach(function(k){try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}});
      for(var i=localStorage.length-1;i>=0;i--){var k=String(localStorage.key(i)||''),low=k.toLowerCase();if(low.indexOf('supabase')>=0&&(low.indexOf('auth')>=0||low.indexOf('token')>=0||low.indexOf('session')>=0))try{localStorage.removeItem(k)}catch(e){}}
      for(var j=sessionStorage.length-1;j>=0;j--){var sk=String(sessionStorage.key(j)||''),slow=sk.toLowerCase();if(slow.indexOf('supabase')>=0&&(slow.indexOf('auth')>=0||slow.indexOf('token')>=0||slow.indexOf('session')>=0))try{sessionStorage.removeItem(sk)}catch(e){}}
    }catch(e){}
  }
  function remoteSignOut(){
    try{
      var sb=window.supabaseClient||window.supabase||window.sb;
      if(sb&&sb.auth&&typeof sb.auth.signOut==='function'){
        Promise.race([Promise.resolve(sb.auth.signOut()),new Promise(function(resolve){setTimeout(resolve,1500)})]).catch(function(){});
      }
    }catch(e){}
  }
  function localLogoutNow(){
    try{if(typeof appLogout==='function')appLogout.call(window);else if(typeof window.logout==='function')window.logout()}catch(e){}
    try{if(typeof window.doLogout==='function')window.doLogout()}catch(e){}
    clearSecuritySessions();
    try{window.__DBEST_AI_FORCE_HIDDEN__=true;var h=document.getElementById('dbest-ai-test-host');if(h)h.style.display='none'}catch(e){}
  }
  function redirectAfterLogout(){
    var path=(location.pathname||'/').toLowerCase();
    if(path.indexOf('/vaahak')===0)location.replace('/Vaahak/?reason=inactive');
    else if(path.indexOf('/owner')===0)location.replace('/owner?reason=inactive');
    else if(path.indexOf('/superadmin')===0)location.replace('/SuperAdmin?reason=inactive');
    else if(path.indexOf('/servicepartner')===0)location.replace('/ServicePartner?reason=inactive');
    else location.replace('/?reason=inactive');
  }
  function logout(){
    if(busy)return;
    busy=true;
    localLogoutNow();
    remoteSignOut();
    try{sessionStorage.setItem('dbest_inactivity_logout','1')}catch(e){}
    setTimeout(redirectAfterLogout,80);
  }
  function check(){
    if(!hasLogin()){lastActivity=Date.now();warned=false;return}
    var idle=Date.now()-lastActivity;
    if(idle>=TIMEOUT_MS){logout();return}
    if(idle>=WARNING_MS&&!warned){
      warned=true;
      try{
        var d=document.createElement('div');d.id='dbestIdleWarning';d.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;background:#172033;color:#fff;padding:10px 14px;border-radius:12px;font:600 13px system-ui;box-shadow:0 8px 28px #0004';d.textContent='For your security, you will be logged out after 5 minutes of inactivity. Tap or press any key to stay signed in.';document.body.appendChild(d);setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},12000)
      }catch(e){}
    }
  }
  setInterval(check,5000);
  window.DBEST_SECURITY={inactivityTimeoutMinutes:5,resetActivity:reset,logoutForInactivity:logout,version:'2.0-immediate-local-logout'};

  try{
    var controlPortal=/^\/(owner|superadmin|servicepartner)(?:\/|$)/i.test(location.pathname||'');
    if(controlPortal){try{sessionStorage.setItem('dbest_external_handoff_until',String(Date.now()+24*60*60*1000));sessionStorage.removeItem('dbest_screen_snapshot_v1');sessionStorage.removeItem('dbest_screen_stack_v1')}catch(_){}}
    if(!document.querySelector('script[data-dbest-platform-ux]')){var s=document.createElement('script');s.src='./platform-navigation-camera-upi-v1.js?v=20260902-owner-route-v2';s.setAttribute('data-dbest-platform-ux','1');(document.body||document.documentElement).appendChild(s)}
    if(!document.querySelector('script[data-dbest-internal-upi]')){var p=document.createElement('script');p.src='./internal-upi-payments-v1.js?v=20260830-2324';p.setAttribute('data-dbest-internal-upi','1');(document.body||document.documentElement).appendChild(p)}
    if(!document.querySelector('script[data-dbest-platform-compat]')){var c=document.createElement('script');c.src='./platform-device-location-hardening-v1.js?v=20260907-light-observer-v2';c.setAttribute('data-dbest-platform-compat','1');(document.body||document.documentElement).appendChild(c)}
    if(!document.querySelector('script[data-dbest-member-registration-authority]')){var ra=document.createElement('script');ra.src='./member-registration-authority-v1.js?v=20260906-member-registration-authority-v3-direct';ra.setAttribute('data-dbest-member-registration-authority','1');(document.body||document.documentElement).appendChild(ra)}
    if(!document.querySelector('script[data-dbest-final-ui-authority]')){var fa=document.createElement('script');fa.src='./dbest-final-ui-authority-v1.js?v=20260906-final-ui-authority-v1.2-i18n';fa.setAttribute('data-dbest-final-ui-authority','1');(document.body||document.documentElement).appendChild(fa)}
    if(!document.querySelector('script[data-dbest-membership-modal-nav]')){var mn=document.createElement('script');mn.src='./membership-modal-navigation-fix-v1.js?v=20260906-membership-modal-navigation-v2-selectsafe';mn.setAttribute('data-dbest-membership-modal-nav','1');(document.body||document.documentElement).appendChild(mn)}
    if(!document.querySelector('script[data-dbest-cab-entry-capture]')){var ce=document.createElement('script');ce.src='./cab-entry-capture-final-v1.js?v=20260907-cab-entry-lazy-v2';ce.setAttribute('data-dbest-cab-entry-capture','1');(document.body||document.documentElement).appendChild(ce)}
    try{document.getElementById('dbestMembershipPlanModal')?.remove()}catch(_){ }
  }catch(e){console.warn('DBest enhancement loader',e)}
})();