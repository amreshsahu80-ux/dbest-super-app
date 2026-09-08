module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = String(body.text || '').trim().slice(0, 1600);
  const locale = String(body.locale || 'auto').trim().slice(0, 20);
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const allowedVoices = ['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse','marin','cedar'];
  const voice = allowedVoices.includes(String(body.voice || '')) ? String(body.voice) : 'shimmer';
  const language = locale && locale !== 'auto' ? locale.split('-')[0] : 'auto';
  const models = ['openai/gpt-4o-mini-tts', 'openai/tts-1'];

  try {
    const [{ experimental_generateSpeech: generateSpeech }, { gateway }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/gateway')
    ]);

    let result = null;
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
          opts.instructions = 'Speak in a soft, warm, calm, friendly feminine voice. Use a natural Indian conversational cadence, gentle pacing and clear pronunciation. Speak in exactly the language and script of the supplied text. Do not translate it.';
        }
        result = await generateSpeech(opts);
        break;
      } catch (err) {
        lastError = err;
        console.warn('DBest speech model fallback', modelId, String(err && err.message || err).slice(0, 180));
      }
    }
    if (!result) throw lastError || new Error('No speech model available');

    const buf = Buffer.from(result.audio.uint8Array);
    res.setHeader('Content-Type', result.audio.mediaType || 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('DBest AI speech error', err);
    const msg = String(err && err.message || err || '');
    const rateLimited = Number(err && err.statusCode) === 429 || /rate.?limit|free tier/i.test(msg);
    return res.status(rateLimited ? 429 : 500).json({
      error: rateLimited ? 'Neural voice busy' : 'Neural voice temporarily unavailable',
      code: rateLimited ? 'rate_limited' : 'speech_unavailable'
    });
  }
};
