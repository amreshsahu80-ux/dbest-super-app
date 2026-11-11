// Test the exact source revalidation module imported by staged worker.
// All source records are synthetic; there are no external requests.
import { fromEvent } from "../edge/native-fcm-events/from-event.ts";

type Row = Record<string, any>;
type Tables = Record<string, Row[]>;
function expect(x:unknown,msg:string):asserts x { if(!x)throw Error(msg); }
const future=()=>new Date(Date.now()+300000).toISOString();
const past=()=>new Date(Date.now()-300000).toISOString();

function database(tables:Tables) {
  return {
    from(table:string) {
      const filters:Array<[string,unknown]>=[];
      return {
        select(_columns:string){return this;},
        eq(column:string,value:unknown){filters.push([column,value]);return this;},
        async maybeSingle(){
          const data=(tables[table]||[]).find(row=>filters.every(([k,v])=>row[k]===v))||null;
          return {data,error:null};
        }
      };
    }
  };
}
const order=(v:Row={})=>({id:"order1",vendor_id:"vendor1",status:"Order Placed",vendor_status:"New Order",payment_status:"Pending",payment_method:"Pay at Delivery",customer_member_id:"member1",...v});
const vendor=(v:Row={})=>({id:"vendor1",owner_approval:"Approved",active:true,operational_hold:false,...v});
const trip=(v:Row={})=>({id:"ride1",kind:"ride",status:"Open",offered_partner_id:"driver1",assigned_partner_id:null,offer_expires_at:future(),customer_member_id:"member1",...v});
const driver=(v:Row={})=>({id:"driver1",owner_approval:"Approved",available:true,operational_hold:false,...v});
const job=(v:Row={})=>({id:"job1",status:"Assigned",assigned_partner_member_id:"service1",member_id:"member1",...v});
const profile=(v:Row={})=>({member_id:"service1",approval_status:"Approved",active:true,operational_hold:false,...v});
const account=(v:Row={})=>({account_id:"service1",account_status:"Active",roles:["service_partner"],...v});
const orderDb=(o:Row=order(),v:Row=vendor()):Tables=>({marketplace_orders_live:[o],marketplace_vendors_live:[v]});
const rideDb=(t:Row=trip(),d:Row=driver()):Tables=>({vaahak_jobs_live:[t],vaahak_partners_live:[d]});
const serviceDb=(j:Row=job(),p:Row=profile(),a:Row=account()):Tables=>({hyperlocal_jobs_live:[j],service_partner_profiles_live:[p],partner_accounts_live:[a]});
const vendorEvent="marketplace_vendor_new_order", rideEvent="vaahak_ride_offer", serviceEvent="service_partner_job_assigned";
const get=(tables:Tables,event:string,id:string)=>fromEvent(database(tables),event,id);

