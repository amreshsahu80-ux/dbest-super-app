"use strict";
// The approved mock chat remains the fallback until every model gate is enabled.
const demo=require("./chat.js"),model=require("./model-chat.js");
module.exports=async function(req,res){
 if(!model._internal.enabled())return demo(req,res);
 return model(req,res);
};