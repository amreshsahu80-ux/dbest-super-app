(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const synth = window.speechSynthesis;
  const originalSpeak = synth && typeof synth.speak === 'function' ? synth.speak.bind(synth) : null;
  const originalGetVoices = synth && typeof synth.getVoices === 'function' ? synth.getVoices.bind(synth) : () => [];

  const LANGUAGE_NATIVE = new Set([
    'or','as','mr','te','ta','gu','ur','kn','ml','pa','ne','kok','ks','mni','mai','sd','doi','brx','sat','sa'
  ]);
  const FEMALE_HINT = /female|woman|subhasini|vaani|swara|priya|veena|lekha|heera|raveena|diya|meera|aarti|neerja|samantha|victoria|karen|moira/i;

  function base(locale) {
    return String(locale || '').trim().toLowerCase().split('-')[0];
  }

  function updateStatus(text) {
    try {
      const root = document.querySelector('#dbest-ai-test-host')?.shadowRoot;
      const status = root?.querySelector('#status');
      if (status) status.textContent = text;
    } catch {}
  }

  function exactVoices(locale) {
    const b = base(locale);
    return originalGetVoices().filter(v => base(v.lang) === b);
  }

  function bestNativeVoice(locale) {
    const voices = exactVoices(locale);
    return voices.find(v => FEMALE_HINT.test(v.name || '')) || voices.find(v => /google|microsoft|android/i.test(v.name || '')) || voices[0] || null;
  }

  // Do not send Odia and other less reliably supported Indian languages to a generic neural TTS.
  // The client will fall back to the device's language-native voice instead.
  window.fetch = async function(input, init) {
    try {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      if (url.includes('/api/ai-speech') && init?.body) {
        const body = JSON.parse(String(init.body));
        const locale = String(body.locale || '');
        if (LANGUAGE_NATIVE.has(base(locale))) {
          window.__DBEST_NATIVE_VOICE_LOCALE__ = locale;
          return new Response(JSON.stringify({ code: 'use_native_voice', locale }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } catch {}
    return originalFetch(input, init);
  };

  if (synth && originalSpeak) {
    try {
      synth.speak = function(utterance) {
        try {
          const locale = String(utterance?.lang || window.__DBEST_NATIVE_VOICE_LOCALE__ || '');
          const b = base(locale);
          if (LANGUAGE_NATIVE.has(b)) {
            const voice = bestNativeVoice(locale);
            if (!voice) {
              updateStatus(`Voice for ${locale || 'this language'} is not installed on this phone • text reply kept correct`);
              return;
            }
            utterance.voice = voice;
            utterance.lang = voice.lang || locale;
            utterance.rate = 0.9;
            utterance.pitch = 1.03;
            updateStatus(`Speaking with ${voice.lang || locale} native voice`);
          }
        } catch {}
        return originalSpeak(utterance);
      };
    } catch {}
  }

  // Update the visible wording so the test does not imply one generic neural voice is used for every Indian language.
  const observer = new MutationObserver(() => {
    try {
      const root = document.querySelector('#dbest-ai-test-host')?.shadowRoot;
      if (!root) return;
      const sub = root.querySelector('.sub');
      const voice = root.querySelector('#voice');
      if (sub) sub.textContent = 'Auto language • Same-language replies • Language-native female voice';
      if (voice && /Soft female voice/.test(voice.textContent || '')) voice.textContent = '🌸 Language-native female voice: On';
    } catch {}
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
})();
