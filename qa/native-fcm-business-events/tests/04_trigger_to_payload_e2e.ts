/**
 * End-to-end, zero-network QA from actual PostgreSQL trigger outputs:
 * source insert/update -> outbox -> worker fromEvent revalidation ->
 * canary/policy decision -> exact Android Partner FCM data-only payload.
 * Uses only synthetic temporary CI records; does NOT send notifications.
 */
import { fromEvent } from "../edge/native-fcm-events/from-event.ts";
import { buildFcmPayload } from "../edge/native-fcm-events/payload.ts";
import { dispatchGate, isCurrentRecipient, selectedForCanary }
  from "../edge/native-fcm-events/dispatch-policy.ts";

function check(test:unknown, message:string):asserts test {
  if(!test)throw Error(message);
}
type Row=Record<string,unknown>;
type Tables=Record<string,Row[]>;
const path=Deno.args[0];
check(path, "Pass the exported ephemeral PostgreSQL fixture JSON path");
const state=JSON.parse(await Deno.readTextFile(path)) as {outbox:Row[];tables:Tables};
check(Array.isArray(state.outbox)&&state.outbox.length===8,
  "Expected precisely 8 real trigger-generated synthetic outbox events");
check(state.tables && Array.isArray(state.tables.vaahak_jobs_live),
  "Missing authoritative PostgreSQL source records");

function mockDatabase(tables:Tables) {
  return {
    from(table:string) {
      const filter:Array<[string,unknown]>=[];
      return {
        select(_cols:string){return this;},
        eq(col:string,val:unknown){filter.push([col,val]);return this;},
        async maybeSingle() {
          return {
            data:(tables[table]||[]).find(r=>
              filter.every(([col,val])=>String(r[col])===String(val)))??null,
            error:null,
          };
        },
      };
    },
  };
}
const db=mockDatabase(state.tables);
const counts:Record<string,number>={Vendor:0,Vaahak:0,"Service Partner":0};
const seenKeys=new Set<string>(), authoritativeKeys=new Set<string>(), staleKeys=new Set<string>();
const expectedCategory:Record<string,string>={
  marketplace_vendor_new_order:"order",vaahak_ride_offer:"ride",
  service_partner_job_assigned:"job",
};
const expectedRoute:Record<string,string>={
  marketplace_vendor_new_order:"/Vendor",vaahak_ride_offer:"/vaahak",
  service_partner_job_assigned:"/ServicePartnerDashboard",
};
const possibleRecipients:Record<string,Set<string>>={
  Vendor:new Set(["vendor-ok","vendor-two"]),
  Vaahak:new Set(["vaahak-one","vaahak-two"]),
  "Service Partner":new Set(["sp-approved"]),
};

// This is the exact same event-to-recipient selection function and payload
// builder the staged production worker imports; synthetic FCM tokens only.
for(const row of state.outbox){
  const eventKey=String(row.event_key||"");
  const eventType=String(row.event_type||"");
  const role=String(row.recipient_type||"");
  const recipient=String(row.recipient_id||"");
  check(expectedCategory[eventType]!==undefined,"Unexpected event type in outbox");
  check(!seenKeys.has(eventKey),"Duplicate event_key despite unique outbox");
  seenKeys.add(eventKey);
  check(possibleRecipients[role]?.has(recipient),"Misrouted event to disallowed recipient");
  check(String(row.category)===expectedCategory[eventType],"Category mismatch");
  check(String(row.target_url)===expectedRoute[eventType],"Deep link mismatch");
  check(eventKey.split(":").length===3,"Event key must contain event type, source, recipient");
  const recordId=eventKey.split(":")[1];
  const latest=await fromEvent(db,eventType,recordId);
  if(!isCurrentRecipient(row as {recipient_type:string;recipient_id:string;event_key:string},latest)){
    staleKeys.add(eventKey);
    continue; // Stale reassignment or already-accepted job MUST NOT send.
  }
  authoritativeKeys.add(eventKey);
  check(latest!==null,"Authoritative result unexpectedly missing");
  check(latest.recipient_type===role && latest.recipient_id===recipient,
    "Queue recipient differs from authoritative source");
  const payload=buildFcmPayload("synthetic-never-delivered-token",latest,
    {app_id:"com.dbest4u.partner"}).message;
  check(!("notification" in payload),
    "Production Partner FCM payload must be data-only for Android receiver");
  check(payload.data.eventType===eventType && payload.data.eventKey===eventKey,
    "FCM payload lost authoritative event identity");
  check(payload.data.targetUrl===expectedRoute[eventType],
    "FCM notification tap points to wrong workspace");
  check(payload.android.priority==="HIGH",
    "Partner FCM payload must be high priority");
  counts[role]++;
}
check(seenKeys.size===8,"Outbox did not preserve 8 events");
check(authoritativeKeys.size===5 && staleKeys.size===3,
  "Changed source records should suppress precisely 3 of the 8 queued notices");
check(counts.Vendor===3 && counts.Vaahak===0 && counts["Service Partner"]===2,
  "Wrong current dispatch-eligible role counts");
check(staleKeys.has("marketplace_vendor_new_order:order-cod:vendor-ok"),
  "Original Vendor should not receive order after reassignment");
check(staleKeys.has("vaahak_ride_offer:ride-offer:vaahak-one"),
  "Previous driver must not receive reassigned ride");
check(staleKeys.has("vaahak_ride_offer:ride-offer:vaahak-two"),
  "Driver must not receive already accepted ride");

// Test exact worker rollout policy without ever setting an environment secret.
// A canary role/account pair must not authorize a different role with same ID.
check(dispatchGate(false,"all",true)==="sending_disabled",
  "Production sender unexpectedly enabled");
check(dispatchGate(true,"off",false)==="rollout_mode_off",
  "Missing rollout mode unexpectedly permitted");
check(dispatchGate(true,"all",false)==="full_rollout_not_approved",
  "Missing full rollout approval permitted");
check(dispatchGate(true,"canary",false)===null,
  "Explicit canary mode blocked");
const allow=new Set<string>(["Vendor:vendor-two"]);
check(selectedForCanary("canary",allow,"Vendor","vendor-two"),
  "Canary Vendor excluded");
check(!selectedForCanary("canary",allow,"Service Partner","vendor-two"),
  "Canary cross-role identity leak");
check(!selectedForCanary("canary",allow,"Vendor","vendor-ok"),
  "Non-canary Vendor incorrectly permitted");
check(!selectedForCanary("off",allow,"Vendor","vendor-two"),
  "Sender incorrectly enabled when rollout is off");

console.log("PASS: actual SQL-triggered outbox -> source recheck -> correct role/deep link -> Partner FCM payload");
console.log("PASS: 8 queued, 5 still valid, 3 safely skipped (Vendor reassignment + 2 stale Vaahak offers)");
console.log("PASS: exact canary identity allowlist, send-disabled and full-rollout approval gates");
console.log("No Firebase API called; no real devices, users, orders or payment records were accessed.");
