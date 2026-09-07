module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '').trim();
  if (!token) {
    return res.status(503).json({ error: 'AI gateway authentication unavailable' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = String(body.message || '').trim().slice(0, 2000);
  const locale = String(body.locale || 'auto').trim().slice(0, 20);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (!message) return res.status(400).json({ error: 'Message is required' });

  const safeHistory = history
    .filter(x => x && (x.role === 'user' || x.role === 'assistant'))
    .map(x => ({ role: x.role, content: String(x.content || '').slice(0, 1200) }));

  const system = [
    'You are DBest AI Assistant running only in a TEST ENVIRONMENT.',
    'Your job is to understand Indian users naturally across English, Hinglish and major Indian languages.',
    'Always reply in the same language the user is using. If the user mixes languages, reply naturally in the same mix.',
    locale !== 'auto' ? `The user selected locale ${locale}; prefer that language.` : 'Automatically infer the user language.',
    'Current demo scope: Travel, Insurance, Cab and Marketplace.',
    'Do not claim live prices, availability, booking, payment, policy issuance, investment execution or cab allocation. Clearly say estimates/sample results when relevant.',
    'For travel, ask only the most useful missing details such as origin, dates, travellers and budget, and give concise indicative options when possible.',
    'For insurance, provide only general factual guidance and needs-analysis questions; do not give regulated suitability advice or promise acceptance/claims.',
    'For cab and marketplace, do not confirm a real transaction.',
    'Keep replies concise, friendly and useful, usually 2-5 short sentences.',
    'Return JSON only in this exact shape: {"reply":"...","languageCode":"...","intent":"travel|insurance|cab|marketplace|account|general"}.'
  ].join(' ');

  try {
    const upstream = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.6-luna',
        messages: [{ role: 'system', content: system }, ...safeHistory, { role: 'user', content: message }],
        max_tokens: 320,
        temperature: 0.4
      })
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error('DBest AI gateway error', upstream.status, raw.slice(0, 500));
      return res.status(502).json({ error: 'AI response unavailable' });
    }

    const data = JSON.parse(raw);
    let content = String(data?.choices?.[0]?.message?.content || '').trim();
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { reply: content, languageCode: locale === 'auto' ? 'auto' : locale, intent: 'general' }; }

    const reply = String(parsed.reply || '').trim().slice(0, 1800);
    if (!reply) return res.status(502).json({ error: 'Empty AI response' });

    return res.status(200).json({
      reply,
      languageCode: String(parsed.languageCode || (locale === 'auto' ? 'auto' : locale)).slice(0, 20),
      intent: String(parsed.intent || 'general').slice(0, 30),
      demo: true
    });
  } catch (err) {
    console.error('DBest AI assistant error', err);
    return res.status(500).json({ error: 'AI assistant temporarily unavailable' });
  }
};
