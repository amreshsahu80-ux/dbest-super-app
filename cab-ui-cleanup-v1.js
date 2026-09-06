(function(){
'use strict';
const V='20260906-cab-ui-cleanup-v2-exact-place';
if(window.DBEST_CAB_UI_CLEANUP?.version===V)return;
let slot='',placesPatched=false;
const exact=window.DBEST_CAB_EXACT_SELECTIONS=window.DBEST_CAB_EXACT_SELECTIONS||{p:null,d:null};
function apply(){
  const b=document.getElementById('cab6Gps');
  if(b){
    b.textContent='◎';
    b.setAttribute('aria-label','Use current location');
    b.setAttribute('title','Use current location');
    b.style.flex='0 0 44px';
    b.style.width='44px';
    b.style.padding='8px';
    b.style.fontSize='18px';
  }
  patchPlaces();
}
function patchPlaces(){
  if(placesPatched||!window.google?.maps?.places?.PlacesService)return;
  const proto=google.maps.places.PlacesService.prototype;
  if(typeof proto.getDetails!=='function')return;
  const old=proto.getDetails;
  if(old.__dbestExactPlaceV2){placesPatched=true;return}
  function wrapped(req,cb){
    const chosen=slot;
    return old.call(this,req,(place,status)=>{
      try{
        if(chosen&&place?.geometry?.location&&(status==='OK'||status===google.maps.places.PlacesServiceStatus.OK)){
          const input=document.getElementById(chosen==='p'?'cab6P':'cab6D');
          exact[chosen]={lat:place.geometry.location.lat(),lng:place.geometry.location.lng(),label:String(input?.value||place.formatted_address||place.name||'').trim(),placeId:req?.placeId||'',source:'google-place-exact'};
        }
      }catch(e){}
      return cb&&cb(place,status)
    })
  }
  wrapped.__dbestExactPlaceV2=true;
  proto.getDetails=wrapped;
  placesPatched=true;
}
document.addEventListener('click',e=>{
  const t=e.target;
  if(t?.closest?.('#cab6PS button'))slot='p';
  else if(t?.closest?.('#cab6DS button'))slot='d';
  else if(t?.closest?.('#cab6Gps')){slot='p';exact.p=null}
  else if(t?.closest?.('#cab6Swap'))setTimeout(()=>{const z=exact.p;exact.p=exact.d;exact.d=z},0);
  setTimeout(apply,0)
},true);
document.addEventListener('input',e=>{if(e.target?.id==='cab6P')exact.p=null;if(e.target?.id==='cab6D')exact.d=null},true);
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,700,1500,3000,6000].forEach(ms=>setTimeout(apply,ms));
window.DBEST_CAB_UI_CLEANUP={version:V,apply,exactSelections:exact};
})();