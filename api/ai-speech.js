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
  const indianLanguages = new Set([
    'hi','bn','mr','te','ta','gu','ur','kn','or','ml','pa','as','ne','kok','ks','mni','mai','sd','doi','brx','sat','sa'
  ]);
  const useIndianVoice = indianLanguages.has(base);

  try {
    const [{ experimental_generateSpeech: generateSpeech, experimental_transcribe: transcribe }, { gateway }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/gateway')
    ]);

    let result;
    let modelUsed = '';

    if (useIndianVoice) {
      // Fish Audio S2.1 Pro auto-detects the script/language and supports multilingual cross-lingual speech.
      // This reference ID is a soft female voice profile used in the provider's official examples.
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
          const opts = {
            model: gateway.speechModel(modelId),
            text,
            voice,
            speed: 0.94,
            maxRetries: 0
          };
          if (language !== 'auto') opts.language = language;
          if (modelId === 'openai/gpt-4o-mini-tts') {
            opts.instructions = 'Speak in a soft, warm, calm, friendly feminine voice. Use gentle pacing and clear pronunciation. Speak in exactly the language and script of the supplied text. Do not translate it.';
          }
          result = await generateSpeech(opts);
          modelUsed = modelId;
          break;
        } catch (err) {
          lastError = err;
          console.warn('DBest speech model fallback', modelId, String(err && err.message || err).slice(0, 180));
        }
      }
      if (!result) throw lastError || new Error('No speech model available');
    }

    const buf = Buffer.from(result.audio.uint8Array);

    // Test-only round-trip check. It verifies that deployed cloud TTS produces intelligible audio.
    if (smoke) {
      let transcript = '';
      let transcriptionError = '';
      try {
        const check = await transcribe({
          model: gateway.transcriptionModel('fish-audio/transcribe-1'),
          audio: buf,
          maxRetries: 0
        });
        transcript = String(check.text || '').trim();
      } catch (err) {
        transcriptionError = String(err && err.message || err).slice(0, 220);
      }
      return res.status(200).json({
        ok: true,
        locale,
        modelUsed,
        bytes: buf.length,
        transcript,
        transcriptionCheck: transcriptionError ? 'unavailable' : 'completed'
      });
    }

    res.setHeader('X-DBest-Voice-Model', modelUsed);
    res.setHeader('Content-Type', result.audio.mediaType || 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('DBest AI speech error', err);
    const msg = String(err && err.message || err || '');
    const rateLimited = Number(err && err.statusCode) === 429 || /rate.?limit|free tier/i.test(msg);
    return res.status(rateLimited ? 429 : 503).json({
      error: rateLimited ? 'Voice service busy' : 'Language voice temporarily unavailable',
      code: rateLimited ? 'rate_limited' : 'speech_unavailable',
      locale
    });
  }
};
