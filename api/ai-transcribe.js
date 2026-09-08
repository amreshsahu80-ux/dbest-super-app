const NAMES={
  'en-IN':'English','hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati','ur-IN':'Urdu','kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali','kok-IN':'Konkani','ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri','brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit'
};
const ALIASES={en:'en-IN',english:'en-IN',hi:'hi-IN',hindi:'hi-IN',bn:'bn-IN',bengali:'bn-IN',bangla:'bn-IN',mr:'mr-IN',marathi:'mr-IN',te:'te-IN',telugu:'te-IN',ta:'ta-IN',tamil:'ta-IN',gu:'gu-IN',gujarati:'gu-IN',ur:'ur-IN',urdu:'ur-IN',kn:'kn-IN',kannada:'kn-IN',or:'or-IN',odia:'or-IN',oriya:'or-IN',ml:'ml-IN',malayalam:'ml-IN',pa:'pa-IN',punjabi:'pa-IN',as:'as-IN',assamese:'as-IN',ne:'ne-IN',nepali:'ne-IN',kok:'kok-IN',konkani:'kok-IN',ks:'ks-IN',kashmiri:'ks-IN',mni:'mni-IN',manipuri:'mni-IN',mai:'mai-IN',maithili:'mai-IN',sd:'sd-IN',sindhi:'sd-IN',doi:'doi-IN',dogri:'doi-IN',brx:'brx-IN',bodo:'brx-IN',sat:'sat-IN',santali:'sat-IN',sa:'sa-IN',sanskrit:'sa-IN'};
function normalizeLocale(v){const x=String(v||'').trim().toLowerCase();if(!x)return'';const exact=Object.keys(NAMES).find(k=>k.toLowerCase()===x);return exact||ALIASES[x]||ALIASES[x.split('-')[0]]||'';}
function parseJson(text){let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(s);}catch{}const m=s.match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0]);}catch{}}return{};}
async function geminiTranscribe({key,audioBase64,mimeType,selectedLocale}){
  const expected=selectedLocale&&selectedLocale!=='auto'?normalizeLocale(selectedLocale):'';
  const prompt=expected
    ?`Transcribe this audio exactly. The expected language is ${NAMES[expected]||expected}. Do not translate. Return JSON only: {"text":"exact transcript","languageCode":"${expected}"}.`
    :'Transcribe this audio exactly in its original language. Detect the spoken language. Do not translate or romanize unless the speaker actually used Roman script. Return JSON only: {"text":"exact transcript","languageCode":"BCP-47 Indian locale such as hi-IN, bn-IN, or-IN, ta-IN, te-IN, mr-IN, gu-IN, pa-IN, kn-IN, ml-IN, ur-IN, as-IN, ne-IN, kok-IN, ks-IN, mni-IN, mai-IN, sd-IN, doi-IN, brx-IN, sat-IN, sa-IN, or en-IN"}.';
  let lastError=null;
  for(const model of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite']){
    try{
      const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
        method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType,data:audioBase64}}]}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:400}})
      });
      if(!r.ok){const b=await r.text().catch(()=> '');const e=new Error(`Gemini transcription ${model} ${r.status}: ${b.slice(0,220)}`);e.statusCode=r.status;throw e;}
      const j=await r.json();const text=(j?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim();const parsed=parseJson(text);
      const transcript=String(parsed.text||'').trim();if(!transcript)throw new Error(`Gemini ${model} returned no transcript`);
      const languageCode=expected||normalizeLocale(parsed.languageCode)||String(parsed.languageCode||'').slice(0,20);
      return {text:transcript,languageCode,model};
    }catch(err){lastError=err;console.warn('DBest direct Gemini transcription fallback',model,String(err?.message||err).slice(0,220));}
  }
  throw lastError||new Error('Gemini transcription unavailable');
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  try{
    const body=req.body&&typeof req.body==='object'?req.body:{};const audioBase64=String(body.audioBase64||'');const mimeType=String(body.mimeType||'audio/webm').slice(0,80);const selectedLocale=String(body.locale||'auto').slice(0,20);
    if(!audioBase64)return res.status(400).json({error:'Audio is required'});if(audioBase64.length>6000000)return res.status(413).json({error:'Audio clip too large'});
    const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';
    if(key){
      try{const out=await geminiTranscribe({key,audioBase64,mimeType,selectedLocale});return res.status(200).json({text:out.text.slice(0,2400),language:out.languageCode,mimeType,demo:true,modelUsed:`direct/${out.model}`});}
      catch(err){console.warn('DBest direct Gemini transcription failed',String(err?.message||err).slice(0,240));}
    }
    const audio=Buffer.from(audioBase64,'base64');if(!audio.length)return res.status(400).json({error:'Invalid audio'});
    const [{experimental_transcribe:transcribe},{gateway}]=await Promise.all([import('ai'),import('@ai-sdk/gateway')]);
    let lastError=null;for(const modelId of ['openai/gpt-4o-mini-transcribe','xai/grok-stt']){
      try{const options={model:gateway.transcriptionModel(modelId),audio,maxRetries:0};if(selectedLocale!=='auto'&&modelId.startsWith('openai/'))options.providerOptions={openai:{language:selectedLocale.split('-')[0]}};const result=await transcribe(options);const text=String(result.text||'').trim();if(text)return res.status(200).json({text:text.slice(0,2400),language:String(result.language||'').trim().toLowerCase(),mimeType,demo:true,modelUsed:modelId});}
      catch(err){lastError=err;}
    }
    throw lastError||new Error('No transcription model available');
  }catch(err){console.error('DBest AI transcription error',err);const msg=String(err?.message||err||'');const rateLimited=Number(err?.statusCode)===429||/rate.?limit|quota|free tier/i.test(msg);return res.status(rateLimited?429:503).json({error:rateLimited?'Voice detection busy':'Voice transcription temporarily unavailable',code:rateLimited?'rate_limited':'transcription_unavailable'});}
};
