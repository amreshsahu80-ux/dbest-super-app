function pcm16ToWav(pcm, sampleRate = 24000, channels = 1) {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + dataSize, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * channels * 2, 28); header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

const LOCALE_NAME = {
  'hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati','ur-IN':'Urdu',
  'kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali','kok-IN':'Konkani',
  'ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri','brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit',
  'en-IN':'Indian English','en-US':'English','en-GB':'English'
};

async function geminiSpeechWithModel(text, locale, model) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  if (!key) return null;
  const localeName = LOCALE_NAME[locale] || 'the language of the supplied text';
  const prompt = `Speak only the text after TEXT in ${localeName}. Use a natural, warm, conversational Indian female voice, like a helpful human travel and services assistant. Keep the pace relaxed, with realistic pauses and expressive but subtle intonation. Do not announce instructions, translate, summarize, or add words.\nTEXT:\n${text}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {'x-goog-api-key': key, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achernar' } } }
      }
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`Gemini TTS ${model} ${response.status}: ${body.slice(0, 240)}`); err.statusCode = response.status; throw err;
  }
  const json = await response.json();
  const part = json?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
  const b64 = part?.inlineData?.data;
  if (!b64) throw new Error(`Gemini TTS ${model} returned no audio`);
  const pcm = Buffer.from(b64, 'base64');
  return { buffer: pcm16ToWav(pcm), mediaType: 'audio/wav', model: `${model}/Achernar` };
}

async function geminiSpeech(text, locale) {
  let lastError = null;
  for (const model of ['gemini-3.1-flash-tts-preview','gemini-2.5-flash-preview-tts']) {
    try { const out = await geminiSpeechWithModel(text, locale, model); if (out) return out; }
    catch (err) { lastError = err; console.warn('DBest neural TTS fallback', model, String(err?.message || err).slice(0, 260)); }
  }
  if (lastError) throw lastError;
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'Method not allowed'}); }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = String(body.text || '').trim().slice(0, 1800);
  const locale = String(body.locale || 'en-IN').trim().slice(0, 20) || 'en-IN';
  if (!text) return res.status(400).json({error:'Text is required'});
  const base = locale.toLowerCase().split('-')[0];
  const indian = new Set(['hi','bn','mr','te','ta','gu','ur','kn','or','ml','pa','as','ne','kok','ks','mni','mai','sd','doi','brx','sat','sa']);

  try {
    try {
      const neural = await geminiSpeech(text, locale);
      if (neural) {
        res.setHeader('X-DBest-Voice-Model', neural.model);
        res.setHeader('X-DBest-Voice-Locale', locale);
        res.setHeader('X-DBest-Voice-Profile', 'natural-female');
        res.setHeader('Content-Type', neural.mediaType);
        res.setHeader('Content-Length', String(neural.buffer.length));
        return res.status(200).send(neural.buffer);
      }
    } catch (err) {
      console.warn('DBest Gemini neural voice unavailable', String(err?.message || err).slice(0, 260));
    }

    const [{ experimental_generateSpeech: generateSpeech }, { gateway }] = await Promise.all([import('ai'), import('@ai-sdk/gateway')]);
    let result, modelUsed='';
    if (indian.has(base)) {
      result = await generateSpeech({model:gateway.speechModel('fish-audio/s2.1-pro-free'),text,voice:'933563129e564b19a115bedd57b7406a',speed:0.94,maxRetries:0});
      modelUsed='fish-audio/s2.1-pro-free';
    } else {
      let last=null;
      for (const modelId of ['openai/gpt-4o-mini-tts','openai/tts-1']) {
        try {
          const opts={model:gateway.speechModel(modelId),text,voice:'shimmer',speed:0.96,maxRetries:0};
          if(modelId==='openai/gpt-4o-mini-tts')opts.instructions='Speak naturally in a warm, conversational feminine voice with realistic pauses. Do not translate or add words.';
          result=await generateSpeech(opts);modelUsed=modelId;break;
        } catch(err){last=err}
      }
      if(!result)throw last||new Error('No speech model available');
    }
    const buf=Buffer.from(result.audio.uint8Array);
    res.setHeader('X-DBest-Voice-Model', modelUsed);
    res.setHeader('X-DBest-Voice-Locale', locale);
    res.setHeader('X-DBest-Voice-Profile', 'fallback-female');
    res.setHeader('Content-Type', result.audio.mediaType || 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch(err) {
    console.error('DBest neural speech error', err);
    const msg=String(err?.message||err||'');const rate=Number(err?.statusCode)===429||/rate.?limit|quota|free tier/i.test(msg);
    return res.status(rate?429:503).json({error:rate?'Voice service busy':'Neural voice temporarily unavailable',code:rate?'rate_limited':'speech_unavailable',locale});
  }
};