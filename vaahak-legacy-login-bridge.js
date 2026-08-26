(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{}; const base=String(cfg.supabaseUrl||'').replace(/\/$/,''); const key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const LIVE=()=>window.DBEST_VAAHAK_LIVE;
  const DEMO_IDS=new Set(['VHK1001','VHK1002','VHK1003','VHK1004']);
  function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
  function localPartners(){try{const a=JSON.parse(localStorage.getItem('d2_vaahak_partners')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  async function migrate(v,pin){
    const id=String(v?.id||'').trim().toUpperCase();
    if(DEMO_IDS.has(id))throw new Error('demo_vaahak_disabled');
    const r=await fetch(base+'/functions/v1/vaahak-legacy-migrate',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id:v.id,pin,name:v.name,mobile:v.mobile,email:v.email,vehicle:v.vehicle,vehicleNo:v.vehicleNo,canRide:v.canRide!==false,canDeliver:v.canDeliver!==false})});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'migration_failed'); return d;
  }
  setTimeout(()=>{
    window.vaahakPortalLogin=async function(e){
      e.preventDefault(); const f=new FormData(e.target); const login=String(f.get('id')||'').trim().toUpperCase(); const pin=String(f.get('pin')||'');
      if(DEMO_IDS.has(login))return notify('Demo Vaahak accounts are disabled on the live platform. Please use a registered Vaahak account.');
      try{
        const d=await LIVE().call('login',{login,pin}); localStorage.setItem('dbest_vaahak_live_token',d.token); return window.vaahakDashboard?.();
      }catch(err){
        const legacy=localPartners().find(v=>String(v.id||'').toUpperCase()===login&&String(v.pin||'')===pin&&!DEMO_IDS.has(String(v.id||'').toUpperCase()));
        if(!legacy)return notify('Invalid Vaahak ID / mobile or PIN. If this Vaahak was created before live sync, open the same device where it was registered once to migrate it.');
        try{
          await migrate(legacy,pin);
          const d=await LIVE().call('login',{login,pin}); localStorage.setItem('dbest_vaahak_live_token',d.token);
          notify('Old Vaahak profile moved to live DBest successfully. This same Vaahak ID will now work on other devices too.');
          return window.vaahakDashboard?.();
        }catch(mErr){notify(mErr.message==='demo_vaahak_disabled'?'Demo Vaahak accounts are disabled on the live platform.':'Could not migrate old Vaahak profile: '+mErr.message)}
      }
    };
  },500);
})();