// Isolated mocked contract tests: no Supabase, accounts, storage, or network writes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('partner-kyc-registration-upload-v2.js', 'utf8');
const responses = [];
const requests = [];
const token = 'qa-token-not-real';
const document = {
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener: () => {},
};
const sandbox = {
  window: { DBEST_RUNTIME_CONFIG: { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'public-test-key' } },
  document, location: { pathname: '/qa' },
  setInterval: () => 1, clearInterval: () => {},
  setTimeout: () => 1, console,
  fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, action: body.action, docType: body.docType, partnerKind: body.partnerKind });
    const response = responses.shift();
    assert.ok(response, 'Unexpected network call');
    return { ok: response.status !== 400, status: response.status || 200, json: async () => response.body };
  }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);
const upload = sandbox.window.DBEST_PARTNER_KYC_REGISTRATION_V2.upload;
const files = [{ docType: 'pan', file: { size: 10, type: 'application/pdf', name: 'test.pdf' } }];
// FileReader runs only in the VM, returning synthetic test bytes.
sandbox.FileReader = class {
  readAsDataURL() { this.result = 'data:application/pdf;base64,VEVTVA=='; this.onload(); }
};
(async () => {
  responses.push({ body: { ok: true, document: { doc_type: 'pan' } } },
    { body: { documents: [], kyc: { complete: false, missing: ['pan'] } } });
  await assert.rejects(upload('vendor', token, files), /kyc_documents_not_persisted_pan/);
  assert.deepEqual(requests.map(r => r.action), ['upload', 'list_own']);
  assert.ok(requests.every(r => r.url.endsWith('/functions/v1/partner-kyc-live')));
  requests.length = 0;
  responses.push({ body: { ok: true, document: { doc_type: 'pan' } } },
    { body: { documents: [{ doc_type: 'pan' }], kyc: { complete: true } } });
  assert.equal(await upload('vendor', token, files), 1, 'Confirmed retry must succeed');
  assert.deepEqual(requests.map(r => r.action), ['upload', 'list_own']);
  requests.length = 0;
  responses.push({ body: { ok: true, document: { doc_type: 'wrong_type' } } });
  await assert.rejects(upload('vaahak', token, files), /kyc_upload_unconfirmed_pan/);
  assert.deepEqual(requests.map(r => r.action), ['upload']);
  console.log('PASS: mocked KYC persistence failure, safe retry, upload confirmation guard; no live calls');
})().catch(err => { console.error(err); process.exitCode = 1; });
