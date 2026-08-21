(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{}; const base=String(cfg.supabaseUrl||'').replace(/\/$/,''); const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const LIVE=()=>window.DBEST_VAAHAK_LIVE;
  function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
  function localPartners(){try{const a=JSON.parse(localStorage.getItem('d2_vaahak_partners')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  async function migrate(v,pin){
    const r=await fetch(base+'/functions/v1/vaahak-legacy-migrate',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id:v.id,pin,name:v.name,mobile:v.mobile,email:v.email,vehicle:v.vehicle,vehicleNo:v.vehicleNo,canRide:v.canRide!==false,canDeliver:v.canDeliver!==false})});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'migration_failed'); return d;
  }
  setTimeout(()=>{
    const original=window.vaahakPortalLogin;
    window.vaahakPortalLogin=async function(e){
      e.preventDefault(); const f=new FormData(e.target); const login=String(f.get('id')||'').trim().toUpperCase(); const pin=String(f.get('pin')||'');
      try{
        const d=await LIVE().call('login',{login,pin}); localStorage.setItem('dbest_vaahak_live_token',d.token); return window.vaahakDashboard?.();
      }catch(err){
        const legacy=localPartners().find(v=>String(v.id||'').toUpperCase()===login&&String(v.pin||'')===pin);
        if(!legacy)return notify('Invalid Vaahak ID / mobile or PIN. If this Vaahak was created before live sync, open the same device where it was registered once to migrate it.');
        try{
          await migrate(legacy,pin);
          const d=await LIVE().call('login',{login,pin}); localStorage.setItem('dbest_vaahak_live_token',d.token);
          notify('Old Vaahak profile moved to live DBest successfully. This same Vaahak ID will now work on other devices too.');
          return window.vaahakDashboard?.();
        }catch(mErr){notify('Could not migrate old Vaahak profile: '+mErr.message)}
      }
    };
  },500);
})();