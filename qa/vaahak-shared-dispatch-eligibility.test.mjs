import test from 'node:test';
import assert from 'node:assert/strict';
import {assessVaahak,previewRankCandidates} from './vaahak-shared-dispatch-eligibility.mjs';
const NOW=Date.UTC(2026,10,12,6);
const vaahak=(id,extra={})=>({id,ownerApproval:'Approved',available:true,capabilities:{ride:true,delivery:true},
  activeJobs:[],pendingOffers:[],location:{lat:22.67,lng:85.63,atMs:NOW-1000},...extra});
test('Cab busy means no Marketplace delivery, and conversely',()=>{
  assert.equal(assessVaahak(vaahak('a',{activeJobs:[{status:'Trip Started'}]}),{kind:'delivery'},NOW).reason,'already_assigned');
  assert.equal(assessVaahak(vaahak('b',{activeJobs:[{status:'Delivery Started'}]}),{kind:'ride'},NOW).reason,'already_assigned');
});
test('offline/unapproved, reserved, wrong capability, stale GPS are rejected',()=>{
  assert.equal(assessVaahak(vaahak('a',{available:false}),{kind:'ride'},NOW).eligible,false);
  assert.equal(assessVaahak(vaahak('a',{ownerApproval:'Pending'}),{kind:'ride'},NOW).eligible,false);
  assert.equal(assessVaahak(vaahak('a',{capabilities:{ride:false,delivery:true}}),{kind:'ride'},NOW).eligible,false);
  assert.equal(assessVaahak(vaahak('a',{pendingOffers:[{reserved:true}]}),{kind:'ride'},NOW).eligible,false);
  assert.equal(assessVaahak(vaahak('a',{location:{lat:22.67,lng:85.63,atMs:NOW-180000}}),{kind:'ride'},NOW).eligible,false);
});
test('ranks only eligible drivers with verified road ETA; no straight-line fallback',()=>{
  const candidates=[vaahak('near'),vaahak('fast'),vaahak('busy',{activeJobs:[{status:'Accepted'}]}),vaahak('noRoute')];
  const routes={near:{seconds:420,meters:2100,reachable:true},fast:{seconds:250,meters:4000,reachable:true},
    busy:{seconds:100,meters:500,reachable:true}};
  assert.deepEqual(previewRankCandidates(candidates,{kind:'delivery'},routes,NOW),[
    {vaahakId:'fast',pickupEtaSeconds:250,roadMeters:4000},
    {vaahakId:'near',pickupEtaSeconds:420,roadMeters:2100}
  ]);
});
test('failed matrix cannot generate a fabricated ETA and output hides GPS',()=>{
  assert.deepEqual(previewRankCandidates([vaahak('a')],{kind:'ride'},{a:{seconds:null,meters:null,reachable:false}},NOW),[]);
  const arr=previewRankCandidates([vaahak('a')],{kind:'ride'},{a:{seconds:90,meters:1000,reachable:true}},NOW);
  assert.deepEqual(Object.keys(arr[0]).sort(),['pickupEtaSeconds','roadMeters','vaahakId'].sort());
});
test('job kinds must be explicit; unknown type cannot dispatch',()=>{
  assert.equal(assessVaahak(vaahak('a'),{kind:'pharmacy'},NOW).reason,'unknown_job_type');
  assert.equal(assessVaahak(vaahak('a'),{kind:'delivery'},NOW).eligible,true);
});
