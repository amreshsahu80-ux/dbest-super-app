(function(){
'use strict';
const VERSION='20260930-session-stable-v2';
if(window.DBEST_SESSION_COMPAT?.version===VERSION)return;
const KEY='d2_session';
function read(){
  try{
    const s=JSON.parse(localStorage.getItem(KEY)||'{"role":"visitor","id":""}');
    if(!s||typeof s!=='object')return {role:'visitor',id:''};
    return {role:String(s.role||'visitor').toLowerCase(),id:String(s.id||'')};
  }catch(_){return {role:'visitor',id:''}}
}
let last='';
function sync(){
  const s=read(),sig=s.role+'|'+s.id;
  if(sig!==last){
    last=sig;
    try{window.session={...s}}catch(_){}
    try{document.documentElement.dataset.dbestMemberRole=s.role;document.documentElement.dataset.dbestMemberId=s.id}catch(_){}
    try{window.dispatchEvent(new CustomEvent('dbest:session-sync',{detail:{...s}}))}catch(_){}
  }else{
    try{
      if(!window.session||String(window.session.role||'').toLowerCase()!==s.role||String(window.session.id||'')!==s.id)window.session={...s};
    }catch(_){}
  }
  return s;
}
window.addEventListener('storage',e=>{if(e.key===KEY)sync()});
window.addEventListener('pageshow',sync);
window.addEventListener('focus',sync);
sync();
window.DBEST_SESSION_COMPAT={version:VERSION,read,sync,isMember:()=>{const s=read();return ['starter','guest','promoter','prime','leader'].includes(s.role)&&!!s.id},isLeader:()=>{const s=read();return s.role==='leader'&&!!s.id}};
})();