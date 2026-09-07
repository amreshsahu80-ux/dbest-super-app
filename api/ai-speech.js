module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '').trim();
  if (!token) return res.status(503).json({ error: 'AI gateway authentication unavailable' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const text = String(body.text || '').trim().slice(0, 1400);
  const voice = ['alloy','echo','fable','onyx','nova','shimmer'].includes(body.voice) ? body.voice : 'nova';
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const upstream = await fetch('https://ai-gateway.vercel.sh/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/tts-1',
        input: text,
        voice,
        response_format: 'mp3',
        speed: 0.98
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('DBest AI speech gateway error', upstream.status, detail.slice(0, 500));
      return res.status(502).json({ error: 'Neural voice unavailable' });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error('DBest AI speech error', err);
    return res.status(500).json({ error: 'Neural voice temporarily unavailable' });
  }
};
