(function(){
  const originalFetch=window.fetch.bind(window);

  function photonLike(rows){
    return {features:(rows||[]).map(r=>({
      geometry:{coordinates:[Number(r.lon),Number(r.lat)]},
      properties:{
        name:r.display_name||'',
        city:(r.address&&((r.address.city)||(r.address.town)||(r.address.village)||(r.address.municipality)))||'',
        state:(r.address&&r.address.state)||'',
        street:(r.address&&((r.address.road)||(r.address.neighbourhood)||(r.address.suburb)))||'',
        district:(r.address&&((r.address.city_district)||(r.address.county)))||'',
        country:(r.address&&r.address.country)||''
      }
    }))};
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!url.includes('photon.komoot.io/api/')) return originalFetch(input,init);
    try{
      const first=await originalFetch(input,init);
      const clone=first.clone();
      const data=await clone.json().catch(()=>null);
      if(data&&Array.isArray(data.features)&&data.features.length) return first;
      const u=new URL(url);
      const q=u.searchParams.get('q')||'';
      if(q.trim().length<3) return first;
      const nurl='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=7&countrycodes=in&q='+encodeURIComponent(q);
      const nr=await originalFetch(nurl,{headers:{'Accept-Language':'en'}});
      if(!nr.ok) return first;
      const rows=await nr.json();
      return new Response(JSON.stringify(photonLike(rows)),{status:200,headers:{'Content-Type':'application/json'}});
    }catch(e){
      return originalFetch(input,init);
    }
  };

  const baseOpen=window.openRidePlatform;
  if(typeof baseOpen==='function'){
    window.openRidePlatform=function(){
      const out=baseOpen.apply(this,arguments);
      setTimeout(()=>{
        const pick=document.getElementById('dbestPickup');
        const drop=document.getElementById('dbestDrop');
        const find=document.getElementById('dbestFindRide');
        const card=document.querySelector('.dbestRideSearch');
        if(!pick||!drop||!find||!card||card.dataset.exactBridge==='1')return;
        card.dataset.exactBridge='1';

        const note=document.createElement('div');
        note.style.cssText='font-size:10px;line-height:1.35;color:#52627a;background:#f7f9fd;border:1px solid #e2e8f2;border-radius:10px;padding:7px 9px;margin:-2px 0 8px';
        note.innerHTML='<b>Exact place not in suggestions?</b> Type the full house/shop/landmark/road address. DBest will keep your exact wording for the booking and locate the nearest matching map point.';
        const actions=card.querySelector('.dbestRideActions');
        if(actions)card.insertBefore(note,actions);

        let typedPick='',typedDrop='';
        const remember=()=>{typedPick=String(pick.value||'').trim();typedDrop=String(drop.value||'').trim()};
        pick.addEventListener('input',()=>{typedPick=pick.value.trim()});
        drop.addEventListener('input',()=>{typedDrop=drop.value.trim()});
        find.addEventListener('pointerdown',remember,true);
        find.addEventListener('click',()=>{
          remember();
          const started=Date.now();
          const restore=setInterval(()=>{
            if(typedPick)pick.value=typedPick;
            if(typedDrop)drop.value=typedDrop;
            try{
              if(typeof rideDraft!=='undefined'){
                if(typedPick)rideDraft.pickup=typedPick;
                if(typedDrop)rideDraft.drop=typedDrop;
              }
            }catch(e){}
            const tray=document.getElementById('dbestVehicleTray');
            if((tray&&tray.classList.contains('show'))||Date.now()-started>5000)clearInterval(restore);
          },120);
        },true);
      },80);
      return out;
    };
  }

  window.DBEST_RIDE_EXACT_LOCATION={version:'1.0.0'};
})();