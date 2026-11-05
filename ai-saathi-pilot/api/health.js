"use strict";
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET") return res.status(405).json({error:"method_not_allowed"});
  return res.status(200).json({status:"ok",service:"dbest-ai-saathi-isolated-pilot",mode:"simulation",aiModelEnabled:false,liveToolsEnabled:false,databaseConnected:false,paymentsEnabled:false,productionWritesEnabled:false});
};