'use strict';
const {forward}=require('../hotel-review/hotel-public-host-adapter.cjs');
const catalog=require('./hotel-catalog.js');
module.exports=(req,res)=>forward(req,res,'catalog',catalog);
