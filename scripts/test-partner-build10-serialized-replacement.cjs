'use strict';
const assert = require('node:assert/strict');
const { replaceKycDocumentSerialized } = require('./partner-build10-serialized-kyc-replacement.cjs');
const key = { partner_kind: 'vendor', partner_id: 'ISOLATED', doc_type: 'pan' };
let row = { storage_path: 'old.pdf' };
let active = 0, maxActive = 0, uploads = [];
const storage = {
  async upload(path) {
    active++; maxActive = Math.max(active, maxActive);
    await new Promise(resolve => setTimeout(resolve, 15));
    active--;
    uploads.push(path);
    return { error: null };
  },
  async remove() {}
};
const documents = {
  async find() { return row; },
  async upsert(next) { row = next; return { data: next }; }
};
const args = path => ({ key, storage, documents, path, bytes: Buffer.from('test'),
  contentType: 'application/pdf', fileName: path });
(async () => {
  await Promise.all([
    replaceKycDocumentSerialized(args('first.pdf')),
    replaceKycDocumentSerialized(args('second.pdf'))
  ]);
  assert.equal(maxActive, 1, 'same-key operations must not overlap in one runtime');
  assert.deepEqual(uploads, ['first.pdf', 'second.pdf']);
  assert.equal(row.storage_path, 'second.pdf');
  await assert.rejects(() => replaceKycDocumentSerialized({ ...args('third.pdf'),
    key: { ...key, partner_kind: 'invalid' } }), /invalid_kyc_lock_key/);
  console.log('PASS: isolated same-key serialization, ordered persistence, invalid lock-key rejection');
})().catch(error => { console.error(error); process.exitCode = 1; });
