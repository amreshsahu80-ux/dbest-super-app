module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex,nofollow,noarchive');
  try {
    const { generateText } = await import('ai');
    const result = await generateText({ model:'openai/gpt-5.6-luna', prompt:'Reply with exactly OK.' });
    return res.status(200).json({ ok:true, text:String(result.text||'').slice(0,80) });
  } catch (err) {
    return res.status(500).json({
      ok:false,
      name:String(err && err.name || 'Error').slice(0,80),
      message:String(err && err.message || err || '').slice(0,500),
      hasOidc:Boolean(process.env.VERCEL_OIDC_TOKEN),
      hasGatewayKey:Boolean(process.env.AI_GATEWAY_API_KEY)
    });
  }
};
