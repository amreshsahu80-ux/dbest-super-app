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

    const options = {
      model: gateway.transcriptionModel('openai/gpt-4o-transcribe'),
      audio
    };

    // When the user explicitly selected a language, provide a language hint.
    // In Auto mode, do not provide a hint so the transcription model can detect it from speech.
    if (selectedLocale !== 'auto') {
      options.providerOptions = {
        openai: { language: selectedLocale.split('-')[0] }
      };
    }

    const result = await transcribe(options);
    const text = String(result.text || '').trim();
    const language = String(result.language || '').trim().toLowerCase();
    if (!text) return res.status(502).json({ error: 'No speech detected' });

    return res.status(200).json({
      text: text.slice(0, 2400),
      language,
      mimeType,
      demo: true
    });
  } catch (err) {
    console.error('DBest AI transcription error', err);
    return res.status(500).json({ error: 'Voice transcription temporarily unavailable' });
  }
};
