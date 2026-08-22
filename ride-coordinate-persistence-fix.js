(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const liveApi=String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/vaahak-live';
const raw=window.fetch.bind(window);
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:String(input?.url||'');
  if(url.startsWith(liveApi)&&init&&String(init.method||'GET').toUpperCase()==='POST'){
    try{
      const b=JSON.parse(String(init.body||'{}'));
      if(b.action==='create_ride'){
        let d=null;
        try{if(typeof rideDraft!=='undefined')d=rideDraft}catch(e){}
        if(d){
          if((b.pickupLat==null||b.pickupLng==null)&&d.pickupCoords){b.pickupLat=Number(d.pickupCoords.lat);b.pickupLng=Number(d.pickupCoords.lng)}
          if((b.dropLat==null||b.dropLng==null)&&d.dropCoords){b.dropLat=Number(d.dropCoords.lat);b.dropLng=Number(d.dropCoords.lng)}
        }
        init={...init,body:JSON.stringify(b)};
      }
    }catch(e){}
  }
  return raw(input,init);
};
window.DBEST_RIDE_COORDINATE_FIX={version:'1.0.0'};
})();