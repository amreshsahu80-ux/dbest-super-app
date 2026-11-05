"use strict";
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store,max-age=0");
 if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 const active=process.env.AI_SAATHI_LLM_ENABLED==="true"&&process.env.AI_SAATHI_COST_GATE_APPROVED==="true"&&process.env.AI_SAATHI_PRIVACY_GATE_APPROVED==="true"&&!!process.env.AI_SAATHI_REDIS_REST_URL&&!!process.env.AI_SAATHI_REDIS_REST_TOKEN&&!!process.env.AI_SAATHI_RATE_LIMIT_SALT&&["openai/gpt-5.4-mini","openai/gpt-5.4-nano"].includes(process.env.AI_GATEWAY_MODEL)&&!!(process.env.VERCEL_OIDC_TOKEN||process.env.AI_GATEWAY_API_KEY);
 return res.status(200).json({status:"ok",service:"dbest-ai-saathi-multilingual-qa",mode:active?"model-eligible":"simulation",modelCallsAllowed:active,aiModelEnabled:active,liveToolsEnabled:false,databaseConnected:false,paymentsEnabled:false,productionWritesEnabled:false});
};