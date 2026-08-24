(function(){
'use strict';
const VERSION='1.0.0';
const OWNER_PATH=/^\/owner\/?$/i.test(location.pathname);
let autoOpened=false;
function renderOwnerLogin(){
  if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return;
  const back=OWNER_PATH?"location.href='/'":"loginChoice()";
  sectionScreen(`${sectionTopBar('👑 Project Owner Login','Private Owner portal • Secure email OTP',back)}
    <div class="sectionContent"><div class="sectionHero"><b>Owner Access</b><small>Enter the authorized Owner email to request a secure 6-digit OTP.</small></div>
    <div class="notice" style="margin-bottom:12px">For security, the authorized Owner email is never displayed or pre-filled on this page.</div>
    <form class="form" autocomplete="off" onsubmit="ownerGo(event)">
      <div class="f full"><label>Owner Email</label><input name="u" type="email" value="" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Enter Owner email" required></div>
      <div class="f full"><button class="btn" type="submit">Send Secure OTP</button></div>
    </form></div>`);
}
function installOwnerLogin(){
  const fn=function(){
    if(!OWNER_PATH){location.assign('/owner');return;}
    renderOwnerLogin();
  };
  fn.__dbestOwnerRoute=true;
  window.ownerLogin=fn;
}
function hidePublicOwnerEntry(){
  if(OWNER_PATH)return;
  document.querySelectorAll('button[onclick="ownerLogin()"],button[onclick*="ownerLogin("]').forEach(b=>b.remove());
  document.querySelectorAll('.notice').forEach(n=>{if(/Project Owner are login-only|Project Owner.*login-only/i.test(n.textContent||''))n.textContent=(n.textContent||'').replace(/\s*and Project Owner are login-only controlled roles\.?/i,'.').replace(/Project Owner.*$/i,'');});
}
function wrapLoginChoice(){
  if(OWNER_PATH)return;
  const raw=window.loginChoice;
  if(typeof raw!=='function'||raw.__dbestNoOwnerEntry)return;
  const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(hidePublicOwnerEntry,0);return out};
  wrapped.__dbestNoOwnerEntry=true;
  window.loginChoice=wrapped;
}
function boot(){
  installOwnerLogin();
  wrapLoginChoice();
  hidePublicOwnerEntry();
  if(OWNER_PATH&&!autoOpened&&typeof sectionScreen==='function'){
    autoOpened=true;
    setTimeout(()=>window.ownerLogin(),30);
  }
}
const mo=new MutationObserver(()=>{boot();hidePublicOwnerEntry()});
mo.observe(document.documentElement,{childList:true,subtree:true});
[0,120,450,1200].forEach(ms=>setTimeout(boot,ms));
window.DBEST_OWNER_PORTAL_ROUTE={version:VERSION,isOwnerPath:OWNER_PATH,open:()=>location.assign('/owner')};
})();
