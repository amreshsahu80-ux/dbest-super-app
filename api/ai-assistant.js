module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  const smokeCases = {
    hi: { message: 'मुझे 15000 रुपये में गोवा पैकेज चाहिए', locale: 'auto', detectedLocale: 'hi-IN', history: [] },
    bn: { message: 'আমার ১৫ হাজার টাকার মধ্যে গোয়া প্যাকেজ চাই', locale: 'auto', detectedLocale: 'bn-IN', history: [] },
    or: { message: 'ମୋତେ ୧୫ ହଜାର ଟଙ୍କା ଭିତରେ ଗୋଆ ପ୍ୟାକେଜ ଦରକାର', locale: 'auto', detectedLocale: 'or-IN', history: [] },
    ta: { message: 'எனக்கு 15000 ரூபாய்க்குள் கோவா பேக்கேஜ் வேண்டும்', locale: 'auto', detectedLocale: 'ta-IN', history: [] }
  };
  let body;
  if (req.method === 'GET' && req.query && smokeCases[String(req.query.smoke || '')]) body = smokeCases[String(req.query.smoke)];
  else if (req.method === 'POST') body = req.body && typeof req.body === 'object' ? req.body : {};
  else { res.setHeader('Allow', 'POST, GET'); return res.status(405).json({ error: 'Method not allowed' }); }

  const message = String(body.message || '').trim().slice(0, 2000);
  const locale = String(body.locale || 'auto').trim().slice(0, 20);
  const detectedLocaleRaw = String(body.detectedLocale || '').trim().toLowerCase().slice(0, 40);
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const LOCALES = {
    en:'en-IN', english:'en-IN', hi:'hi-IN', hindi:'hi-IN', bn:'bn-IN', bengali:'bn-IN', bangla:'bn-IN',
    mr:'mr-IN', marathi:'mr-IN', te:'te-IN', telugu:'te-IN', ta:'ta-IN', tamil:'ta-IN', gu:'gu-IN', gujarati:'gu-IN',
    ur:'ur-IN', urdu:'ur-IN', kn:'kn-IN', kannada:'kn-IN', or:'or-IN', od:'or-IN', odia:'or-IN', ori:'or-IN',
    ml:'ml-IN', malayalam:'ml-IN', pa:'pa-IN', punjabi:'pa-IN', as:'as-IN', assamese:'as-IN', ne:'ne-IN', nepali:'ne-IN',
    kok:'kok-IN', konkani:'kok-IN', ks:'ks-IN', kashmiri:'ks-IN', mni:'mni-IN', manipuri:'mni-IN', maithili:'mai-IN', mai:'mai-IN',
    sd:'sd-IN', sindhi:'sd-IN', doi:'doi-IN', dogri:'doi-IN', brx:'brx-IN', bodo:'brx-IN', sat:'sat-IN', santali:'sat-IN',
    sa:'sa-IN', sanskrit:'sa-IN'
  };
  const NAMES = {
    'en-IN':'English','hi-IN':'Hindi','bn-IN':'Bengali','mr-IN':'Marathi','te-IN':'Telugu','ta-IN':'Tamil','gu-IN':'Gujarati',
    'ur-IN':'Urdu','kn-IN':'Kannada','or-IN':'Odia','ml-IN':'Malayalam','pa-IN':'Punjabi','as-IN':'Assamese','ne-IN':'Nepali',
    'kok-IN':'Konkani','ks-IN':'Kashmiri','mni-IN':'Manipuri','mai-IN':'Maithili','sd-IN':'Sindhi','doi-IN':'Dogri',
    'brx-IN':'Bodo','sat-IN':'Santali','sa-IN':'Sanskrit'
  };
  function normalizeLocale(v) {
    const x = String(v || '').trim().toLowerCase();
    if (!x) return '';
    const direct = Object.keys(NAMES).find(k => k.toLowerCase() === x);
    if (direct) return direct;
    const base = x.split('-')[0];
    return LOCALES[x] || LOCALES[base] || '';
  }
  function inferFromScript(text) {
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or-IN';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn-IN';
    if (/[\u0600-\u06FF]/.test(text)) return 'ur-IN';
    if (/[\u1C50-\u1C7F]/.test(text)) return 'sat-IN';
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    return '';
  }

  const explicitlySelected = locale !== 'auto' ? normalizeLocale(locale) : '';
  const detectedLocale = normalizeLocale(detectedLocaleRaw);
  const scriptLocale = inferFromScript(message);
  const targetLocale = explicitlySelected || detectedLocale || scriptLocale || '';
  const targetLanguage = targetLocale ? NAMES[targetLocale] : '';
  const safeHistory = history.filter(x => x && (x.role === 'user' || x.role === 'assistant')).map(x => ({ role: x.role, content: String(x.content || '').slice(0, 1200) }));

  const languageRule = targetLanguage
    ? `MANDATORY LANGUAGE RULE: Reply ONLY in ${targetLanguage} (${targetLocale}). Do not answer in English unless the user's message itself is English or the user explicitly asks for English. Preserve common product/place names such as DBest, Goa, hotel, cab, SIP, etc. when natural.`
    : 'MANDATORY LANGUAGE RULE: Identify the language of the user message and reply only in that same language. If the message is Hinglish or another natural mixed-language style, mirror that mix. Do not default to English.';
  const system = [
    'You are DBest AI Assistant running only in a TEST ENVIRONMENT.', languageRule,
    'The language rule is higher priority than style or convenience.',
    'Current demo scope: Travel, Insurance, Cab and Marketplace.',
    'Do not claim live prices, availability, booking, payment, policy issuance, investment execution or cab allocation. Clearly say estimates/sample results when relevant.',
    'For travel, ask only the most useful missing details such as origin, dates, travellers and budget, and give concise indicative options when possible.',
    'For insurance, provide only general factual guidance and needs-analysis questions; do not give regulated suitability advice or promise acceptance/claims.',
    'For cab and marketplace, do not confirm a real transaction.',
    'Keep replies concise, friendly and useful, usually 2-5 short sentences.',
    `Return JSON only in this exact shape: {"reply":"...","languageCode":"${targetLocale || 'detected-language-code'}","intent":"travel|insurance|cab|marketplace|account|general"}.`
  ].join(' ');

  try {
    const { generateText } = await import('ai');
    const result = await generateText({
      model: 'openai/gpt-5.6-luna',
      system,
      messages: [...safeHistory, { role: 'user', content: message }]
    });
    let content = String(result.text || '').trim();
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { reply: content, languageCode: targetLocale || 'auto', intent: 'general' }; }
    const reply = String(parsed.reply || '').trim().slice(0, 1800);
    if (!reply) return res.status(502).json({ error: 'Empty AI response' });
    return res.status(200).json({
      reply,
      languageCode: targetLocale || normalizeLocale(parsed.languageCode) || String(parsed.languageCode || 'auto').slice(0, 20),
      intent: String(parsed.intent || 'general').slice(0, 30),
      demo: true,
      smoke: req.method === 'GET'
    });
  } catch (err) {
    console.error('DBest AI assistant error', err);
    return res.status(500).json({ error: 'AI assistant temporarily unavailable' });
  }
};
