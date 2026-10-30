'use strict';
const {forward}=require('../hotel-review/hotel-public-host-adapter.cjs');
const google=require('./hotel-google-b2c.js');
module.exports=(req,res)=>forward(req,res,'google',google);
