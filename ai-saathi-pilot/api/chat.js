"use strict";
// Isolated demo endpoint. DO NOT import live Supabase, payment, email, analytics or booking clients here.
// A role selector is NEVER authentication. This endpoint has zero privileged tools or external calls.
const roles = new Set(["customer","partner","owner"]);
function answer(role, raw) {
  const text = raw.toLowerCase();
  if(/[\u0B00-\u0B7F]/u.test(raw))return "ଏହା DBest AI Saathi ର ସୁରକ୍ଷିତ ପରୀକ୍ଷା ସଂସ୍କରଣ। ଏଠାରେ କୌଣସି ଲାଇଭ୍ ବୁକିଂ, ମୂଲ୍ୟ, ପେମେଣ୍ଟ କିମ୍ବା ଆକାଉଣ୍ଟ ତଥ୍ୟ ଯୋଡ଼ା ହୋଇନାହିଁ। ଆପଣ ଯାତ୍ରା, କ୍ୟାବ୍ ଓ ସେବା ବିଷୟରେ ସାଧାରଣ ପ୍ରଶ୍ନ ପଚାରିପାରିବେ।";
  if(/[\u0900-\u097F]/u.test(raw))return "यह DBest AI Saathi का सुरक्षित परीक्षण संस्करण है। यहां वास्तविक बुकिंग, भुगतान, ग्राहक डेटा या लाइव दरें उपलब्ध नहीं हैं। आप यात्रा, कैब और सेवाओं के बारे में सामान्य सवाल पूछ सकते हैं।";
  const sensitive = /\b(otp|password|aadhaar|aadhar|pan number|card number|cvv|secret key|api key)\b/i.test(raw);
  if(sensitive) return "For safety, please do not share passwords, OTPs, identity numbers or payment details in this demonstration. No account verification is available here.";
  const action = /\b(refund|pay now|send money|transfer money|approve payout|delete account|make booking|book now|place order|change permissions|deploy|modify live|withdraw)\b/i.test(raw);
  if(action) return "Actions are disabled in this isolated pilot. I cannot submit orders, issue refunds, move funds, change permissions or deploy anything. In the future these operations would require verified identity, permissions and explicit confirmation.";
  const privileged = /\b(owner|admin|all customers|all partner accounts|private data|other users|database records)\b/i.test(raw);
  if(role!=="owner" && privileged) return "Your selected demonstration role cannot access owner administration or other users' private information. This pilot contains no live records.";
  if(role==="customer") {
    if(/hotel|puri|room|stay|flight|travel|trip|package/.test(text)) return "Hotel/travel example (SIMULATION): I would ask for destination, check-in and checkout dates, rooms and guests. A future verified hotel adapter could display DBest rates alongside comparable public OTA rates and explain genuine savings. No live availability or price is connected.";
    if(/cab|ride|car|taxi|airport/.test(text)) return "Cab example (SIMULATION): I would collect pickup, drop-off, vehicle preference and trip type, then request an estimate from the existing DBest cab engine. I cannot quote a real fare or dispatch a Vaahak in this pilot.";
    if(/member|promoter|prime|leader|join|register/.test(text)) return "Membership example (SIMULATION): DBest has Starter and paid member categories. A connected assistant would retrieve the currently approved plans and benefits before showing prices or commissions. I do not verify registrations or payouts here.";
    return "I'm the customer-facing pilot. You can ask about travel, cabs, marketplace, insurance or membership. All answers are illustrative; live booking and account access are disabled.";
  }
  if(role==="partner") {
    if(/job|assigned|ride|vaahak|cab/.test(text)) return "Partner jobs example (SIMULATION): An authenticated partner would see only their own assigned job IDs, statuses and permitted actions. This demo cannot read assignments or accept trips.";
    if(/vendor|order|marketplace|quote|delivery|restaurant|grocery/.test(text)) return "Marketplace example (SIMULATION): A vendor could review invitations, provide a quote, and update preparation or handover milestones through existing approved services. No actual orders are accessible.";
    if(/payout|earning|wallet|commission|settlement/.test(text)) return "Payout example (SIMULATION): A future agent could explain verified partner ledger entries and pending settlements, without changing balances or revealing another partner's data. No financial records are connected.";
    return "I'm the partner-facing pilot. Ask about job status, marketplace flows, onboarding or earnings. All operations and account lookups are disabled here.";
  }
  if(/outreach|hotel email|cab provider|supplier/.test(text)) return "Outreach monitor example (SIMULATION): The owner dashboard could show completed mail cycles, bounce rates, unreplied suppliers and queue exceptions from approved read-only summaries. No emails or Google Sheets were accessed.";
  if(/launch|ready|risk|issue|approval|production/.test(text)) return "Launch-readiness example (SIMULATION): The AI could aggregate existing Cab, Marketplace, notification, payment and Android-release checks into a reviewed status report. It cannot approve releases or change production settings.";
  if(/operations|dashboard|sales|performance|report|transaction|overview/.test(text)) return "Owner dashboard example (SIMULATION): I would present bookings, fulfillment, failed jobs and revenue from safe aggregated queries after owner authentication. No live financial or customer information was retrieved.";
  return "I'm the owner-facing pilot, using fabricated examples only. Potential features include operational reporting, outreach exceptions and release readiness; owner authentication and auditing must be completed before any real data is exposed.";
}
module.exports = async function handler(req,res) {
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed",mode:"simulation"});
  if(!(req.headers["content-type"]||"").toLowerCase().startsWith("application/json")) return res.status(415).json({error:"json_required",mode:"simulation"});
  const length=Number(req.headers["content-length"]||0);
  if(length>4096) return res.status(413).json({error:"request_too_large",mode:"simulation"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body);}catch(_){return res.status(400).json({error:"invalid_json",mode:"simulation"});}}
  if(!body||typeof body!=="object"||!roles.has(body.role)||typeof body.message!=="string"||!body.message.trim()||body.message.length>500) return res.status(400).json({error:"invalid_input",mode:"simulation"});
  return res.status(200).json({mode:"simulation",role:body.role,reply:answer(body.role,body.message)});
};