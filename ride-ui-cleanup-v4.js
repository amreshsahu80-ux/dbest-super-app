(function(){
  const style=document.createElement('style');style.textContent=`
    .dbestRideSuggestions{max-height:132px!important;overflow:auto!important;margin:4px 0 8px!important;position:static!important;box-shadow:none!important;border-radius:12px!important}
    .dbestRideSuggestion{padding:8px 10px!important;font-size:12px!important}
    .dbestRideHint{display:none!important}
    .dbestVaahakStrip{display:block!important;margin-top:10px!important;background:#f7fbff!important;border:1px solid #dfe9f6!important;border-radius:14px!important;padding:10px!important}
    .dbestVaahakTitle{font-size:11px!important;font-weight:900!important;color:#25446e!important;margin-bottom:7px!important}
    .dbestVaahakList{display:flex!important;gap:7px!important;overflow:auto!important;padding-bottom:2px!important}
    .dbestVaahakChip{min-width:150px!important;background:#fff!important;border:1px solid #e3eaf3!important;border-radius:12px!important;padding:8px!important}
  `;document.head.appendChild(style);

  async function indiaSearch(q){
    q=String(q||'').trim(); if(q.length<3)return[];
    const qs=new URLSearchParams({format:'jsonv2',addressdetails:'1',countrycodes:'in',limit:'3',q});
    try{
      const r=await fetch('https://nominatim.openstreetmap.org/search?'+qs.toString(),{headers:{'Accept-Language':'en'}}); if(!r.ok)return[];
      const j=await r.json(); return j.map(x=>({lat:+x.lat,lon:+x.lon,name:x.display_name||q,detail:''}));
    }catch(e){return[]}
  }

  function fallbackVaahaks(){
    try{const s=JSON.parse(localStorage.getItem('d2_vaahak_partners')||'[]');if(Array.isArray(s)&&s.length)return s.filter(x=>x.available!==false&&x.canRide!==false)}catch(e){}
    return [
      {name:'Rakesh Kumar',vehicle:'Bike',rating:4.8,vehicleNo:'JH05BK1021'},
      {name:'Manoj Sahu',vehicle:'Auto',rating:4.9,vehicleNo:'JH05AU2122'},
      {name:'Amit Singh',vehicle:'Car',rating:4.7,vehicleNo:'JH05CR3366'}
    ];
  }

  function paintVaahaks(){
    const box=document.getElementById('dbestVaahakStrip');if(!box)return;
    const rows=fallbackVaahaks().slice(0,4);
    box.innerHTML='<div class="dbestVaahakTitle">Nearby Vaahak</div><div class="dbestVaahakList">'+rows.map(x=>`<div class="dbestVaahakChip"><b>${x.vehicle==='Auto'?'🛺':x.vehicle==='Bike'?'🏍️':'🚕'} ${x.name}</b><small>${x.vehicle} • ⭐ ${x.rating||4.8}<br>${x.vehicleNo||''}</small></div>`).join('')+'</div>';
  }

  function simplify(){
    const pick=document.getElementById('dbestPickup'),drop=document.getElementById('dbestDrop'); if(!pick||!drop)return;
    [pick,drop].forEach((input,idx)=>{
      if(input.dataset.dbestClean==='1')return; input.dataset.dbestClean='1';
      const sug=document.getElementById(idx===0?'dbestPickupSuggestions':'dbestDropSuggestions');
      let t; input.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(async()=>{
        if(!sug)return; const rows=await indiaSearch(input.value);
        if(!rows.length){sug.style.display='none';return}
        sug.innerHTML=rows.map((r,i)=>`<button type="button" class="dbestRideSuggestion" data-clean-i="${i}" style="width:100%;border:0;background:#fff;text-align:left"><b>${r.name}</b></button>`).join('');
        sug.style.display='block';
        sug.querySelectorAll('[data-clean-i]').forEach((b,i)=>b.onclick=()=>{input.value=rows[i].name;sug.style.display='none'});
      },300)});
      input.addEventListener('blur',()=>setTimeout(()=>{if(sug)sug.style.display='none'},180));
    });
    paintVaahaks();
  }

  const old=window.openRidePlatform;
  window.openRidePlatform=function(){
    const r=old&&old.apply(this,arguments);
    setTimeout(simplify,180);
    setTimeout(paintVaahaks,450);
    return r;
  };

  // Deliberately no global MutationObserver here: repeated DOM rewrites caused the app to freeze.
  window.DBEST_RIDE_UI_CLEANUP={version:'4.1.0'};
})();