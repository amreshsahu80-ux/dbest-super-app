'use strict';
const assert = require('node:assert/strict');
const { replaceKycDocument } = require('./partner-build10-safe-kyc-replacement.cjs');
async function scenario({ uploadFails = false, persistFails = false, removeFails = false, readbackStale = false, committedButErrored = false } = {}) {
  const removed = [];
  const previous = { storage_path: 'vendor/old.pdf' };
  let current = previous;
  let reads = 0;
  const storage = {
    async upload(path) { return { error: uploadFails ? new Error('upload failed') : null }; },
    async remove(paths) { removed.push(...paths); if (removeFails) throw new Error('cleanup failed'); }
  };
  const documents = {
    async find() { reads++; return readbackStale && reads > 1 ? previous : current; },
    async upsert(row) { if (persistFails) return { error: new Error('db failed') }; current = row; if (committedButErrored) return { error: new Error('response lost') }; return { data: row }; }
  };
  const call = () => replaceKycDocument({ storage, documents, key: { partner_kind: 'vendor', partner_id: 'TEST', doc_type: 'pan' }, bytes: Buffer.from('test'), contentType: 'application/pdf', fileName: 'new.pdf', path: 'vendor/new.pdf' });
  if (uploadFails || persistFails || readbackStale || committedButErrored) await assert.rejects(call);
  else assert.equal((await call()).storage_path, 'vendor/new.pdf');
  if (committedButErrored) { assert.deepEqual(removed, []); assert.equal(current.storage_path, 'vendor/new.pdf'); }
  else if (readbackStale) { assert.deepEqual(removed, []); assert.equal(current.storage_path, 'vendor/new.pdf'); }
  else if (uploadFails) { assert.deepEqual(removed, []); assert.equal(current, previous); }
  else if (persistFails) { assert.deepEqual(removed, ['vendor/new.pdf']); assert.equal(current, previous); }
  else { assert.equal(current.storage_path, 'vendor/new.pdf'); assert.deepEqual(removed, ['vendor/old.pdf']); }
}
(async () => {
  await scenario();
  await scenario({ uploadFails: true });
  await scenario({ persistFails: true });
  await scenario({ removeFails: true });
  await scenario({ readbackStale: true });
  await scenario({ committedButErrored: true });
  console.log('PASS: upload-first KYC replacement success, upload failure, persistence failure, cleanup failure, unconfirmed readback, ambiguous committed upsert');
})().catch(e => { console.error(e); process.exitCode = 1; });
