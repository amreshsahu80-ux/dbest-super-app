/**
 * Run in a disposable in-process PostgreSQL database:
 *   npm install --no-save @electric-sql/pglite
 *   node tests/cab-ephemeral-postgres-completion.cjs
 *
 * Never connects to Supabase, never creates real rides or contacts a Vaahak.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
async function main(){
 const {PGlite}=await import('@electric-sql/pglite');
 const db=new PGlite();
 try{
  await db.exec("create table public.vaahak_jobs_live (id text primary key, assigned_partner_id text, kind text not null, status text not null, payment_status text, order_meta jsonb default '{}'::jsonb, completed_at timestamptz, updated_at timestamptz);");
  const sql=fs.readFileSync('release/cab-completion-guard-review.sql','utf8');
  await db.exec(sql);
  const data=[
   ['ONE_CASH','partner1','ride','Trip Started','Received',{}],
   ['ONE_UNPAID','partner1','ride','Trip Started','Pending',{}],
   ['ONE_ACCEPTED','partner1','ride','Accepted','Received',{}],
   ['ROUND_NOT_RETURNED','partner1','ride','Trip Started','Received',{roundTrip:true,sameVehicle:true}],
   ['ROUND_RETURNED','partner1','ride','Trip Started','Received',{roundTrip:true,sameVehicle:true,returnLegStatus:'started'}],
   ['ONE_PREPAID','partner1','ride','Trip Started','Prepaid',{}],
   ['DELIVERY','partner1','delivery','Trip Started','Received',{}],
   ['ONE_PAID','partner1','ride','Trip Started','Paid',{}],
   ['ONE_FAILED','partner1','ride','Trip Started','Failed',{}],
  ];
  for(const [id,partner,kind,status,payment,meta] of data){
   await db.query('insert into public.vaahak_jobs_live(id,assigned_partner_id,kind,status,payment_status,order_meta) values ($1,$2,$3,$4,$5,$6::jsonb)',[id,partner,kind,status,payment,JSON.stringify(meta)]);
  }
  const invoke=async(id,partner='partner1')=>{
   const r=await db.query('select public.dbest_complete_vaahak_job_live($1,$2) as result',[id,partner]);
   return r.rows[0].result;
  };
  assert.equal((await invoke('ONE_CASH','not-your-partner')).error,'job_not_found');
  const cases=[
   ['ONE_CASH',{ok:true,status:'Completed'}],
   ['ONE_UNPAID',{ok:false,error:'payment_confirmation_required'}],
   ['ONE_ACCEPTED',{ok:false,error:'job_not_ready_to_complete'}],
   ['ROUND_NOT_RETURNED',{ok:false,error:'return_leg_not_started'}],
   ['ROUND_RETURNED',{ok:true,status:'Completed'}],
   ['ONE_PREPAID',{ok:true,status:'Completed'}],
   ['DELIVERY',{ok:false,error:'ride_completion_only'}],
   ['ONE_PAID',{ok:true,status:'Completed'}],
   ['ONE_FAILED',{ok:false,error:'payment_confirmation_required'}]
  ];
  for(const [id,expected] of cases){
   const got=await invoke(id);
   assert.equal(got.ok,expected.ok,'completion mismatch '+id+': '+JSON.stringify(got));
   if(expected.error)assert.equal(got.error,expected.error,id);
   if(expected.status)assert.equal(got.status,expected.status,id);
  }
  let repeat=await invoke('ONE_CASH');
  assert.equal(repeat.ok,true);
  assert.equal(repeat.already,true,'replay must be idempotent');
  const rows=(await db.query('select id,status,completed_at from public.vaahak_jobs_live')).rows;
  const completed=new Set(rows.filter(r=>r.status==='Completed').map(r=>r.id));
  assert.deepEqual([...completed].sort(),['ONE_CASH','ONE_PAID','ONE_PREPAID','ROUND_RETURNED'].sort());
  assert.ok(rows.filter(r=>completed.has(r.id)).every(r=>r.completed_at),'Missing completion timestamp');
  console.log('PASS: real PostgreSQL completion transitions, authorization, payment, return leg, and duplicate idempotency. No external API called.');
 }finally{await db.close();}
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1});
