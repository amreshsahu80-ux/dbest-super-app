const NAMES={
  'en-IN':'English','hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati',
  'ur-IN':'Urdu','kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali',
  'kok-IN':'Konkani','ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri','brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit'
};
const ALIASES={en:'en-IN',english:'en-IN',hi:'hi-IN',hindi:'hi-IN',bn:'bn-IN',bengali:'bn-IN',bangla:'bn-IN',mr:'mr-IN',marathi:'mr-IN',te:'te-IN',telugu:'te-IN',ta:'ta-IN',tamil:'ta-IN',gu:'gu-IN',gujarati:'gu-IN',ur:'ur-IN',urdu:'ur-IN',kn:'kn-IN',kannada:'kn-IN',or:'or-IN',od:'or-IN',odia:'or-IN',oriya:'or-IN',ml:'ml-IN',malayalam:'ml-IN',pa:'pa-IN',punjabi:'pa-IN',as:'as-IN',assamese:'as-IN',ne:'ne-IN',nepali:'ne-IN',kok:'kok-IN',konkani:'kok-IN',ks:'ks-IN',kashmiri:'ks-IN',mni:'mni-IN',manipuri:'mni-IN',mai:'mai-IN',maithili:'mai-IN',sd:'sd-IN',sindhi:'sd-IN',doi:'doi-IN',dogri:'doi-IN',brx:'brx-IN',bodo:'brx-IN',sat:'sat-IN',santali:'sat-IN',sa:'sa-IN',sanskrit:'sa-IN'};
const ROUTES=new Set(['join','car','insurance','travel','flights','store','govt','loans','rail','repair','friends','jobs','vahan','wallet','mf','other','none']);
function normalizeLocale(v){const x=String(v||'').trim().toLowerCase();if(!x)return'';const exact=Object.keys(NAMES).find(k=>k.toLowerCase()===x);return exact||ALIASES[x]||ALIASES[x.split('-')[0]]||'';}
function cleanJson(text){let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(s);}catch{}const m=s.match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0]);}catch{}}return{reply:s};}
function cleanTaskData(v){if(!v||typeof v!=='object'||Array.isArray(v))return{};const out={};for(const [k,val] of Object.entries(v).slice(0,20)){if(val===null||val===undefined||val==='')continue;out[String(k).slice(0,40)]=typeof val==='string'?val.slice(0,300):val;}return out;}
function normalizeResult(parsed,targetLocale){const route=ROUTES.has(String(parsed.route||''))?String(parsed.route):'none';return{reply:String(parsed.reply||'').trim().slice(0,1800),languageCode:targetLocale||normalizeLocale(parsed.languageCode)||String(parsed.languageCode||'auto').slice(0,20),intent:String(parsed.intent||'general').slice(0,40),route,subsection:String(parsed.subsection||'').slice(0,80),taskData:cleanTaskData(parsed.taskData)};}
function augmentTaskData(message,result){
  const out={...result,taskData:{...(result.taskData||{})}};
  if(out.route!=='car')return out;
  const d=out.taskData;
  if(d.destination&&!d.drop)d.drop=d.destination;
  if(d.origin&&!d.pickup)d.pickup=d.origin;
  const raw=String(message||'').replace(/\s+/g,' ').trim();
  const fromTo=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
  if(fromTo){if(!d.pickup)d.pickup=fromTo[1].trim();if(!d.drop)d.drop=fromTo[2].trim();}
  if((!d.pickup||!d.drop)){
    const simple=raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(simple){
      const parts=simple[1].trim().split(/\s+/).filter(Boolean);
      if(parts.length===2){if(!d.pickup)d.pickup=parts[0];if(!d.drop)d.drop=parts[1];}
    }
  }
  if(d.pickup&&d.drop&&!out.subsection)out.subsection='Outstation Cab';
  return out;
}
async function callGemini({key,model,system,history,message}){const contents=[];for(const item of history)contents.push({role:item.role==='assistant'?'model':'user',parts:[{text:item.content}]});contents.push({role:'user',parts:[{text:message}]});const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.15,maxOutputTokens:700,responseMimeType:'application/json'}})});if(!r.ok){const body=await r.text().catch(()=>'');const e=new Error(`Gemini ${model} ${r.status}: ${body.slice(0,260)}`);e.statusCode=r.status;throw e;}const json=await r.json();const text=(json?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim();if(!text)throw new Error(`Gemini ${model} returned no text`);return{text,model};}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  const smokeCases={hi:{message:'मुझे 15000 रुपये में गोवा पैकेज चाहिए',locale:'auto',detectedLocale:'hi-IN',history:[]},bn:{message:'আমার ১৫ হাজার টাকার মধ্যে গোয়া প্যাকেজ চাই',locale:'auto',detectedLocale:'bn-IN',history:[]},or:{message:'ମୋତେ ୧୫ ହଜାର ଟଙ୍କା ଭିତରେ ଗୋଆ ପ୍ୟାକେଜ ଦରକାର',locale:'auto',detectedLocale:'or-IN',history:[]},ta:{message:'எனக்கு 15000 ரூபாய்க்குள் கோவா பேக்கேஜ் வேண்டும்',locale:'auto',detectedLocale:'ta-IN',history:[]},cab:{message:'I want a cab from Chakradharpur Ranchi',locale:'en-IN',detectedLocale:'en-IN',history:[]}};
  let body={};if(req.method==='GET'&&req.query&&smokeCases[String(req.query.smoke||'')])body=smokeCases[String(req.query.smoke)];else if(req.method==='POST')body=req.body&&typeof req.body==='object'?req.body:{};else{res.setHeader('Allow','POST, GET');return res.status(405).json({error:'Method not allowed'});}
  const message=String(body.message||'').trim().slice(0,2000),locale=String(body.locale||'auto').trim().slice(0,20),detectedLocale=normalizeLocale(String(body.detectedLocale||'')),selectedLocale=locale!=='auto'?normalizeLocale(locale):'',targetLocale=selectedLocale||detectedLocale||'',targetLanguage=targetLocale?NAMES[targetLocale]:'';
  const history=(Array.isArray(body.history)?body.history:[]).slice(-6).filter(x=>x&&(x.role==='user'||x.role==='assistant')).map(x=>({role:x.role,content:String(x.content||'').slice(0,1200)}));if(!message)return res.status(400).json({error:'Message is required'});
  const languageRule=targetLanguage?`MANDATORY: Answer ONLY in ${targetLanguage} (${targetLocale}), except unavoidable brand/place names. Never switch to English unless the user asks.`:'MANDATORY: Detect the latest user language and answer in that same language. Mirror Hinglish or other natural mixed-language speech. Never default to English.';
  const system=[
    'You are DBest AI Assistant in a TEST ENVIRONMENT.',languageRule,
    'Your job is not only to answer: identify the correct DBest section, extract details the user has already supplied, and help the user continue the task there.',
    'Return JSON only with exactly these top-level keys: reply, languageCode, intent, route, subsection, taskData.',
    'route must be one of: join, car, insurance, travel, flights, store, govt, loans, rail, repair, friends, jobs, vahan, wallet, mf, other, none.',
    'Use route car for local/outstation/airport cab; insurance for health/motor/travel insurance; travel for hotel/tour package/custom itinerary; flights for flight/flight+hotel/visa; store for grocery/food/digital/medicine; govt for PAN/DL/ITR/certificates; loans for banking/personal/business/home loans; rail for rail/PNR; repair for mobile/AC/appliance repair; jobs for job search/application; vahan for RC/vehicle documentation; wallet for cashback/rewards; mf for mutual funds/SIP/portfolio; join for membership/promoter/team; other for remaining DBest services; none when no platform section is relevant.',
    'subsection should match the most relevant DBest subsection when clear, for example Health Insurance, Tour Package, Local Cab, Outstation Cab, Grocery Order, PAN Application, Personal Loan, Rail Booking, AC Service, Job Search, RC Service, Mutual Fund Investment.',
    'taskData must contain every usable detail actually supplied or clearly implied by the user, using DBest-friendly keys such as pickup, drop, origin, destination, budget, date, travellers, passengers, marketType, insuranceType, pincode, sumInsured, adults, children, startDate, duration. Never invent missing personal details.',
    'For cab requests, aggressively preserve pickup and destination. Example: "cab from Chakradharpur to Ranchi" => pickup=Chakradharpur, drop=Ranchi. If a point-to-point cab request says "from Chakradharpur Ranchi" with two clear place names after from, interpret the first as pickup and the second as destination unless the sentence gives contrary meaning.',
    'For travel/package requests, preserve destination, budget, travellers/adults/children, origin and dates whenever provided. For insurance, preserve cover amount, family members, ages and pincode when provided. For marketplace, preserve category/item/budget. For forms, do not ask again for details already present in taskData.',
    'When a DBest route is relevant, tell the user briefly that you can continue in that section and ask only for genuinely missing required details.',
    'Never claim a live price, availability, booking, payment, policy issuance, investment execution, loan approval, order placement or cab allocation unless a real DBest backend tool has actually completed it. In this test, clearly treat prices/results as sample or estimated.',
    'Insurance and investments: factual assistance and form guidance only; do not make regulated suitability decisions. Sensitive actions, payments, final booking, cancellation and submission require the user to confirm in the DBest screen.',
    'Keep replies concise, useful and conversational, normally 2 to 5 short sentences.'
  ].join(' ');
  const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';let lastError=null;
  if(key){for(const model of ['gemini-3.5-flash-lite','gemini-3.1-flash-lite']){try{const out=await callGemini({key,model,system,history,message});let result=augmentTaskData(message,normalizeResult(cleanJson(out.text),targetLocale));if(!result.reply)throw new Error('Empty Gemini reply');return res.status(200).json({...result,demo:true,smoke:req.method==='GET',modelUsed:`direct/${out.model}`});}catch(err){lastError=err;console.warn('DBest direct Gemini fallback',model,String(err?.message||err).slice(0,220));}}}
  try{const{generateText}=await import('ai');for(const model of ['google/gemini-2.5-flash-lite','alibaba/qwen-3-14b']){try{const x=await generateText({model,system,messages:[...history,{role:'user',content:message}],maxRetries:0,maxOutputTokens:650});let result=augmentTaskData(message,normalizeResult(cleanJson(x.text),targetLocale));if(!result.reply)throw new Error('Empty fallback reply');return res.status(200).json({...result,demo:true,smoke:req.method==='GET',modelUsed:model});}catch(err){lastError=err;console.warn('DBest Gateway fallback',model,String(err?.message||err).slice(0,180));}}throw lastError||new Error('No AI model available');}catch(err){console.error('DBest AI assistant error',err);const msg=String(err?.message||err||''),rateLimited=Number(err?.statusCode)===429||/rate.?limit|quota|free tier/i.test(msg);return res.status(rateLimited?429:503).json({error:rateLimited?'AI is busy':'AI assistant temporarily unavailable',code:rateLimited?'rate_limited':'ai_unavailable',languageCode:targetLocale||'auto'});}
};
