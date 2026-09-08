(() => {
  'use strict';

  const LATEST_TTL = 30000;
  let wrapped = false;
  let lastConsumedAt = 0;

  function inferCabPair(text, data={}) {
    const out={...(data||{})};
    if(out.pickup&&out.drop)return out;
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){
      if(!out.pickup)out.pickup=m[1].trim();
      if(!out.drop)out.drop=m[2].trim();
      return out;
    }
    m=raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){
      const parts=m[1].trim().split(/\s+/).filter(Boolean);
      if(parts.length===2){
        if(!out.pickup)out.pickup=parts[0];
        if(!out.drop)out.drop=parts[1];
      }
    }
    return out;
  }

  function latestCabPayload(){
    const latest=window.__DBEST_LAST_AI_DATA__||null;
    if(!latest)return null;
    const at=Number(latest._at||0);
    if(!at||Date.now()-at>LATEST_TTL||at===lastConsumedAt)return null;
    const text=String(latest._userText||'').trim();
    const route=String(latest.route||'').toLowerCase();
    const looksCab=route==='car'||/\bcab\b|\btaxi\b|\bride\b|pickup|drop/i.test(text);
    if(!looksCab)return null;
    const taskData=inferCabPair(text,latest.taskData||{});
    if(!taskData.pickup&&!taskData.drop)return null;
    lastConsumedAt=at;
    return {taskData,text,at};
  }

  function wrapNativeCab(){
    if(wrapped||typeof window.openRidePlatform!=='function')return false;
    const original=window.openRidePlatform;
    window.openRidePlatform=function(aiData){
      let payload=(aiData&&typeof aiData==='object')?aiData:null;
      let source='argument';
      if(!payload){
        const latest=latestCabPayload();
        if(latest){payload=latest.taskData;source='latest-ai';}
      }
      window.__DBEST_NATIVE_CAB_HANDOFF__={
        stage:'opening',
        source,
        pickup:payload?.pickup||'',
        drop:payload?.drop||'',
        at:Date.now()
      };
      return original.call(this,payload||undefined);
    };
    window.openRidePlatform.__dbestAiLatestWrapper=true;
    wrapped=true;
    return true;
  }

  function install(){return wrapNativeCab();}

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),15000);
  }

  window.__DBEST_AI_NATIVE_CAB__={
    getLatestCabPayload:latestCabPayload,
    version:'0.3-latest-ai-direct'
  };
})();