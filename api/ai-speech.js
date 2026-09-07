module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = String(body.text || '').trim().slice(0, 1400);
  const voice = ['alloy','echo','fable','onyx','nova','shimmer'].includes(body.voice) ? body.voice : 'nova';
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const [{ experimental_generateSpeech: generateSpeech }, { gateway }] = await Promise.all([
      import('ai'),
      import('@ai-sdk/gateway')
    ]);
    const result = await generateSpeech({
      model: gateway.speechModel('openai/tts-1'),
      text,
      voice
    });
    const buf = Buffer.from(result.audio.uint8Array);
    res.setHeader('Content-Type', result.audio.mediaType || 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('DBest AI speech error', err);
    return res.status(500).json({ error: 'Neural voice temporarily unavailable' });
  }
};
