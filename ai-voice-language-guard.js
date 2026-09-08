(() => {
  'use strict';

  const synth = window.speechSynthesis;
  const originalSpeak = synth && typeof synth.speak === 'function' ? synth.speak.bind(synth) : null;
  const originalGetVoices = synth && typeof synth.getVoices === 'function' ? synth.getVoices.bind(synth) : () => [];

  const STRICT_NATIVE = new Set([
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

  // The main voice path is now server-side multilingual cloud TTS.
  // This guard applies only if the cloud voice fails and the browser fallback is attempted.
  if (synth && originalSpeak) {
    try {
      synth.speak = function(utterance) {
        try {
          const locale = String(utterance?.lang || '');
          const b = base(locale);
          if (STRICT_NATIVE.has(b)) {
            const voice = bestNativeVoice(locale);
            if (!voice) {
              updateStatus(`Cloud voice unavailable • no ${locale || 'matching'} phone voice installed • text reply kept correct`);
              return;
            }
            utterance.voice = voice;
            utterance.lang = voice.lang || locale;
            utterance.rate = 0.9;
            utterance.pitch = 1.03;
            updateStatus(`Using ${voice.lang || locale} phone voice fallback`);
          }
        } catch {}
        return originalSpeak(utterance);
      };
    } catch {}
  }

  const observer = new MutationObserver(() => {
    try {
      const root = document.querySelector('#dbest-ai-test-host')?.shadowRoot;
      if (!root) return;
      const sub = root.querySelector('.sub');
      const voice = root.querySelector('#voice');
      if (sub) sub.textContent = 'Auto language • Same-language replies • Cloud multilingual female voice';
      if (voice) voice.textContent = voice.textContent.includes('Off') ? '🔇 Voice: Off' : '🌸 Multilingual female voice: On';
    } catch {}
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
})();
