'use strict';
const assert=require('node:assert/strict');
const {groupedCatalogue}=require('../api/marketplace/grouped-catalogue');
const masters=[{id:'atta',name:'Aashirvaad Atta 5 kg',brand:'ITC',status:'approved',image_url:'https://example.com/common.jpg'}];
const vendors=[
 {id:'a',name:'Shop A',active:true,owner_approval:'Approved',operational_hold:false},
 {id:'b',name:'Shop B',active:true,owner_approval:'Approved',operational_hold:false},
 {id:'c',name:'Shop C',active:false,owner_approval:'Approved',operational_hold:false}
];
const offers=[
 {master_product_id:'atta',vendor_id:'a',price_inclusive_gst:280,mrp:300,stock:5,active:true},
 {master_product_id:'atta',vendor_id:'b',price_inclusive_gst:265,mrp:300,stock:3,active:true,vendor_image_url:'https://example.com/shop-b.jpg',vendor_image_review_status:'approved'},
 {master_product_id:'atta',vendor_id:'c',price_inclusive_gst:250,mrp:300,stock:3,active:true}
];
const result=groupedCatalogue({masters,offers,vendors});
assert.equal(result.length,1);
assert.equal(result[0].offers.length,2);
assert.equal(result[0].startingPriceInclusiveGst,265);
assert.equal(result[0].offers[0].vendorName,'Shop B');
assert.equal(result[0].offers[0].imageUrl,'https://example.com/shop-b.jpg');
assert.equal(result[0].offers[1].imageUrl,'https://example.com/common.jpg');
assert.equal(groupedCatalogue({masters,offers:offers.map(o=>({...o,stock:0})),vendors}).length,0);
assert.equal(groupedCatalogue({masters:masters.map(m=>({...m,status:'draft'})),offers,vendors}).length,0);
const suspendedVendors=vendors.map(v=>v.id==='b'?{...v,operational_hold:true}:v);
const afterSuspend=groupedCatalogue({masters,offers,vendors:suspendedVendors});
assert.equal(afterSuspend[0].offers.length,1);
assert.equal(afterSuspend[0].offers[0].vendorId,'a');
assert.equal(afterSuspend[0].startingPriceInclusiveGst,280);
const afterReinstate=groupedCatalogue({masters,offers,vendors:suspendedVendors.map(v=>v.id==='b'?{...v,operational_hold:false}:v)});
assert.equal(afterReinstate[0].offers.length,2);
assert.equal(afterReinstate[0].startingPriceInclusiveGst,265);
const afterTerminate=groupedCatalogue({masters,offers,vendors:vendors.map(v=>v.id==='b'?{...v,active:false,operational_hold:true}:v)});
assert.equal(afterTerminate[0].offers.length,1);
const allBlocked=groupedCatalogue({masters,offers,vendors:vendors.map(v=>({...v,operational_hold:true}))});
assert.equal(allBlocked.length,0);
console.log('Grouped multi-vendor catalogue and enforcement visibility tests passed');
