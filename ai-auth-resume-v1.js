(() => {
  'use strict';

  const VERSION='1.0.0-auth-resume';
  const PENDING_KEY='dbest_ai_pending_external_v1';
  const EXTERNAL=new Set(['insurance','travel','flights','mf']);
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  const SAFE_KEYS=new Set(['from','origin','fromCity','pickup','to','destination','destinations','drop','departure','departureDate','return','returnDate','date','startDate','checkin','checkout','adults','children','infants','rooms','budget','sumInsured','coverAmount','insuranceType','amount','investmentType','frequency','risk','goal','hotel','category','meal','transport','cabin','airline','pincode']);

  function getSession(){
    try{
      if(typeof session!=='undefined'&&session)return session;
    }catch{}
    try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{};}catch{return{};}
  }

  function activeMember(){
    const s=getSession();
    return !!(s&&s.id&&MEMBER_ROLES.has(String(s.role||'')));
  }

  function serviceId(route){
    if(route==='insurance')return'insurance';
    if(route==='mf')return'mf';
    if(route==='travel'||route==='flights')return'flights';
    return route;
  }

  function safeTaskData(v){
    const out={};
    if(!v||typeof v!=='object')return out;
    for(const [k,val] of Object.entries(v)){
      if(!SAFE_KEYS.has(k)||val===undefined||val===null||val==='')continue;
      out[k]=typeof val==='string'?val.slice(0,240):val;
    }
    return out;
  }

  function makePending(data,text){
    return{
      serviceId:serviceId(data.route),
      route:String(data.route||''),
      subsection:String(data.subsection||''),
      taskData:safeTaskData(data.taskData||{}),
      request:String(text||'').slice(0,500),
      createdAt:Date.now()
    };
  }

  function savePending(p){
    try{sessionStorage.setItem(PENDING_KEY,JSON.stringify(p));}catch{}
    window.__DBEST_AI_PENDING_EXTERNAL__=p;
  }

  function readPending(){
    try{
      const p=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
      if(p&&Date.now()-Number(p.createdAt||0)<30*60*1000)return p;
    }catch{}
    const p=window.__DBEST_AI_PENDING_EXTERNAL__;
    if(p&&Date.now()-Number(p.createdAt||0)<30*60*1000)return p;
    return null;
  }

  function clearPending(){
    try{sessionStorage.removeItem(PENDING_KEY);}catch{}
    delete window.__DBEST_AI_PENDING_EXTERNAL__;
  }

  function first(d,names){
    for(const n of names){const v=d?.[n];if(v!==undefined&&v!==null&&v!=='')return String(v);}
    return'';
  }

  function applyConfiguredPlaceholders(url,p){
    const d=p?.taskData||{};
    const values={
      FROM:first(d,['from','origin','fromCity','pickup']),
      TO:first(d,['to','destination','destinations','drop']),
      DESTINATION:first(d,['destination','destinations','to','drop']),
      DEPARTURE:first(d,['departure','departureDate','date','startDate']),
      RETURN:first(d,['return','returnDate']),
      CHECKIN:first(d,['checkin','startDate']),
      CHECKOUT:first(d,['checkout']),
      ADULTS:first(d,['adults']),
      CHILDREN:first(d,['children']),
      INFANTS:first(d,['infants']),
      ROOMS:first(d,['rooms']),
      BUDGET:first(d,['budget']),
      SUM_INSURED:first(d,['sumInsured','coverAmount']),
      INSURANCE_TYPE:first(d,['insuranceType']),
      AMOUNT:first(d,['amount']),
      INVESTMENT_TYPE:first(d,['investmentType']),
      FREQUENCY:first(d,['frequency']),
      SUBSECTION:String(p?.subsection||'')
    };
    let out=String(url||'');
    for(const [k,v] of Object.entries(values)){
      if(!v)continue;
      out=out.replaceAll(`{${k}}`,encodeURIComponent(v));
    }
    return out;
  }

  function openPartner(p){
    if(!p||!activeMember())return false;
    const id=p.serviceId||serviceId(p.route);
    let restoredUrl=null;
    try{
      if(typeof links!=='undefined'&&links&&links[id]?.url){
        restoredUrl=links[id].url;
        links[id].url=applyConfiguredPlaceholders(restoredUrl,p);
      }
    }catch{}
    const realOpen=window.open;
    try{
      window.open=function(url,target,features){
        let w=null;
        try{w=realOpen.call(window,url,target,features);}catch{}
        if(!w){try{window.location.assign(url);}catch{}}
        return w;
      };
      if(typeof window.externalGo==='function')window.externalGo(id);
      else if(typeof externalGo==='function')externalGo(id);
      else return false;
      clearPending();
      return true;
    }finally{
      window.open=realOpen;
      try{if(restoredUrl!==null&&typeof links!=='undefined'&&links&&links[id])links[id].url=restoredUrl;}catch{}
    }
  }

  function promptMemberLogin(p){
    const label=p?.subsection||'requested partner service';
    try{window.toast?.(`Login required • continuing to ${label} after login`);}catch{}
    setTimeout(()=>{
      try{
        if(typeof window.memberLogin==='function')window.memberLogin();
        else if(typeof memberLogin==='function')memberLogin();
        else if(typeof window.account==='function')window.account();
      }catch{}
    },180);
  }

  function wrapRouter(){
    const r=window.__DBEST_AI_TASK_ROUTER__;
    if(!r?.goToTask||r.__authResumeWrapped)return false;
    const raw=r.goToTask.bind(r);
    r.goToTask=function(data,text){
      const prepared=typeof r.prepareData==='function'?r.prepareData(data,text):data;
      const route=String(prepared?.route||'');
      if(!EXTERNAL.has(route))return raw(data,text);
      const p=makePending(prepared,text);
      savePending(p);
      raw(prepared,text);
      if(activeMember()){
        openPartner(p);
      }else{
        promptMemberLogin(p);
      }
      return true;
    };
    r.__authResumeWrapped=true;
    return true;
  }

  function wrapMemberLogin(){
    const fn=window.memberGo;
    if(typeof fn!=='function'||fn.__dbestAiResumeWrapped)return false;
    const wrapped=function(e){
      const out=fn.apply(this,arguments);
      if(activeMember()){
        const p=readPending();
        if(p){
          try{window.toast?.(`Login successful • opening ${p.subsection||'partner service'}`);}catch{}
          openPartner(p);
        }
      }
      return out;
    };
    wrapped.__dbestAiResumeWrapped=true;
    window.memberGo=wrapped;
    try{memberGo=wrapped;}catch{}
    return true;
  }

  function install(){
    const a=wrapRouter(),b=wrapMemberLogin();
    if(!a||!b)setTimeout(install,120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.__DBEST_AI_AUTH_RESUME__={version:VERSION,readPending,openPartner,clearPending};
})();