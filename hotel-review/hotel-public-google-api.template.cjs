'use strict';
const {forward}=require('./hotel-public-host-adapter.cjs');
const google=require('../api/hotel-google-b2c.js');
module.exports=(req,res)=>forward(req,res,'google',google);
