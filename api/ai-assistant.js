const NAMES = {
  'en-IN':'English','hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati',
  'ur-IN':'Urdu','kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali',
  'kok-IN':'Konkani','ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri',
  'brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit'
};
const ALIASES = {
  en:'en-IN',english:'en-IN',hi:'hi-IN',hindi:'hi-IN',bn:'bn-IN',bengali:'bn-IN',bangla:'bn-IN',mr:'mr-IN',marathi:'mr-IN',
  te:'te-IN',telugu:'te-IN',ta:'ta-IN',tamil:'ta-IN',gu:'gu-IN',gujarati:'gu-IN',ur:'ur-IN',urdu:'ur-IN',kn:'kn-IN',kannada:'kn-IN',
  or:'or-IN',od:'or-IN',odia:'or-IN',oriya:'or-IN',ml:'ml-IN',malayalam:'ml-IN',pa:'pa-IN',punjabi:'pa-IN',as:'as-IN',assamese:'as-IN',
  ne:'ne-IN',nepali:'ne-IN',kok:'kok-IN',konkani:'kok-IN',ks:'ks-IN',kashmiri:'ks-IN',mni:'mni-IN',manipuri:'mni-IN',mai:'mai-IN',maithili:'mai-IN',
  sd:'sd-IN',sindhi:'sd-IN',doi:'doi-IN',dogri:'doi-IN',brx:'brx-IN',bodo:'brx-IN',sat:'sat-IN',santali:'sat-IN',sa:'sa-IN',sanskrit:'sa-IN'
};
function normalizeLocale(v){
  const x=String(v||'').trim().toLowerCase();
  if(!x) return '';
  const exact=Object.keys(NAMES).find(k=>k.toLowerCase()===x);
  return exact || ALIASES[x] || ALIASES[x.split('-')[0]] || '';
}
function cleanJson(text){
  let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();
  try{return JSON.parse(s);}catch{}
  const m=s.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch{}}
  return {reply:s};
}
async function callGemini({key,model,system,history,message}){
  const contents=[];
  for(const item of history){
    contents.push({role:item.role==='assistant'?'model':'user',parts:[{text:item.content}]});
  }
  contents.push({role:'user',parts:[{text:message}]});
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',
    headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
    body:JSON.stringify({
      systemInstruction:{parts:[{text:system}]},
      contents,
      generationConfig:{temperature:0.25,maxOutputTokens:550,responseMimeType:'application/json'}
    })
  });
  if(!r.ok){
    const body=await r.text().catch(()=> '');
    const e=new Error(`Gemini ${model} ${r.status}: ${body.slice(0,260)}`); e.statusCode=r.status; throw e;
  }
  const json=await r.json();
  const text=(json?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim();
  if(!text) throw new Error(`Gemini ${model} returned no text`);
  return {text,model};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  const smokeCases={
    hi:{message:'मुझे 15000 रुपये में गोवा पैकेज चाहिए',locale:'auto',detectedLocale:'hi-IN',history:[]},
    bn:{message:'আমার ১৫ হাজার টাকার মধ্যে গোয়া প্যাকেজ চাই',locale:'auto',detectedLocale:'bn-IN',history:[]},
    or:{message:'ମୋତେ ୧୫ ହଜାର ଟଙ୍କା ଭିତରେ ଗୋଆ ପ୍ୟାକେଜ ଦରକାର',locale:'auto',detectedLocale:'or-IN',history:[]},
    ta:{message:'எனக்கு 15000 ரூபாய்க்குள் கோவா பேக்கேஜ் வேண்டும்',locale:'auto',detectedLocale:'ta-IN',history:[]}
  };
  let body={};
  if(req.method==='GET'&&req.query&&smokeCases[String(req.query.smoke||'')]) body=smokeCases[String(req.query.smoke)];
  else if(req.method==='POST') body=req.body&&typeof req.body==='object'?req.body:{};
  else {res.setHeader('Allow','POST, GET');return res.status(405).json({error:'Method not allowed'});}

  const message=String(body.message||'').trim().slice(0,2000);
  const locale=String(body.locale||'auto').trim().slice(0,20);
  const detectedLocale=normalizeLocale(String(body.detectedLocale||''));
  const selectedLocale=locale!=='auto'?normalizeLocale(locale):'';
  const targetLocale=selectedLocale||detectedLocale||'';
  const targetLanguage=targetLocale?NAMES[targetLocale]:'';
  const history=(Array.isArray(body.history)?body.history:[]).slice(-6)
    .filter(x=>x&&(x.role==='user'||x.role==='assistant'))
    .map(x=>({role:x.role,content:String(x.content||'').slice(0,1200)}));
  if(!message) return res.status(400).json({error:'Message is required'});

  const languageRule=targetLanguage
    ?`MANDATORY: Answer ONLY in ${targetLanguage} (${targetLocale}), except unavoidable brand/place names. Never switch to English unless the user asks.`
    :'MANDATORY: Detect the language of the latest user message and answer in that same language. If it is Hinglish or another mixed Indian-language style, naturally mirror that mix. Never default to English.';
  const system=[
    'You are DBest AI Assistant in a TEST ENVIRONMENT.',languageRule,
    'Return JSON only with keys reply, languageCode, intent.',
    'languageCode must be the actual reply language as an India-style BCP-47 code such as hi-IN, bn-IN, or-IN, ta-IN, te-IN, mr-IN, gu-IN, pa-IN, kn-IN, ml-IN, ur-IN, as-IN, ne-IN, kok-IN, ks-IN, mni-IN, mai-IN, sd-IN, doi-IN, brx-IN, sat-IN, sa-IN, or en-IN.',
    'intent must be travel, insurance, cab, marketplace, account, or general.',
    'Current demo scope is Travel, Insurance, Cab and Marketplace.',
    'Never claim live price, availability, booking, payment, policy issuance, investment execution, or cab allocation. Label estimates/sample results clearly.',
    'Travel: ask only useful missing details such as origin, dates, travellers and budget. Insurance: factual general guidance only, no regulated suitability advice. Cab/Marketplace: never confirm a real transaction.',
    'Keep answers natural, concise, friendly and useful, usually 2 to 5 short sentences.'
  ].join(' ');

  const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';
  let lastError=null;
  if(key){
    for(const model of ['gemini-3.5-flash-lite','gemini-3.1-flash-lite']){
      try{
        const out=await callGemini({key,model,system,history,message});
        const parsed=cleanJson(out.text);
        const reply=String(parsed.reply||'').trim().slice(0,1800);
        if(!reply) throw new Error('Empty Gemini reply');
        const languageCode=targetLocale||normalizeLocale(parsed.languageCode)||String(parsed.languageCode||'auto').slice(0,20);
        return res.status(200).json({reply,languageCode,intent:String(parsed.intent||'general').slice(0,30),demo:true,smoke:req.method==='GET',modelUsed:`direct/${out.model}`});
      }catch(err){lastError=err;console.warn('DBest direct Gemini fallback',model,String(err?.message||err).slice(0,220));}
    }
  }

  try{
    const {generateText}=await import('ai');
    for(const model of ['google/gemini-2.5-flash-lite','alibaba/qwen-3-14b']){
      try{
        const result=await generateText({model,system,messages:[...history,{role:'user',content:message}],maxRetries:0,maxOutputTokens:500});
        const parsed=cleanJson(result.text);
        const reply=String(parsed.reply||'').trim().slice(0,1800);
        if(!reply) throw new Error('Empty fallback reply');
        return res.status(200).json({reply,languageCode:targetLocale||normalizeLocale(parsed.languageCode)||'auto',intent:String(parsed.intent||'general').slice(0,30),demo:true,smoke:req.method==='GET',modelUsed:model});
      }catch(err){lastError=err;console.warn('DBest Gateway fallback',model,String(err?.message||err).slice(0,180));}
    }
    throw lastError||new Error('No AI model available');
  }catch(err){
    console.error('DBest AI assistant error',err);
    const msg=String(err?.message||err||'');
    const rateLimited=Number(err?.statusCode)===429||/rate.?limit|quota|free tier/i.test(msg);
    return res.status(rateLimited?429:503).json({error:rateLimited?'AI is busy':'AI assistant temporarily unavailable',code:rateLimited?'rate_limited':'ai_unavailable',languageCode:targetLocale||'auto'});
  }
};
