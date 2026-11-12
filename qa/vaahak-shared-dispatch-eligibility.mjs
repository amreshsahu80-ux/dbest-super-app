/**
 * DBest Vaahak unified Cab + Marketplace dispatch — PURE, QA-ONLY model.
 * NOT IMPORTED by any public site or dispatch endpoint.
 * Server authority must atomically enforce a single active job across BOTH types.
 * A caller must supply verified route durations, never invent travel times.
 */
const ACTIVE = new Set([
  'accepted','trip started','in progress','started','en route to vendor',
  'arrived at vendor','picked up','delivery started','en route to customer'
]);
const norm = x => String(x ?? '').trim().toLowerCase();
const validPoint = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
  Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
const kindOf = job => job?.kind === 'ride' ? 'ride' : job?.kind === 'delivery' ? 'delivery' : null;
export function assessVaahak(v, job, nowMs = Date.now()) {
  if (!kindOf(job)) return { eligible:false, reason:'unknown_job_type' };
  if (!v || v.ownerApproval !== 'Approved') return { eligible:false, reason:'not_approved' };
  if (v.available !== true) return { eligible:false, reason:'offline' };
  if (v.capabilities?.[kindOf(job)] !== true) return { eligible:false, reason:'service_not_enabled' };
  if ((v.activeJobs || []).some(j => ACTIVE.has(norm(j?.status))))
    return { eligible:false, reason:'already_assigned' };
  if ((v.pendingOffers || []).some(o => o?.reserved === true))
    return { eligible:false, reason:'another_offer_reserved' };
  const fix = v.location;
  if (!validPoint(fix)) return { eligible:false, reason:'location_invalid' };
  if (!Number.isFinite(fix.atMs) || fix.atMs > nowMs + 10000 ||
      nowMs - fix.atMs > 120000)
    return { eligible:false, reason:'location_stale' };
  return { eligible:true, reason:'eligible' };
}
/**
 * Sort verified *traffic/road* route-matrix results, not direct GPS distance.
 * Route matrix must be calculated from Vaahak -> passenger or vendor pickup.
 * Under no circumstance dispatch or change fares from this preview ranking.
 */
export function previewRankCandidates(vaahaks, job, routeByVaahakId, nowMs = Date.now(), limit=10) {
  const ranked=[];
  for (const v of vaahaks || []) {
    if (!assessVaahak(v,job,nowMs).eligible) continue;
    const route=routeByVaahakId?.[v.id];
    if (!route || !Number.isFinite(route.seconds) || route.seconds <= 0 ||
        !Number.isFinite(route.meters) || route.meters < 0 ||
        route.reachable !== true) continue;
    ranked.push({vaahakId:String(v.id),pickupEtaSeconds:route.seconds,roadMeters:route.meters});
  }
  return ranked.sort((a,b)=>a.pickupEtaSeconds-b.pickupEtaSeconds ||
    a.roadMeters-b.roadMeters || a.vaahakId.localeCompare(b.vaahakId))
    .slice(0,Math.max(0,Math.min(25,Number.isInteger(limit)?limit:10)));
}
