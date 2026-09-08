(() => {
  'use strict';

  const VERSION='0.4-selected-cab-ui-native-fields';

  function inferCabPair(text,data={}){
    const out={...(data||{})};
    if(out.pickup&&out.drop)return out;
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){if(!out.pickup)out.pickup=m[1].trim();if(!out.drop)out.drop=m[2].trim();return out;}
    m=raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){const p=m[1].trim().split(/\s+/).filter(Boolean);if(p.length===2){if(!out.pickup)out.pickup=p[0];if(!out.drop)out.drop=p[1];}}
    return out;
  }

  function shadowRoot(){return document.querySelector('#dbest-ai-test-host')?.shadowRoot||null;}
  function latestUserText(root){
    const users=root?[...root.querySelectorAll('.msg.user')]:[];
    return String(window.__DBEST_LAST_AI_DATA__?._userText||users.at(-1)?.textContent||'').trim();
  }
  function latestCabTask(root){
    const latest=window.__DBEST_LAST_AI_DATA__||{};
    const text=latestUserText(root);
    const route=String(latest.route||'').toLowerCase();
    if(route!=='car'&&!/\bcab\b|\btaxi\b|\bride\b|pickup|drop/i.test(text))return null;
    const taskData=inferCabPair(text,latest.taskData||{});
    if(!taskData.pickup&&!taskData.drop)return null;
    return {taskData,text};
  }

  function applyVisibleFields(taskData){
    const pickup=String(taskData?.pickup||'').trim();
    const drop=String(taskData?.drop||'').trim();
    const p=document.getElementById('cab6P');
    const d=document.getElementById('cab6D');
    let n=0;
    if(p&&pickup){p.value=pickup;p.setAttribute('value',pickup);n++;}
    if(d&&drop){d.value=drop;d.setAttribute('value',drop);n++;}
    if(n){
      window.__DBEST_SELECTED_CAB_AI__={pickup:p?.value||pickup,drop:d?.value||drop,appliedAt:Date.now(),version:VERSION};
    }
    return n;
  }

  async function openActualSelectedCab(taskData){
    const pickup=String(taskData?.pickup||'').trim();
    const drop=String(taskData?.drop||'').trim();
    let ui=window.DBEST_CAB_SELECTED_UI;
    try{
      if((!ui||typeof ui.open!=='function')&&window.DBEST_CAB_ENTRY_CAPTURE?.ensure){
        ui=await window.DBEST_CAB_ENTRY_CAPTURE.ensure();
      }
    }catch(e){console.warn('DBest AI selected Cab load warning',e);}
    ui=window.DBEST_CAB_SELECTED_UI||ui;
    if(!ui||typeof ui.open!=='function')return false;

    // The selected Cab UI calls phone GPS immediately on open(). If AI already
    // supplied a pickup, suppress only that one automatic GPS request so it
    // cannot overwrite the spoken pickup. Manual "Current location" works
    // normally immediately after open returns.
    const geo=navigator.geolocation;
    const originalGet=geo&&typeof geo.getCurrentPosition==='function'?geo.getCurrentPosition:null;
    let patched=false;
    if(pickup&&geo&&originalGet){
      try{
        geo.getCurrentPosition=function(success,error){
          if(typeof error==='function')setTimeout(()=>error({code:1,message:'AI pickup supplied'}),0);
        };
        patched=true;
      }catch(_){patched=false;}
    }
    try{ui.open();}
    finally{
      if(patched){try{geo.getCurrentPosition=originalGet;}catch(_){}}
    }

    const apply=()=>applyVisibleFields({pickup,drop});
    apply();
    // Re-apply briefly as a handset/WebView safety net during the selected UI's
    // immediate initialization. These are the actual visible cab6 fields.
    [40,180,500,1200,2600].forEach(ms=>setTimeout(apply,ms));
    window.__DBEST_SELECTED_CAB_AI_HANDOFF__={pickup,drop,openedAt:Date.now(),version:VERSION};
    return true;
  }

  function install(){
    const root=shadowRoot();
    if(!root)return false;
    if(root.__dbestSelectedCabAiInstalled)return true;
    root.__dbestSelectedCabAiInstalled=true;

    root.addEventListener('click',e=>{
      const btn=e.target?.closest?.('button');
      if(!btn||!/Continue in DBest/i.test(String(btn.textContent||'')))return;
      const task=latestCabTask(root);
      if(!task)return;

      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
      try{root.querySelector('#close')?.click();}catch(_){ }
      openActualSelectedCab(task.taskData).catch(err=>console.warn('DBest AI Cab handoff error',err));
    },true);
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},100);
    setTimeout(()=>clearInterval(timer),15000);
  }

  window.__DBEST_AI_NATIVE_CAB__={
    open:openActualSelectedCab,
    apply:applyVisibleFields,
    version:VERSION
  };
})();