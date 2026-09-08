module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const audioBase64 = String(body.audioBase64 || '');
    const mimeType = String(body.mimeType || 'audio/webm').slice(0, 80);
    const selectedLocale = String(body.locale || 'auto').slice(0, 20);
    if (!audioBase64) return res.status(400).json({ error: 'Audio is required' });
    if (audioBase64.length > 6_000_000) return res.status(413).json({ error: 'Audio clip too large' });

    const audio = Buffer.from(audioBase64, 'base64');
    if (!audio.length) return res.status(400).json({ error: 'Invalid audio' });

    const [{ experimental_transcribe: transcribe }, { gateway }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/gateway')
    ]);

    const models = ['openai/gpt-4o-mini-transcribe', 'openai/gpt-4o-transcribe', 'xai/grok-stt'];
    let result = null;
    let lastError = null;

    for (const modelId of models) {
      try {
        const options = {
          model: gateway.transcriptionModel(modelId),
          audio,
          maxRetries: 0
        };
        if (selectedLocale !== 'auto' && modelId.startsWith('openai/')) {
          options.providerOptions = { openai: { language: selectedLocale.split('-')[0] } };
        }
        result = await transcribe(options);
        if (result && String(result.text || '').trim()) break;
      } catch (err) {
        lastError = err;
        console.warn('DBest transcription model fallback', modelId, String(err && err.message || err).slice(0, 180));
      }
    }

    if (!result) throw lastError || new Error('No transcription model available');
    const text = String(result.text || '').trim();
    const language = String(result.language || '').trim().toLowerCase();
    if (!text) return res.status(502).json({ error: 'No speech detected' });

    return res.status(200).json({ text: text.slice(0, 2400), language, mimeType, demo: true });
  } catch (err) {
    console.error('DBest AI transcription error', err);
    const msg = String(err && err.message || err || '');
    const rateLimited = Number(err && err.statusCode) === 429 || /rate.?limit|free tier/i.test(msg);
    return res.status(rateLimited ? 429 : 500).json({
      error: rateLimited ? 'Voice detection busy' : 'Voice transcription temporarily unavailable',
      code: rateLimited ? 'rate_limited' : 'transcription_unavailable'
    });
  }
};
