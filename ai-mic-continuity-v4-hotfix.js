(() => {
  'use strict';
  const install=()=>{
    const host=document.getElementById('dbest-ai-v4-host');
    const fab=document.getElementById('a4Fab');
    const panel=document.getElementById('a4Panel');
    const mic=document.getElementById('a4Mic');
    const status=document.getElementById('a4Status');
    if(!host||!fab||!panel||!mic)return false;

    const isMember=()=>{try{const s=JSON.parse(localStorage.getItem('d2_session')||'{}')||{};return !!(s.id&&['guest','promoter','prime','leader'].includes(String(s.role||'')))}catch{return false}};

    fab.onclick=(e)=>{
      e.preventDefault();e.stopPropagation();
      if(!isMember())return;
      panel.classList.add('open');
      fab.style.display='none';
      if(status)status.textContent='Starting microphone…';
      setTimeout(()=>{
        try{mic.click()}catch{}
      },120);
    };

    window.__DBEST_AI_MIC_CONTINUITY__={version:'4.1-one-tap-next-turn'};
    return true;
  };
  if(!install()){
    let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(t)},100);
  }
})();