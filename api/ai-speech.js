function pcm16ToWav(pcm, sampleRate = 24000, channels = 1) {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

const LOCALE_NAME = {
  'hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati','ur-IN':'Urdu',
  'kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali','kok-IN':'Konkani',
  'ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri','brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit',
  'en-IN':'English'
};

async function geminiSpeechWithModel(text, locale, model) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  if (!key) return null;
  const localeName = LOCALE_NAME[locale] || 'the language of the supplied text';
  const prompt = model === 'gemini-2.5-flash-preview-tts'
    ? text
    : `Speak exactly the following text in ${localeName}. Use a soft, warm, calm, friendly Indian female voice with natural conversational pacing and clear native pronunciation. Do not translate, summarize, explain, or add any words. Text to speak:\n${text}`;

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
    const err = new Error(`Gemini TTS ${model} ${response.status}: ${body.slice(0, 240)}`);
    err.statusCode = response.status;
    throw err;
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
  for (const model of ['gemini-2.5-flash-preview-tts','gemini-3.1-flash-tts-preview']) {
    try {
      const out = await geminiSpeechWithModel(text, locale, model);
      if (out) return out;
    } catch (err) {
      lastError = err;
      console.warn('DBest direct Gemini TTS fallback', model, String(err?.message || err).slice(0, 260));
    }
  }
  if (lastError) throw lastError;
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  const smokeCases = {
    or: { text: 'ନମସ୍କାର! ମୁଁ ଡିବେଷ୍ଟ ଏଆଇ ସହାୟକ। ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?', locale: 'or-IN' },
    hi: { text: 'नमस्कार! मैं डीबेस्ट एआई सहायक हूँ। मैं आपकी कैसे मदद कर सकती हूँ?', locale: 'hi-IN' },
    bn: { text: 'নমস্কার! আমি ডিবেস্ট এআই সহায়ক। আমি আপনাকে কীভাবে সাহায্য করতে পারি?', locale: 'bn-IN' }
  };

  let body = {};
  let smoke = '';
  if (req.method === 'GET' && req.query && smokeCases[String(req.query.smoke || '')]) {
    smoke = String(req.query.smoke || '');
    body = smokeCases[smoke];
  } else if (req.method === 'POST') {
    body = req.body && typeof req.body === 'object' ? req.body : {};
  } else {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = String(body.text || '').trim().slice(0, 1600);
  const locale = String(body.locale || 'auto').trim().slice(0, 20);
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const base = locale && locale !== 'auto' ? locale.toLowerCase().split('-')[0] : '';
  const indianLanguages = new Set(['hi','bn','mr','te','ta','gu','ur','kn','or','ml','pa','as','ne','kok','ks','mni','mai','sd','doi','brx','sat','sa']);
  const useIndianVoice = indianLanguages.has(base);

  try {
    if (useIndianVoice) {
      try {
        const googleAudio = await geminiSpeech(text, locale);
        if (googleAudio) {
          if (smoke) return res.status(200).json({ ok:true, locale, modelUsed:googleAudio.model, bytes:googleAudio.buffer.length, googleConfigured:true });
          res.setHeader('X-DBest-Voice-Model', googleAudio.model);
          res.setHeader('X-DBest-Voice-Locale', locale);
          res.setHeader('Content-Type', googleAudio.mediaType);
          res.setHeader('Content-Length', String(googleAudio.buffer.length));
          return res.status(200).send(googleAudio.buffer);
        }
      } catch (err) {
        console.warn('DBest Gemini TTS exhausted', String(err?.message || err).slice(0, 260));
      }
    }

    const [{ experimental_generateSpeech: generateSpeech, experimental_transcribe: transcribe }, { gateway }] = await Promise.all([
      import('ai'), import('@ai-sdk/gateway')
    ]);

    let result;
    let modelUsed = '';
    if (useIndianVoice) {
      result = await generateSpeech({
        model: gateway.speechModel('fish-audio/s2.1-pro-free'),
        text,
        voice: '933563129e564b19a115bedd57b7406a',
        speed: 0.92,
        maxRetries: 0
      });
      modelUsed = 'fish-audio/s2.1-pro-free';
    } else {
      const allowedVoices = ['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse','marin','cedar'];
      const voice = allowedVoices.includes(String(body.voice || '')) ? String(body.voice) : 'shimmer';
      const language = base || 'auto';
      const models = ['openai/gpt-4o-mini-tts', 'openai/tts-1'];
      let lastError = null;
      for (const modelId of models) {
        try {
          const opts = { model: gateway.speechModel(modelId), text, voice, speed: 0.94, maxRetries: 0 };
          if (language !== 'auto') opts.language = language;
          if (modelId === 'openai/gpt-4o-mini-tts') opts.instructions = 'Speak in a soft, warm, calm, friendly feminine voice. Use gentle pacing and clear pronunciation. Speak in exactly the language and script of the supplied text. Do not translate it.';
          result = await generateSpeech(opts);
          modelUsed = modelId;
          break;
        } catch (err) {
          lastError = err;
          console.warn('DBest speech model fallback', modelId, String(err?.message || err).slice(0, 180));
        }
      }
      if (!result) throw lastError || new Error('No speech model available');
    }

    const buf = Buffer.from(result.audio.uint8Array);
    if (smoke) {
      let transcript = '', transcriptionError = '';
      try {
        const check = await transcribe({ model: gateway.transcriptionModel('fish-audio/transcribe-1'), audio: buf, maxRetries: 0 });
        transcript = String(check.text || '').trim();
      } catch (err) { transcriptionError = String(err?.message || err).slice(0, 220); }
      return res.status(200).json({ ok:true, locale, modelUsed, bytes:buf.length, transcript, transcriptionCheck:transcriptionError?'unavailable':'completed', googleConfigured:false });
    }

    res.setHeader('X-DBest-Voice-Model', modelUsed);
    res.setHeader('X-DBest-Voice-Locale', locale);
    res.setHeader('Content-Type', result.audio.mediaType || 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('DBest AI speech error', err);
    const msg = String(err?.message || err || '');
    const rateLimited = Number(err?.statusCode) === 429 || /rate.?limit|free tier|quota/i.test(msg);
    return res.status(rateLimited ? 429 : 503).json({
      error: rateLimited ? 'Voice service busy' : 'Language voice temporarily unavailable',
      code: rateLimited ? 'rate_limited' : 'speech_unavailable', locale,
      needsGeminiKey: useIndianVoice && !(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    });
  }
};