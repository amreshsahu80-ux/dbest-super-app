(() => {
  'use strict';
  const VERSION='1.1-member-only-direct-partner-live';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  const EXTERNAL=new Set(['insurance','travel','flights','mf']);
  const SAFE_KEYS=new Set(['from','origin','fromCity','pickup','to','destination','destinations','drop','departure','departureDate','return','returnDate','date','startDate','checkin','checkout','adults','children','infants','rooms','budget','sumInsured','coverAmount','insuranceType','amount','investmentType','frequency','risk','goal','hotel','category','meal','transport','cabin','airline','pincode']);
  const realFetch=window.fetch.bind(window);
  let previousMemberId='';

  function getSession(){
    try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{};}catch{return{};}
  }
  function memberSession(){
    const s=getSession();
    return s&&s.id&&MEMBER_ROLES.has(String(s.role||''))?s:null;
  }
  function activeMember(){return !!memberSession();}
  function serviceId(route){if(route==='insurance')return'insurance';if(route==='mf')return'mf';if(route==='travel'||route==='flights')return'flights';return route;}
  function first(d,names){for(const n of names){const v=d?.[n];if(v!==undefined&&v!==null&&v!=='')return String(v)}return''}
  function safeTaskData(v){const out={};if(!v||typeof v!=='object')return out;for(const [k,val] of Object.entries(v)){if(!SAFE_KEYS.has(k)||val===undefined||val===null||val==='')continue;out[k]=typeof val==='string'?val.slice(0,220):val}return out}
  function applyPlaceholders(url,data){
    const d=safeTaskData(data?.taskData||{});
    const values={
      FROM:first(d,['from','origin','fromCity','pickup']),TO:first(d,['to','destination','destinations','drop']),DESTINATION:first(d,['destination','destinations','to','drop']),
      DEPARTURE:first(d,['departure','departureDate','date','startDate']),RETURN:first(d,['return','returnDate']),CHECKIN:first(d,['checkin','startDate']),CHECKOUT:first(d,['checkout']),
      ADULTS:first(d,['adults']),CHILDREN:first(d,['children']),INFANTS:first(d,['infants']),ROOMS:first(d,['rooms']),BUDGET:first(d,['budget']),
      SUM_INSURED:first(d,['sumInsured','coverAmount']),INSURANCE_TYPE:first(d,['insuranceType']),AMOUNT:first(d,['amount']),INVESTMENT_TYPE:first(d,['investmentType']),
      FREQUENCY:first(d,['frequency']),PINCODE:first(d,['pincode']),SUBSECTION:String(data?.subsection||'')
    };
    let out=String(url||'');for(const [k,v] of Object.entries(values)){if(v)out=out.replaceAll(`{${k}}`,encodeURIComponent(v))}return out;
  }
  function rememberContext(data,text){
    try{sessionStorage.setItem('dbest_ai_last_member_task_v1',JSON.stringify({route:data?.route||'',subsection:data?.subsection||'',taskData:safeTaskData(data?.taskData||{}),request:String(text||'').slice(0,500),at:Date.now()}))}catch{}
  }
  function openPartner(data,text){
    if(!activeMember())return false;
    const id=serviceId(String(data?.route||''));let link=null;
    try{if(typeof links!=='undefined'&&links&&links[id]?.url&&links[id].enabled!==false)link=links[id]}catch{}
    if(!link?.url)return false;
    rememberContext(data,text);
    let original=link.url;link.url=applyPlaceholders(original,data);
    const nativeOpen=window.open;
    try{
      window.open=function(url,target,features){
        let w=null;try{w=nativeOpen.call(window,url,target,features)}catch{}
        if(!w){try{window.location.assign(url)}catch{}}
        return w;
      };
      if(typeof window.externalGo==='function')window.externalGo(id);else if(typeof externalGo==='function')externalGo(id);else return false;
      return true;
    }catch(e){console.warn('DBest AI partner handoff failed',e);return false}
    finally{window.open=nativeOpen;try{link.url=original}catch{}}
  }
  function syncVisibility(){
    const s=memberSession(),host=document.getElementById('dbest-ai-test-host');
    if(host)host.style.display=s?'block':'none';
    if(s){previousMemberId=String(s.id||'');window.__DBEST_AI_MEMBER_ID__=previousMemberId;return}
    delete window.__DBEST_AI_MEMBER_ID__;
    try{sessionStorage.removeItem('dbest_ai_last_member_task_v1');sessionStorage.removeItem('dbest_ai_pending_external_v1')}catch{}
    if(previousMemberId){previousMemberId='';setTimeout(()=>{if(!activeMember())location.replace('/?reason=logout')},20)}
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    if((url.includes('/api/ai-assistant')||url.includes('/api/ai-transcribe')||url.includes('/api/ai-speech'))&&!activeMember()){
      return Promise.resolve(new Response(JSON.stringify({error:'Login required',code:'member_login_required'}),{status:401,headers:{'Content-Type':'application/json'}}));
    }
    return realFetch(input,init);
  };

  function wrapRouter(){
    const r=window.__DBEST_AI_TASK_ROUTER__;if(!r?.goToTask||r.__memberOnlyWrapped)return false;
    const raw=r.goToTask.bind(r);
    r.goToTask=function(data,text){
      if(!activeMember())return false;
      const prepared=typeof r.prepareData==='function'?r.prepareData(data,text):data;
      if(EXTERNAL.has(String(prepared?.route||''))){
        if(openPartner(prepared,text))return true;
      }
      return raw(prepared,text);
    };
    r.__memberOnlyWrapped=true;return true;
  }
  function install(){syncVisibility();if(!wrapRouter())setTimeout(install,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  setInterval(syncVisibility,300);
  window.addEventListener('storage',syncVisibility);
  window.__DBEST_AI_MEMBER_RUNTIME__={version:VERSION,activeMember,memberSession,openPartner,syncVisibility};
})();