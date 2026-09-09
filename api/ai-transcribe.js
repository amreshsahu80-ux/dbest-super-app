const NAMES={'en-IN':'English','hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati','ur-IN':'Urdu','kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali'};
const ALIASES={en:'en-IN',english:'en-IN',hi:'hi-IN',hindi:'hi-IN',bn:'bn-IN',bengali:'bn-IN',bangla:'bn-IN',mr:'mr-IN',marathi:'mr-IN',te:'te-IN',telugu:'te-IN',ta:'ta-IN',tamil:'ta-IN',gu:'gu-IN',gujarati:'gu-IN',ur:'ur-IN',urdu:'ur-IN',kn:'kn-IN',kannada:'kn-IN',or:'or-IN',odia:'or-IN',oriya:'or-IN',ml:'ml-IN',malayalam:'ml-IN',pa:'pa-IN',punjabi:'pa-IN',as:'as-IN',assamese:'as-IN',ne:'ne-IN',nepali:'ne-IN'};
function normalizeLocale(v){const x=String(v||'').trim().toLowerCase();if(!x)return'';const exact=Object.keys(NAMES).find(k=>k.toLowerCase()===x);return exact||ALIASES[x]||ALIASES[x.split('-')[0]]||''}
function parseJson(text){let s=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();try{return JSON.parse(s)}catch{}const m=s.match(/\{[\s\S]*\}/);if(m){try{return JSON.parse(m[0])}catch{}}return{}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function cloudEncoding(mime){const m=String(mime||'').toLowerCase();if(m.includes('webm'))return'WEBM_OPUS';if(m.includes('ogg'))return'OGG_OPUS';if(m.includes('flac'))return'FLAC';if(m.includes('mp3')||m.includes('mpeg'))return'MP3';return undefined}
async function cloudSpeech({key,audioBase64,mimeType,selectedLocale,probe=false}){
  const chosen=normalizeLocale(selectedLocale),primary=chosen||'en-IN';
  const config={languageCode:primary,model:'command_and_search',enableAutomaticPunctuation:true,maxAlternatives:1};
  const enc=cloudEncoding(mimeType);if(enc)config.encoding=enc;if(enc==='WEBM_OPUS'||enc==='OGG_OPUS')config.sampleRateHertz=48000;
  if(!chosen)config.alternativeLanguageCodes=['hi-IN','bn-IN','or-IN'];
  const body={config,audio:{content:probe?'AA==':audioBase64}};
  const r=await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const raw=await r.text().catch(()=> '');let j={};try{j=JSON.parse(raw)}catch{}
  if(probe){const accessible=r.status!==401&&r.status!==403;return{status:r.status,accessible,reason:String(j?.error?.status||j?.error?.message||'').slice(0,180)}}
  if(!r.ok){const e=new Error(`Cloud Speech ${r.status}: ${String(j?.error?.message||raw).slice(0,220)}`);e.statusCode=r.status;throw e}
  const results=Array.isArray(j.results)?j.results:[];const text=results.map(x=>x?.alternatives?.[0]?.transcript||'').join(' ').trim();if(!text)throw new Error('Cloud Speech returned no transcript');
  const languageCode=results.find(x=>x?.languageCode)?.languageCode||primary;return{text,languageCode,model:'cloud-speech-v1'};
}
async function oneGemini({key,audioBase64,mimeType,selectedLocale,model}){
  const expected=selectedLocale&&selectedLocale!=='auto'?normalizeLocale(selectedLocale):'';
  const prompt=expected?`Transcribe this audio exactly. Expected language: ${NAMES[expected]||expected}. Do not translate. Return JSON only: {"text":"exact transcript","languageCode":"${expected}"}.`:'Transcribe this audio exactly in its original spoken language. Detect the language. Do not translate. Return JSON only: {"text":"exact transcript","languageCode":"BCP-47 locale such as en-IN, hi-IN, bn-IN, or-IN"}.';
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType,data:audioBase64}}]}],generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:500}})});
  if(!r.ok){const b=await r.text().catch(()=> '');const e=new Error(`Gemini transcription ${model} ${r.status}: ${b.slice(0,220)}`);e.statusCode=r.status;throw e}
  const j=await r.json();const raw=(j?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||'').join('').trim();const parsed=parseJson(raw);const transcript=String(parsed.text||'').trim();if(!transcript)throw new Error(`Gemini ${model} returned no transcript`);return{text:transcript,languageCode:expected||normalizeLocale(parsed.languageCode)||String(parsed.languageCode||'').slice(0,20),model}
}
async function geminiTranscribe(args){let last=null;for(const model of ['gemini-2.5-flash','gemini-3.1-flash-lite','gemini-3.5-flash-lite']){try{return await oneGemini({...args,model})}catch(err){last=err;console.warn('DBest Gemini STT fallback',model,String(err?.message||err).slice(0,180));if(Number(err?.statusCode)===429)await wait(250)}}throw last||new Error('Gemini transcription unavailable')}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  const cloudKey=process.env.GOOGLE_CLOUD_SPEECH_API_KEY||process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';
  const geminiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';
  if(req.method==='GET'&&String(req.query?.probe||'')==='cloud-stt'){
    if(!cloudKey)return res.status(200).json({provider:'google-cloud-speech',keyPresent:false,accessible:false});
    try{const p=await cloudSpeech({key:cloudKey,audioBase64:'',mimeType:'audio/webm',selectedLocale:'en-IN',probe:true});return res.status(200).json({provider:'google-cloud-speech',keyPresent:true,...p})}catch(e){return res.status(200).json({provider:'google-cloud-speech',keyPresent:true,accessible:false,status:Number(e?.statusCode||0),reason:String(e?.message||e).slice(0,180)})}
  }
  if(req.method!=='POST'){res.setHeader('Allow','POST, GET');return res.status(405).json({error:'Method not allowed'})}
  try{
    const body=req.body&&typeof req.body==='object'?req.body:{};const audioBase64=String(body.audioBase64||'');const mimeType=String(body.mimeType||'audio/webm').slice(0,80);const selectedLocale=String(body.locale||'auto').slice(0,20);
    if(!audioBase64)return res.status(400).json({error:'Audio is required'});if(audioBase64.length>6000000)return res.status(413).json({error:'Audio clip too large'});
    if(cloudKey){try{const out=await cloudSpeech({key:cloudKey,audioBase64,mimeType,selectedLocale});return res.status(200).json({text:out.text.slice(0,2400),language:out.languageCode,mimeType,demo:false,modelUsed:out.model})}catch(err){console.warn('DBest Cloud Speech unavailable',String(err?.message||err).slice(0,220))}}
    if(geminiKey){try{const out=await geminiTranscribe({key:geminiKey,audioBase64,mimeType,selectedLocale});return res.status(200).json({text:out.text.slice(0,2400),language:out.languageCode,mimeType,demo:false,modelUsed:`direct/${out.model}`})}catch(err){console.warn('DBest direct Gemini transcription exhausted',String(err?.message||err).slice(0,220))}}
    const audio=Buffer.from(audioBase64,'base64');if(!audio.length)return res.status(400).json({error:'Invalid audio'});
    const [{experimental_transcribe:transcribe},{gateway}]=await Promise.all([import('ai'),import('@ai-sdk/gateway')]);let last=null;
    for(const modelId of ['openai/gpt-4o-mini-transcribe','xai/grok-stt']){try{const opts={model:gateway.transcriptionModel(modelId),audio,maxRetries:0};if(selectedLocale!=='auto'&&modelId.startsWith('openai/'))opts.providerOptions={openai:{language:selectedLocale.split('-')[0]}};const result=await transcribe(opts);const text=String(result.text||'').trim();if(text)return res.status(200).json({text:text.slice(0,2400),language:String(result.language||'').trim().toLowerCase(),mimeType,demo:false,modelUsed:modelId})}catch(err){last=err}}
    throw last||new Error('No transcription model available');
  }catch(err){console.error('DBest AI transcription error',err);const msg=String(err?.message||err||'');const rate=Number(err?.statusCode)===429||/rate.?limit|quota|free tier/i.test(msg);return res.status(rate?429:503).json({error:rate?'Voice detection busy':'Voice transcription temporarily unavailable',code:rate?'rate_limited':'transcription_unavailable'})}
};