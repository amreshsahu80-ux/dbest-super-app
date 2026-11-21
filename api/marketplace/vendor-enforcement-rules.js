'use strict';
// Owner vendor enforcement. Reversible suspension preserves historical orders.
// This is a pure policy module; the API must authenticate an owner and persist
// vendor state + an immutable audit entry in one database transaction.
function ownerVendorDecision({actorAdminId,vendor,action,reason}){
 if(!actorAdminId)throw Error('owner_session_required');
 if(!vendor||!vendor.id)throw Error('vendor_not_found');
 if(!['suspend','reinstate','terminate'].includes(action))throw Error('invalid_vendor_action');
 if(action!=='reinstate'&&(!reason||String(reason).trim().length<10))throw Error('reason_required');
 if(action==='reinstate'&&vendor.terminated_at)throw Error('terminated_vendor_cannot_reinstate');
 const changes=action==='reinstate'
  ?{operational_hold:false}
  :action==='suspend'
   ?{operational_hold:true}
   :{operational_hold:true,active:false};
 return {vendorId:vendor.id,action,changes,audit:{
  vendor_id:vendor.id,actor_admin_id:String(actorAdminId),
  action,reason:String(reason||'').trim(),
  previous_active:vendor.active,previous_operational_hold:vendor.operational_hold
 }};
}
module.exports={ownerVendorDecision};
