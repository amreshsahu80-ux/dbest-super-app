'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const ts=require('typescript');

const base='supabase/functions/';
const fns={
  commerce:'vaahak-commerce-live',
  sync:'marketplace-vaahak-sync',
  handover:'marketplace-handover-live'
};
const enc=new TextEncoder();
const hash=async s=>Buffer.from(await crypto.webcrypto.subtle.digest('SHA-256',enc.encode(s))).toString('hex');

function buildDb(seed={}){
  const tables=Object.fromEntries(Object.entries(seed).map(([k,v])=>[k,structuredClone(v)]));
  const audit=[];
  const table=name=>tables[name]||(tables[name]=[]);
  class Query {
    constructor(name){this.name=name;this.filters=[];this.operation=null;this.value=null;this.selected=null}
    eq(k,v){this.filters.push(row=>String(row[k])===String(v));return this}
    gt(k,v){this.filters.push(row=>String(row[k])>String(v));return this}
    in(k,vals){this.filters.push(row=>vals.includes(row[k]));return this}
    is(k,v){this.filters.push(row=>v===null?row[k]==null:row[k]===v);return this}
    select(s){this.selected=s;return this}
    order(){return this}
    limit(){return this}
    update(obj){this.operation='update';this.value=obj;return this}
    upsert(obj){this.operation='upsert';this.value=obj;return this}
    matches(){return table(this.name).filter(row=>this.filters.every(f=>f(row)))}
    exec(){
      if(this.operation==='update'){
        const found=this.matches();
        for(const row of found)Object.assign(row,structuredClone(this.value));
        audit.push({table:this.name,action:'update',rows:found.length,values:structuredClone(this.value)});
        return {data:this.selected?(found[0]||null):found,error:null}
      }
      if(this.operation==='upsert'){
        const found=table(this.name).find(row=>row.order_id===this.value.order_id && row.event===this.value.event);
        if(found)Object.assign(found,this.value);else table(this.name).push(structuredClone(this.value));
        audit.push({table:this.name,action:'upsert',values:structuredClone(this.value)});
        return {data:this.value,error:null}
      }
      const rows=this.matches();
      return {data:rows,error:null}
    }
    maybeSingle(){const r=this.exec();return Promise.resolve({data:Array.isArray(r.data)?r.data[0]||null:r.data,error:r.error})}
    single(){return this.maybeSingle()}
    then(ok,bad){return Promise.resolve(this.exec()).then(ok,bad)}
  }
  return {from:(name)=>new Query(name),rpc:async()=>({data:{ok:true},error:null}),tables,audit}
}

