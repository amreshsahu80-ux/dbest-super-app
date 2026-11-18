// Offline regression fixture for deployed marketplace-local-catalog-live v14 (2026-11-18).
// No network, credentials, or production writes. Models the observed exact-category and location gates.
const assert = require('node:assert/strict');
const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const eligible = (v, category) => v.owner_approval === 'Approved' && v.active === true &&
  v.operational_hold === false && v.agreement_status === 'Fully Signed' &&
  (!category || v.type === category) && (v.type === 'digital' || (finite(v.lat) && finite(v.lng)));
const base = {owner_approval:'Approved',active:true,operational_hold:false,agreement_status:'Fully Signed'};
const grocery = {...base,type:'grocery',lat:22.7,lng:85.6};
const electronics = {...base,type:'other',lat:null,lng:null};
assert.equal(eligible(grocery,'grocery'),true);
assert.equal(eligible(electronics,'electronics'),false);
assert.equal(eligible({...electronics,type:'electronics'},'electronics'),false);
assert.equal(eligible({...electronics,lat:22.7,lng:85.6},'electronics'),false);
assert.equal(eligible({...electronics,type:'electronics',lat:22.7,lng:85.6},'electronics'),true);
assert.equal(eligible({...grocery,owner_approval:'Pending'},'grocery'),false);
assert.equal(eligible({...grocery,operational_hold:true},'grocery'),false);
assert.equal(eligible({...electronics,type:'digital'},'digital'),true);
console.log('Marketplace vendor gate fixture passed (8 assertions; distance and product gates not simulated).');
