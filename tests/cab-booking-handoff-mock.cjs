const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cab-live-job-handoff-fix-v1.js','utf8');

async function main(){
 const store=new Map(),calls=[],pending=[];
 const window={
  DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://test-only.invalid',supabasePublishableKey:'mock-public-key'},
  DBEST_RIDE_LIVE_UI_FINALIZER:{refresh(){}},
  txs:[{id:'CAB-QA-001',userId:'QA-MEMBER-001',amount:495,ride:{
   pickup:'Chakradharpur',drop:'Sonua',pickupCoords:{lat:22.676,lng:85.628},
   dropCoords:{lat:22.58,lng:85.465},distance:22.5,vehicleId:'auto',
   vehicleName:'Auto/E-Rickshaw',paymentMethod:'cash',stops:['Example stop'],
   stopCoords:[{lat:22.65,lng:85.6}],roundTrip:false,tripType:'oneway'
  }}],
  users:[{id:'QA-MEMBER-001',name:'QA Customer',mobile:'0000000000',email:'qa@example.invalid'}],
  rideStatusScreen(id){return 'screen:'+id}
 };
 const ctx={
  window,console:{warn(){},error(){},info(){}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  document:{querySelector(){return null},createElement(){return {setAttribute(){}}},head:{appendChild(){}},documentElement:{appendChild(){}}},
  setTimeout(fn,ms){pending.push({fn,ms});return pending.length},
  clearTimeout(){},
  setInterval(){return 0},clearInterval(){},
  fetch:async(url,req)=>{
   const path=String(url);const payload=JSON.parse(req?.body||'{}');
   calls.push({path,payload});
   if(path.endsWith('/vaahak-live'))return {ok:true,status:200,json:async()=>({job:{id:'QA-JOB-001'},customerToken:'qa-session-token'})};
   if(path.endsWith('/vaahak-dispatch-live'))return {ok:true,status:200,json:async()=>({offered:1})};
   throw new Error('Unexpected remote request '+path);
  }
 };
 vm.runInNewContext(source,ctx,{filename:'cab-live-job-handoff-fix-v1.js'});
 assert.equal(typeof window.DBEST_CAB_LIVE_HANDOFF?.createLiveJob,'function','Live handoff not installed');
 const [first,second]=await Promise.all([
  window.DBEST_CAB_LIVE_HANDOFF.createLiveJob('CAB-QA-001'),
  window.DBEST_CAB_LIVE_HANDOFF.createLiveJob('CAB-QA-001')
 ]);
 assert.equal(first.job.id,'QA-JOB-001');
 assert.equal(second.job.id,'QA-JOB-001');
 assert.equal(calls.filter(x=>x.path.endsWith('/vaahak-live')).length,1,'Concurrent create must be deduplicated');
 assert.equal(calls.filter(x=>x.path.endsWith('/vaahak-dispatch-live')).length,1,'Dispatch should receive one tick');
 const c=calls.find(x=>x.path.endsWith('/vaahak-live')).payload;
 assert.equal(c.action,'create_ride');
 assert.equal(c.txId,'CAB-QA-001');
 assert.equal(c.vehicleType,'Auto/E-Rickshaw');
 assert.equal(c.distanceKm,22.5);
 assert.equal(c.pickupLat,22.676);
 assert.equal(c.dropLng,85.465);
 assert.equal(c.stops[0],'Example stop');
 assert.equal(store.get('dbest_live_ride_CAB-QA-001'),'1');
 assert.equal(store.get('dbest_live_customer_token_CAB-QA-001'),'qa-session-token');
 const again=await window.DBEST_CAB_LIVE_HANDOFF.createLiveJob('CAB-QA-001');
 assert.equal(again.already,true);
 assert.equal(calls.filter(x=>x.path.endsWith('/vaahak-live')).length,1,'Repeat should not double-dispatch');

 // Missing transaction should never create a driver job.
 const before=calls.length;
 const noRide=window.DBEST_CAB_LIVE_HANDOFF.createLiveJob('MISSING-QA');
 const immediateTimers=pending.filter(x=>x.ms===150);
 for(const p of immediateTimers.slice(0,20))p.fn();
 // Do not await retries here: the handler intentionally waits for a transaction.
 assert.equal(calls.length,before,'Missing transaction must not produce dispatch');
 console.log('Cab mocked booking-to-Vaahak handoff passed; no real orders, payments or notifications sent.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
