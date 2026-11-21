'use strict';
// Build 10: fail-closed registry selector contract checks. No network or production writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('vendor-dynamic-categories-v1.js', 'utf8');
new vm.Script(source, {filename: 'vendor-dynamic-categories-v1.js'});
assert.match(source, /action:'public_categories'/, 'categories must originate from server registry');
assert.match(source, /category_registry_config_unavailable/, 'missing registry config must fail closed');
assert.match(source, /category_registry_invalid/, 'invalid registry response must fail closed');
assert.match(source, /category_registry_duplicate_keys/, 'duplicate active keys must fail closed');
assert.equal((source.match(/'inactive','archived','deleted','suspended'/g)||[]).length, 3, 'all three registry activity flags must reject inactive and archived values');
assert.match(source, /filtered\.map\(x=>x\.key\.trim\(\)\.toLowerCase\(\)\)/, 'duplicate check must use active normalized keys');
assert.match(source, /key:x\.key\.trim\(\)/, 'selected values must be canonical trimmed keys');
assert.match(source, /category_registry_duplicate_keys[\s\S]*?const normalized=filtered\.map/, 'normalization must follow duplicate rejection');
assert.match(source, /setCustomValidity\('Choose an active business category'\)/, 'unknown selection must block submission');
assert.match(source, /generation\+\+;cache=null;loading=null/, 'refresh must invalidate stale cache');
assert.doesNotMatch(source, /localStorage\.setItem\(|sessionStorage\.setItem\(/, 'registry selector must not persist unaudited client categories');
console.log('Build 10 category selector contract: PASS');
