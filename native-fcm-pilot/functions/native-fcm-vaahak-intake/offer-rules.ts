export type Ride = {
  id:string; kind:string; status:string; offered_partner_id:string|null;
  assigned_partner_id:string|null; offer_attempt:number|null;
  offer_expires_at:string|null; dispatch_last_at:string|null;
};
const ms=(s:string|null)=>s?Date.parse(s):NaN;

// Require an actual, current 5-minute unassigned ride offer.
// A one-minute buffer avoids queueing notifications too close to expiry.
export function eligible(r:Ride,now=Date.now()):boolean {
  const expires=ms(r.offer_expires_at),dispatched=ms(r.dispatch_last_at);
  return r.kind==="ride" && r.status==="Open" && !!r.offered_partner_id &&
    !r.assigned_partner_id && Number.isInteger(r.offer_attempt) &&
    Number(r.offer_attempt)>0 && Number.isFinite(expires) &&
    Number.isFinite(dispatched) && expires>now+60_000 &&
    expires<=now+330_000 && dispatched<=now+15_000 &&
    dispatched>=now-330_000;
}
export const dedupe=(r:Ride)=>
  "vaahak_ride_offer:"+r.id+":"+r.offer_attempt+":"+r.offered_partner_id;
