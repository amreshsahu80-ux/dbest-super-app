'use strict';
// Pure Owner review transition planner. Caller MUST authenticate/authorize Owner on server,
// lock the offer row, persist audit and transition atomically, and enforce idempotency.
// No SQL, secrets, live API calls or publication side effects here.
const STATES=new Set(['draft','pending_review','approved','rejected','suspended']);
function planReview({offer,master,decision,actor,reason,expectedVersion}) {
 if(!offer || !offer.id || !master || !master.id || String(offer.master_product_id)!==String(master.id))
   throw new Error('offer_master_mismatch');
 if(!actor || actor.isOwner!==true || !actor.id) throw new Error('owner_authorization_required');
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||offer.version!==expectedVersion)
   throw new Error('stale_review_version');
 if(!STATES.has(offer.review_status)) throw new Error('invalid_prior_status');
 if(!['approve','reject','suspend'].includes(decision)) throw new Error('invalid_decision');
 if(decision==='approve' && master.status!=='approved') throw new Error('master_not_approved');
 if(decision==='approve' && (offer.stock<=0 || offer.active!==true))
   throw new Error('offer_not_sellable');
 if(decision!=='approve' && (!reason || !String(reason).trim()))
   throw new Error('review_reason_required');
 const next={approve:'approved',reject:'rejected',suspend:'suspended'}[decision];
 if(offer.review_status===next) throw new Error('duplicate_review');
 return Object.freeze({
  offerId:String(offer.id),expectedVersion,nextVersion:expectedVersion+1,
  previousStatus:offer.review_status,nextStatus:next,
  audit:Object.freeze({offer_id:String(offer.id),actor_id:String(actor.id),
   prior_status:offer.review_status,new_status:next,reason:String(reason||'').trim()})
 });
}
module.exports={planReview};
