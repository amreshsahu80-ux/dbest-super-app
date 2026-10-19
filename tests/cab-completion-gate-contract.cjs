const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('release/cab-completion-guard-review.sql','utf8');
for(const guard of ['for update','return_leg_not_started','payment_confirmation_required',
 'job_not_ready_to_complete','ride_completion_only','completion_race','already',
 "meta->>'roundTrip'","meta->>'sameVehicle'","meta->>'returnLegStatus'",
 "assigned_partner_id = p_partner_id", "kind <> 'ride'"]){
 assert.ok(sql.includes(guard),'Missing critical completion guard '+guard)
}
for(const status of ['Received','Prepaid','Paid','Razorpay Verified','Legacy Completed']){
 assert.ok(sql.includes("'"+status+"'"),'Completion compatibility missing status '+status)
}
const stages=[
 {name:'outbound payment pending',job:'Trip Started',payment:'Pending',round:false,returnStarted:false,expected:false},
 {name:'oneway cash received',job:'Trip Started',payment:'Received',round:false,returnStarted:false,expected:true},
 {name:'roundtrip return not started',job:'Trip Started',payment:'Received',round:true,returnStarted:false,expected:false},
 {name:'roundtrip complete',job:'Trip Started',payment:'Received',round:true,returnStarted:true,expected:true},
 {name:'not yet started',job:'Accepted',payment:'Received',round:false,returnStarted:false,expected:false},
 {name:'prepaid',job:'Trip Started',payment:'Prepaid',round:false,returnStarted:false,expected:true},
 {name:'failed payment',job:'Trip Started',payment:'Failed',round:false,returnStarted:false,expected:false}
];
const allowed=new Set(['Received','Prepaid','Paid','Razorpay Verified','Legacy Completed']);
for(const s of stages){let ok=s.job==='Trip Started'&&allowed.has(s.payment)&&(!s.round||s.returnStarted);assert.equal(ok,s.expected,s.name)}
console.log('Cab completion SQL guard contract passed; NOT a database execution.');
