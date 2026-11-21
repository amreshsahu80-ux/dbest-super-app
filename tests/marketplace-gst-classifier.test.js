'use strict';
const assert=require('node:assert/strict');
const {resolveGst}=require('../api/marketplace/gst-classifier');
const registry=[
 {hsnSac:'0401',ratePercent:0,reviewed:true,effectiveFrom:'2026-01-01',source:'reviewed-tax-table'},
 {hsnSac:'0401',ratePercent:5,reviewed:false,effectiveFrom:'2026-01-01'},
 {sku:'SAMPLE-01',ratePercent:18,reviewed:true,effectiveFrom:'2026-01-01'},
 {barcode:'8900000000001',ratePercent:12,reviewed:true,effectiveFrom:'2027-01-01'}
];
assert.equal(resolveGst({product:{hsnSac:'0401',taxInclusive:true},registry,asOf:'2026-11-21'}).ratePercent,0);
assert.equal(resolveGst({product:{sku:'sample-01',taxInclusive:false},registry,asOf:'2026-11-21'}).ratePercent,18);
assert.equal(resolveGst({product:{name:'Milk',taxInclusive:true},registry,asOf:'2026-11-21'}).status,'review_required');
assert.equal(resolveGst({product:{barcode:'8900000000001',taxInclusive:true},registry,asOf:'2026-11-21'}).status,'review_required');
assert.equal(resolveGst({product:{hsnSac:'0401'},registry,asOf:'2026-11-21'}).reason,'tax_inclusive_unknown');
assert.equal(resolveGst({product:{hsnSac:'0401',taxInclusive:true},registry:[...registry,{hsnSac:'0401',ratePercent:5,reviewed:true,effectiveFrom:'2026-01-01'}],asOf:'2026-11-21'}).reason,'conflicting_tax_classifications');
console.log('GST classifier: 6 assertions passed');
