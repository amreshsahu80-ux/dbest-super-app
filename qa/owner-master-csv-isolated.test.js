'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateMasterRow,validateMasterBatch}=require('../lib/owner-master-csv-isolated');
const valid={category:'Electronics',name:'Desk Lamp',mrp:'799.00',description:'LED lamp',dimensions:'20 x 10 x 5 cm',image_url:'https://example.com/lamp.jpg'};
test('accepts full master CSV row',()=>{const r=validateMasterRow(valid);assert.equal(r.valid,true);assert.equal(r.record.mrp,799)});
test('requires MRP, descriptions, dimensions and images',()=>{const r=validateMasterRow({category:'Grocery',name:'Rice'});assert.equal(r.valid,false);assert.ok(r.errors.includes('mrp_required'));assert.ok(r.errors.includes('dimensions_required'))});
test('rejects non-HTTPS images',()=>assert.ok(validateMasterRow({...valid,image_url:'http://example.com/a.jpg'}).errors.includes('image_must_be_https')));
test('rejects malformed price',()=>assert.ok(validateMasterRow({...valid,mrp:'-5'}).errors.includes('invalid_mrp')));
test('reports original CSV row number',()=>assert.equal(validateMasterBatch([valid])[0].rowNumber,2));