async function fixture({status='Trip Started',paid=true,alreadyCompleted=false}={}){
 const vh=await hash('VAH_QA_SESSION'),mem=await hash('MEM_QA_SESSION');
 const jobStatus=alreadyCompleted?'Completed':status;
 const completedAt=alreadyCompleted?'2026-10-19T09:10:11.000Z':null;
 const db=buildDb({
  vaahak_sessions_live:[{partner_id:'VAH_QA',token_hash:vh,expires_at:'2031-01-01T00:00:00Z'}],
  member_sessions_live:[{member_id:'MEM_QA',token_hash:mem,expires_at:'2031-01-01T00:00:00Z'}],
  vaahak_partners_live:[{id:'VAH_QA',name:'QA Mock Driver',available:true,can_deliver:true}],
  vaahak_jobs_live:[{id:'JOB_QA',kind:'delivery',status:jobStatus,assigned_partner_id:'VAH_QA',payment_status:paid?'Received':'Pending',completed_at:completedAt,order_meta:{marketplaceOrderId:'ORDER_QA'}}],
  marketplace_orders_live:[{id:'ORDER_QA',customer_member_id:'MEM_QA',master_order_id:'MASTER_QA',vaahak_job_id:'JOB_QA',status:'Product Picked Up / Out for Delivery',vendor_status:'Ready for Pickup',payment_status:paid?'Received':'Pending',payment_method:'Pay Online at Delivery - Razorpay',completed_at:completedAt}],
  marketplace_master_orders_live:[{id:'MASTER_QA',status:'Processing',completed_child_count:0,child_order_count:1,payment_status:'Pending'}],
  marketplace_handover_events:[{order_id:'ORDER_QA',job_id:'JOB_QA',event:'vendor_handover_confirmed'},{order_id:'ORDER_QA',job_id:'JOB_QA',event:'customer_delivery_confirmed'}]
 });
 return db;
}
function handler(name,db){
 let fn;
 let source=fs.readFileSync(base+name+'/index.ts','utf8').replace(/^import[^\n]*\n/gm,'');
 const transpiled=ts.transpileModule(source,{fileName:name+'.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const env={SUPABASE_URL:'https://example.local',SUPABASE_SERVICE_ROLE_KEY:'QA_FAKE_SERVICE',SUPABASE_ANON_KEY:'QA_PUBLIC',SUPABASE_PUBLISHABLE_KEYS:'{}'};
 const ctx={Deno:{env:{get:(key)=>env[key]||''},serve:(cb)=>{fn=cb}},createClient:()=>db,TextEncoder,Response,Request,Headers,crypto:crypto.webcrypto,console,URL,Date,Math,JSON,setTimeout,clearTimeout};
 vm.runInNewContext(transpiled,ctx,{filename:name+'.js',timeout:3500});
 assert.equal(typeof fn,'function','Edge handler must register');
 return async(action,token='VAH_QA_SESSION',other={})=>{
  const h={'Content-Type':'application/json',apikey:'QA_PUBLIC','x-vaahak-token':token,'x-dbest-member-token':token==='MEM_QA_SESSION'?token:''};
  const request=new Request('https://example.local/functions/v1/'+name,{method:'POST',headers:h,body:JSON.stringify({action,jobId:'JOB_QA',orderId:'ORDER_QA',step:action,...other})});
  const response=await fn(request);return {status:response.status,body:await response.json()}
 };
}
const row=(db,table)=>db.tables[table][0];
const finished=db=>{
 assert.equal(row(db,'vaahak_jobs_live').status,'Completed');
 assert.equal(row(db,'marketplace_orders_live').status,'Delivered / Completed');
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Delivered / Completed');
 assert.equal(row(db,'marketplace_orders_live').payment_status,'Received');
};

test('Vaahak delivery completion synchronizes both Customer and Vendor milestones',async()=>{
 const db=await fixture();
 const send=handler(fns.commerce,db);
 const result=await send('complete_delivery');
 assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(result.body.ok,true);
 finished(db);
 assert.equal(row(db,'marketplace_master_orders_live').status,'Completed');
 assert.equal(row(db,'marketplace_master_orders_live').payment_status,'Paid');
 assert(!db.audit.some(x=>x.table==='transactions'),'Never mutate the financial ledger in completion');
});

test('Unpaid delivery cannot be marked Completed or change Vendor stage',async()=>{
 const db=await fixture({paid:false});
 const result=await handler(fns.commerce,db)('complete_delivery');
 assert.equal(result.status,409);
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Ready for Pickup');
 assert.equal(row(db,'vaahak_jobs_live').status,'Trip Started');
 assert.equal(db.audit.length,0,'No writes on unpaid completion attempt');
});

test('Delivery sync repairs Vendor milestone on late completion event',async()=>{
 const db=await fixture({alreadyCompleted:true});
 const result=await handler(fns.sync,db)('sync','VAH_QA_SESSION',{step:'complete'});
 assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Delivered / Completed');
 assert.equal(row(db,'marketplace_orders_live').status,'Delivered / Completed');
});

test('Late payment event cannot regress a completed Vendor stage',async()=>{
 const db=await fixture({alreadyCompleted:true});
 const result=await handler(fns.sync,db)('sync','VAH_QA_SESSION',{step:'payment'});
 assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(row(db,'marketplace_orders_live').status,'Delivered / Completed');
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Delivered / Completed');
});

test('Sync cannot mark an unpaid completed job as Received',async()=>{
 const db=await fixture({alreadyCompleted:true,paid:false});
 const result=await handler(fns.sync,db)('sync','VAH_QA_SESSION',{step:'complete'});
 assert.equal(result.status,409);
 assert.equal(row(db,'marketplace_orders_live').payment_status,'Pending');
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Ready for Pickup');
 assert.equal(db.audit.length,0);
});

test('Customer confirm after Vaahak Completed repairs order without changing original job completion timestamp',async()=>{
 const db=await fixture({alreadyCompleted:true});
 const previous=row(db,'vaahak_jobs_live').completed_at;
 const orderPrevious=row(db,'marketplace_orders_live').completed_at;
 const result=await handler(fns.handover,db)('member_confirm_delivery','MEM_QA_SESSION');
 assert.equal(result.status,200,JSON.stringify(result.body));
 finished(db);
 assert.equal(row(db,'vaahak_jobs_live').completed_at,previous);
 assert.equal(row(db,'marketplace_orders_live').completed_at,orderPrevious);
 assert.equal(db.audit.filter(x=>x.table==='vaahak_jobs_live').length,0);
});

test('Customer confirm before Vaahak completion records matching Customer/Vendor completed milestones',async()=>{
 const db=await fixture();
 const result=await handler(fns.handover,db)('member_confirm_delivery','MEM_QA_SESSION');
 assert.equal(result.status,200,JSON.stringify(result.body));
 finished(db);
});

test('Vaahak completion after Customer-first success returns already-completed without duplicating settlement writes',async()=>{
 const db=await fixture();
 const first=await handler(fns.handover,db)('member_confirm_delivery','MEM_QA_SESSION');
 assert.equal(first.status,200);
 const priorWrites=db.audit.length;
 const result=await handler(fns.commerce,db)('complete_delivery');
 assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(result.body.already,true);
 assert.equal(db.audit.length,priorWrites,'Already-completed Vaahak retry must not update anything');
 finished(db);
});

test('Repeated Customer confirmation does not re-trigger Vendor settlement on an already-synchronized completed order',async()=>{
 const db=await fixture({alreadyCompleted:true});
 Object.assign(row(db,'marketplace_orders_live'),{status:'Delivered / Completed',vendor_status:'Delivered / Completed'});
 const result=await handler(fns.handover,db)('member_confirm_delivery','MEM_QA_SESSION');
 assert.equal(result.status,200,JSON.stringify(result.body));
 finished(db);
 assert.equal(db.audit.filter(x=>x.table==='marketplace_orders_live').length,0,'No repeated completed order writes');
 assert.equal(db.audit.filter(x=>x.table==='vaahak_jobs_live').length,0);
});

test('Unpaid customer confirmation is rejected without changing order or job status',async()=>{
 const db=await fixture({paid:false});
 const result=await handler(fns.handover,db)('member_confirm_delivery','MEM_QA_SESSION');
 assert.equal(result.status,409);
 assert.equal(row(db,'marketplace_orders_live').vendor_status,'Ready for Pickup');
 assert.equal(row(db,'vaahak_jobs_live').status,'Trip Started');
 assert.equal(db.audit.length,0);
});

test('Vaahak ride is not eligible for marketplace delivery completion',async()=>{
 const db=await fixture();
 row(db,'vaahak_jobs_live').kind='ride';
 const result=await handler(fns.commerce,db)('complete_delivery');
 assert.equal(result.status,409);
 assert.equal(row(db,'vaahak_jobs_live').status,'Trip Started');
 assert.equal(db.audit.length,0);
});
