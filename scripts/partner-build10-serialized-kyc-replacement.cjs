'use strict';
// Build 10 isolated candidate: serialize same-key calls within one runtime.
// NOT a distributed lock. Edge Function instances require DB-backed fencing/CAS.
const { replaceKycDocument } = require('./partner-build10-safe-kyc-replacement.cjs');
const pending = new Map();
function keyOf(key) {
  if (!key || !['vendor','vaahak','service_partner'].includes(key.partner_kind) ||
      !key.partner_id || !key.doc_type) throw new Error('invalid_kyc_lock_key');
  return JSON.stringify([key.partner_kind, key.partner_id, key.doc_type]);
}
async function replaceKycDocumentSerialized(args) {
  const id = keyOf(args?.key);
  const previous = pending.get(id) || Promise.resolve();
  const operation = previous.catch(() => {}).then(() => replaceKycDocument(args));
  const tail = operation.catch(() => {});
  pending.set(id, tail);
  try { return await operation; }
  finally { if (pending.get(id) === tail) pending.delete(id); }
}
module.exports = { replaceKycDocumentSerialized };
