const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const script=fs.readFileSync('cab-selected-ui-v3.js','utf8');
const start=script.indexOf('function ownerRideConfig(){');
const end=script.indexOf('function pickupEta(v){',start);
assert.ok(start>0&&end>start,'Owner tariff functions missing');
const owner={
 surge:1.2,platformFee:30,taxPercent:5,
 vehicles:[
  {id:'bike',base:22,perKm:8,minFare:30},
  {id:'auto',base:35,perKm:12,minFare:50},
  {id:'sedan',base:75,perKm:18,minFare:110},
  {id:'suv',base:105,perKm:23,minFare:160}
 ],
 roundTripRules:{sedan:{perKm:15,nightHalt:1000},suv:{perKm:18,nightHalt:1500}}
};
const VEH=[
 {id:'bike',base:4,km:3,min:4},{id:'auto',base:20,km:6,min:20},
 {id:'sedan',base:70,km:18,min:100},{id:'suv',base:105,km:23,min:160}
];
const S={mode:'ride',route:{km:22.5,min:43},rentalKm:20,tripType:'oneway',nightHalt:false};
const storage={getItem:k=>k==='d2_ride_config'?JSON.stringify(owner):null};
const ctx={rideConfig:owner,localStorage:storage,S,VEH,PLATFORM_FEE:15,Number,Math,
 realisticRoadMinutes:(km,min)=>min};
const f=vm.runInNewContext(script.slice(start,end)+';({ownerRideConfig,roundRules,visibleVehicles,totalKm,totalMin,fare})',ctx);
assert.deepEqual(Array.from(f.visibleVehicles(),x=>x.id),['bike','auto','sedan','suv']);
let auto=VEH.find(x=>x.id==='auto');
assert.equal(f.fare(auto),Math.round((Math.max(50,35+12*22.5)*1.2+30)*1.05));
ctx.rideConfig.platformFee=50;
assert.equal(f.fare(auto),Math.round((Math.max(50,35+12*22.5)*1.2+50)*1.05),'Owner fee change should apply immediately');
S.tripType='roundtrip';
assert.deepEqual(Array.from(f.visibleVehicles(),x=>x.id),['sedan','suv']);
assert.equal(f.fare(VEH[2]),675);
S.nightHalt=true;assert.equal(f.fare(VEH[2]),1675);
owner.roundTripRules.sedan.perKm=17;
assert.equal(f.fare(VEH[2]),45*17+1000,'Owner roundtrip override must apply');
console.log('Owner tariff parity and same-vehicle roundtrip tests passed');
