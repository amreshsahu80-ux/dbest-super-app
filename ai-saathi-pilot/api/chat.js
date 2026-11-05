"use strict";
// Isolated demo-only assistant. No network, accounts, Supabase, payments or model calls.
const policy=require("../lib/pilot-knowledge.cjs");
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method!=="POST")return res.status(405).json({error:"method_not_allowed",mode:"simulation"});
  if(!String(req.headers?.["content-type"]||"").toLowerCase().startsWith("application/json"))
    return res.status(415).json({error:"json_required",mode:"simulation"});
  if(Number(req.headers?.["content-length"]||0)>4096)
    return res.status(413).json({error:"request_too_large",mode:"simulation"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch{return res.status(400).json({error:"invalid_json",mode:"simulation"});}}
  if(!body||typeof body!=="object"||!policy.ROLES.includes(body.role)||
     typeof body.message!=="string"||!body.message.trim()||body.message.length>500)
    return res.status(400).json({error:"invalid_input",mode:"simulation"});
  const info=policy.demoReply(body.role,body.message.trim());
  return res.status(200).json({mode:"simulation",role:body.role,reply:info.reply,language:info.language,intent:info.intent});
};