Deno.test("Vendor: only actionable order goes to exact approved Vendor",async()=>{
  const e=await get(orderDb(),vendorEvent,"order1");
  expect(e?.recipient_type==="Vendor" && e.recipient_id==="vendor1","wrong Vendor target");
  expect(e.event_key==="marketplace_vendor_new_order:order1:vendor1","Vendor event key");
  expect(e.target_url==="/Vendor" && e.category==="order","Vendor route");
});
Deno.test("Vendor: payment guards honor upfront vs pay at delivery",async()=>{
  for(const [payment_method,payment_status,expected] of [
    ["Razorpay","Pending",false],
    ["Razorpay","Received",true],
    ["Pay Online at Delivery - Razorpay","Pending",true],
    ["Pay at Delivery","Pending",true]
  ] as Array<[string,string,boolean]>) {
    const e=await get(orderDb(order({payment_method,payment_status})),vendorEvent,"order1");
    expect(!!e===expected,"Vendor payment guard failed for "+payment_method+"/"+payment_status);
  }
});
Deno.test("Vendor: cancel, accepted, held, unapproved suppress",async()=>{
  for(const changed of [{status:"Delivery Cancelled"},{vendor_status:"Accepted"},{status:"Payment Pending"}]){
    expect(await get(orderDb(order(changed)),vendorEvent,"order1")===null,"non-actionable Vendor order");
  }
  for(const changed of [{owner_approval:"Pending"},{operational_hold:true},{active:false}]){
    expect(await get(orderDb(order(),vendor(changed)),vendorEvent,"order1")===null,"ineligible Vendor");
  }
});
Deno.test("Vendor: reassignment changes event key to prevent old-recipient delivery",async()=>{
  const tables=orderDb();tables.marketplace_vendors_live.push(vendor({id:"vendor2"}));
  const before=await get(tables,vendorEvent,"order1");
  tables.marketplace_orders_live[0].vendor_id="vendor2";
  const after=await get(tables,vendorEvent,"order1");
  expect(before?.recipient_id==="vendor1" && after?.recipient_id==="vendor2","Vendor reassignment targeting");
  expect(before?.event_key!==after?.event_key,"Vendor reassignment key");
});
Deno.test("Vaahak: only current unexpired offer is eligible",async()=>{
  const e=await get(rideDb(),rideEvent,"ride1");
  expect(e?.recipient_type==="Vaahak" && e.recipient_id==="driver1","Vaahak target");
  expect(e.event_key==="vaahak_ride_offer:ride1:driver1","Vaahak key");
  expect(e.target_url==="/vaahak","Vaahak route");
  for(const changed of [{status:"Accepted"},{status:"Cancelled"},{offer_expires_at:past()},{offered_partner_id:null}]){
    expect(await get(rideDb(trip(changed)),rideEvent,"ride1")===null,"invalid Vaahak offer");
  }
});
Deno.test("Vaahak: held/unavailable/unapproved driver cannot receive",async()=>{
  for(const changed of [{owner_approval:"Pending"},{operational_hold:true},{available:false}]){
    expect(await get(rideDb(trip(),driver(changed)),rideEvent,"ride1")===null,"disallowed Vaahak");
  }
});
Deno.test("Vaahak: reassignment and expiry invalidate queued message",async()=>{
  const tables=rideDb();tables.vaahak_partners_live.push(driver({id:"driver2"}));
  const before=await get(tables,rideEvent,"ride1");
  tables.vaahak_jobs_live[0].offered_partner_id="driver2";
  const after=await get(tables,rideEvent,"ride1");
  expect(before?.recipient_id==="driver1"&&after?.recipient_id==="driver2","Vaahak reroute");
  expect(before?.event_key!==after?.event_key,"Vaahak event key stale check");
  tables.vaahak_jobs_live[0].offer_expires_at=past();
  expect(await get(tables,rideEvent,"ride1")===null,"Vaahak expired revalidation");
});
Deno.test("Service Partner: approved account with exact role is eligible",async()=>{
  const e=await get(serviceDb(),serviceEvent,"job1");
  expect(e?.recipient_type==="Service Partner" && e.recipient_id==="service1","Service Partner recipient");
  expect(e.event_key==="service_partner_job_assigned:job1:service1","Service Partner key");
  expect(e.target_url==="/ServicePartnerDashboard","Service Partner destination");
});
Deno.test("Service Partner: pending, rejected, blocked and wrong role suppressed",async()=>{
  for(const changed of [{approval_status:"Pending"},{approval_status:"Rejected"},{operational_hold:true},{active:false}]){
    expect(await get(serviceDb(job(),profile(changed)),serviceEvent,"job1")===null,"disallowed Service Partner profile");
  }
  for(const changed of [{account_status:"Suspended"},{roles:["vendor"]}]){
    expect(await get(serviceDb(job(),profile(),account(changed)),serviceEvent,"job1")===null,"disallowed Service Partner account");
  }
  for(const status of ["Open","Accepted","Completed","Cancelled"]){
    expect(await get(serviceDb(job({status})),serviceEvent,"job1")===null,"bad Service Partner status "+status);
  }
});
Deno.test("Service Partner: reassignment and revoked approval invalidate queued message",async()=>{
  const tables=serviceDb();
  tables.service_partner_profiles_live.push(profile({member_id:"service2"}));
  tables.partner_accounts_live.push(account({account_id:"service2"}));
  const before=await get(tables,serviceEvent,"job1");
  tables.hyperlocal_jobs_live[0].assigned_partner_member_id="service2";
  const after=await get(tables,serviceEvent,"job1");
  expect(before?.recipient_id==="service1"&&after?.recipient_id==="service2","SP reassignment");
  expect(before?.event_key!==after?.event_key,"SP stale event key");
  tables.service_partner_profiles_live[1].approval_status="Rejected";
  expect(await get(tables,serviceEvent,"job1")===null,"SP revoked after queueing");
});
Deno.test("Any role: missing record, unknown event or missing ID gives no notification",async()=>{
  const tables=orderDb();
  for(const [event,id] of [[vendorEvent,"missing"],[vendorEvent,""],["spoofed","order1"],[rideEvent,"missing"]]){
    expect(await get(tables,event,id)===null,"bad event still eligible "+event+"/"+id);
  }
});
