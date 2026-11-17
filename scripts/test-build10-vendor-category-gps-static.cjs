'use strict';
// Build 10 isolated regression guard. Static checks only; not an end-to-end approval.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'vendor.html'), 'utf8');
const categories = ['grocery','restaurant','medicine','fashion','electronics','other'];
const select = html.match(/<select\s+name="type"[^>]*>([\s\S]*?)<\/select>/);
assert.ok(select, 'Vendor category selector missing');
assert.match(select[0], /required/, 'Vendor category must be required');
assert.match(select[1], /value=""[^>]*disabled[^>]*selected/, 'Do not silently default to grocery');
for (const category of categories) {
  assert.match(select[1], new RegExp('<option\\s+value="'+category+'"'), 'Missing category '+category);
}
assert.match(html, /type:category/, 'Selected category must be sent unchanged to registration');
assert.match(html, /\['grocery','restaurant','medicine','fashion','electronics','other'\]\.includes\(category\)/, 'Category allowlist must match UI');
assert.match(html, /vendor\.lat!==null&&vendor\.lat!==undefined/, 'Null latitude must not count as GPS ready');
assert.match(html, /vendor\.lng!==null&&vendor\.lng!==undefined/, 'Null longitude must not count as GPS ready');
assert.match(html, /Math\.abs\(Number\(vendor\.lat\)\)<=90/, 'Latitude bounds missing');
assert.match(html, /Math\.abs\(Number\(vendor\.lng\)\)<=180/, 'Longitude bounds missing');
console.log('PASS: six category values, explicit selection, registration mapping, null-safe GPS readiness');
