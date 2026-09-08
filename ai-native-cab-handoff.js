(() => {
  'use strict';

  const NEXT_TTL = 5000;
  let wrapped = false;

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

  function latestUserText(root){
    const users=root?[...root.querySelectorAll('.msg.user')]:[];
    return String(users.at(-1)?.textContent || window.__DBEST_LAST_AI_DATA__?._userText || '').trim();
  }

  function armNextCab(root){
    const latest=window.__DBEST_LAST_AI_DATA__||{};
    const text=latestUserText(root);
    const route=String(latest.route||'').toLowerCase();
    const looksCab=route==='car'||/\bcab\b|\btaxi\b|\bride\b|pickup|drop/i.test(text);
    if(!looksCab)return false;
    const taskData=inferCabPair(text,latest.taskData||{});
    if(!taskData.pickup&&!taskData.drop)return false;
    window.__DBEST_CAB_AI_NEXT__={
      taskData,
      userText:text,
      armedAt:Date.now()
    };
    window.__DBEST_NATIVE_CAB_HANDOFF__={
      stage:'armed',
      pickup:taskData.pickup||'',
      drop:taskData.drop||'',
      at:Date.now()
    };
    return true;
  }

  function wrapNativeCab(){
    if(wrapped||typeof window.openRidePlatform!=='function')return false;
    const original=window.openRidePlatform;
    window.openRidePlatform=function(aiData){
      let payload=(aiData&&typeof aiData==='object')?aiData:null;
      const next=window.__DBEST_CAB_AI_NEXT__;
      if(!payload&&next&&Date.now()-Number(next.armedAt||0)<=NEXT_TTL){
        payload=next.taskData||null;
      }
      if(next)delete window.__DBEST_CAB_AI_NEXT__;
      window.__DBEST_NATIVE_CAB_HANDOFF__={
        stage:'opening',
        pickup:payload?.pickup||'',
        drop:payload?.drop||'',
        at:Date.now()
      };
      return original.call(this,payload||undefined);
    };
    window.openRidePlatform.__dbestAiOneTimeWrapper=true;
    wrapped=true;
    return true;
  }

  function installShadowCapture(){
    const root=document.querySelector('#dbest-ai-test-host')?.shadowRoot;
    if(!root)return false;
    if(root.__dbestNativeCabPayloadInstalled)return true;
    root.__dbestNativeCabPayloadInstalled=true;
    root.addEventListener('pointerdown',e=>{
      const btn=e.target?.closest?.('button');
      if(!btn||!/Continue in DBest/i.test(String(btn.textContent||'')))return;
      armNextCab(root);
    },true);
    root.addEventListener('click',e=>{
      const btn=e.target?.closest?.('button');
      if(!btn||!/Continue in DBest/i.test(String(btn.textContent||'')))return;
      armNextCab(root);
    },true);
    return true;
  }

  function install(){
    const a=wrapNativeCab();
    const b=installShadowCapture();
    return a&&b;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),15000);
  }

  window.__DBEST_AI_NATIVE_CAB__={
    arm:()=>armNextCab(document.querySelector('#dbest-ai-test-host')?.shadowRoot),
    version:'0.2-one-time-native-payload'
  };
})();