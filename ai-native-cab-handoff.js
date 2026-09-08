(() => {
  'use strict';

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
    const users=[...root.querySelectorAll('.msg.user')];
    return String(users.at(-1)?.textContent||window.__DBEST_LAST_AI_DATA__?._userText||'').trim();
  }

  function install(){
    const host=document.querySelector('#dbest-ai-test-host');
    const root=host?.shadowRoot;
    if(!root)return false;
    if(root.__dbestNativeCabHandoffInstalled)return true;
    root.__dbestNativeCabHandoffInstalled=true;

    root.addEventListener('click',e=>{
      const btn=e.target?.closest?.('button');
      if(!btn)return;
      const label=String(btn.textContent||'');
      if(!/Continue in DBest/i.test(label)||!/Cab/i.test(label))return;

      const latest=window.__DBEST_LAST_AI_DATA__||{};
      const text=latestUserText(root);
      const taskData=inferCabPair(text,latest.taskData||{});
      if(!taskData.pickup&&!taskData.drop)return;

      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();

      try{root.querySelector('#close')?.click();}catch{}
      if(typeof window.openRidePlatform==='function'){
        window.__DBEST_NATIVE_CAB_HANDOFF__={...taskData,userText:text,at:Date.now()};
        window.openRidePlatform(taskData);
      }
    },true);
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),15000);
  }
})();