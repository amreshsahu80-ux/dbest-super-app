'use strict';
const {forward}=require('./hotel-public-host-adapter.cjs');
const catalog=require('../api/hotel-catalog.js');
module.exports=(req,res)=>forward(req,res,'catalog',catalog);
