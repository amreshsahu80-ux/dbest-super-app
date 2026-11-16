'use strict';
const assert = require('node:assert/strict');
const { replaceKycDocument } = require('./partner-build10-safe-kyc-replacement.cjs');
async function scenario({ uploadFails = false, uploadThrows = false, persistFails = false, removeFails = false, readbackStale = false, committedButErrored = false, readbackThrows = false } = {}) {
  const removed = [];
  const previous = { storage_path: 'vendor/old.pdf' };
  let current = previous;
  let reads = 0;
  const storage = {
    async upload(path) { if (uploadThrows) throw new Error('storage unavailable'); return { error: uploadFails ? new Error('upload failed') : null }; },
    async remove(paths) { removed.push(...paths); if (removeFails) throw new Error('cleanup failed'); }
  };
  const documents = {
    async find() { reads++; if (readbackThrows && reads > 1) throw new Error('readback unavailable'); return readbackStale && reads > 1 ? previous : current; },
    async upsert(row) { if (persistFails) return { error: new Error('db failed') }; current = row; if (committedButErrored) return { error: new Error('response lost') }; return { data: row }; }
  };
  const call = () => replaceKycDocument({ storage, documents, key: { partner_kind: 'vendor', partner_id: 'TEST', doc_type: 'pan' }, bytes: Buffer.from('test'), contentType: 'application/pdf', fileName: 'new.pdf', path: 'vendor/new.pdf' });
  if (uploadFails || uploadThrows || persistFails || readbackStale || committedButErrored || readbackThrows) await assert.rejects(call);
  else assert.equal((await call()).storage_path, 'vendor/new.pdf');
  if (readbackThrows) { assert.deepEqual(removed, []); assert.equal(current.storage_path, 'vendor/new.pdf'); }
  else if (committedButErrored) { assert.deepEqual(removed, []); assert.equal(current.storage_path, 'vendor/new.pdf'); }
  else if (readbackStale) { assert.deepEqual(removed, []); assert.equal(current.storage_path, 'vendor/new.pdf'); }
  else if (uploadFails || uploadThrows) { assert.deepEqual(removed, []); assert.equal(current, previous); }
  else if (persistFails) { assert.deepEqual(removed, ['vendor/new.pdf']); assert.equal(current, previous); }
  else { assert.equal(current.storage_path, 'vendor/new.pdf'); assert.deepEqual(removed, ['vendor/old.pdf']); }
}
(async () => {
  await scenario();
  await scenario({ uploadFails: true });
  await scenario({ uploadThrows: true });
  await scenario({ persistFails: true });
  await scenario({ removeFails: true });
  // Never overwrite the currently referenced object: a retry must use a fresh path.
  {
    let uploaded = false;
    const previous = { storage_path: 'vendor/current.pdf' };
    await assert.rejects(() => replaceKycDocument({
      storage: { async upload() { uploaded = true; return { error: null }; } },
      documents: { async find() { return previous; } },
      key: { partner_kind: 'vendor', partner_id: 'TEST', doc_type: 'pan' },
      bytes: Buffer.from('retry'), contentType: 'application/pdf', fileName: 'retry.pdf', path: previous.storage_path
    }), /path_must_be_unique/);
    assert.equal(uploaded, false);
  }
  await scenario({ readbackStale: true });
  await scenario({ committedButErrored: true });
  await scenario({ readbackThrows: true });
  console.log('PASS: upload-first KYC replacement success, upload failure, thrown upload error, same-path retry rejection, persistence failure, cleanup failure, unconfirmed readback, ambiguous committed upsert, unavailable persistence readback');
})().catch(e => { console.error(e); process.exitCode = 1; });
