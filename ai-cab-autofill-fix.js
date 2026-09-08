(() => {
  'use strict';

  let pending = null;
  let wrapped = false;
  let touched = { pickup:false, drop:false };

  function inferCabPair(text, data={}) {
    const out = { ...(data || {}) };
    if (out.pickup && out.drop) return out;
    const raw = String(text || '').replace(/\s+/g,' ').trim();
    let m = raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if (m) {
      if (!out.pickup) out.pickup = m[1].trim();
      if (!out.drop) out.drop = m[2].trim();
      return out;
    }
    m = raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if (m) {
      const parts = m[1].trim().split(/\s+/).filter(Boolean);
      if (parts.length === 2) {
        if (!out.pickup) out.pickup = parts[0];
        if (!out.drop) out.drop = parts[1];
      }
    }
    return out;
  }

  function capture(detail) {
    if (!detail) return;
    const route = String(detail.route || '').toLowerCase();
    if (route !== 'car') return;
    const userText = String(detail._userText || detail.userText || '');
    pending = {
      taskData: inferCabPair(userText, detail.taskData || {}),
      userText,
      at: Date.now()
    };
    touched = { pickup:false, drop:false };
  }

  function findCabFields() {
    return {
      pickup: document.getElementById('ridePickup') || document.getElementsByName('pickup')[0] || null,
      drop: document.getElementsByName('drop')[0] || null
    };
  }

  function bindUserEdits(fields) {
    for (const key of ['pickup','drop']) {
      const el = fields[key];
      if (!el || el.dataset.dbestAiBound === '1') continue;
      el.dataset.dbestAiBound = '1';
      el.addEventListener('input', e => {
        if (e.isTrusted) touched[key] = true;
      });
      el.addEventListener('keydown', e => {
        if (e.isTrusted) touched[key] = true;
      });
    }
  }

  function writeValue(el, value, key) {
    if (!el || value == null || value === '' || touched[key]) return false;
    const next = String(value).trim();
    if (!next) return false;
    try {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, next); else el.value = next;
    } catch { el.value = next; }
    el.defaultValue = next;
    el.dataset.dbestAiAutofilled = '1';
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
    return true;
  }

  function applyCabAutofill() {
    if (!pending?.taskData) return 0;
    const fields = findCabFields();
    bindUserEdits(fields);
    let count = 0;
    if (writeValue(fields.pickup, pending.taskData.pickup, 'pickup')) count++;
    if (writeValue(fields.drop, pending.taskData.drop, 'drop')) count++;
    if (count) {
      window.__DBEST_AI_CAB_AUTOFILL_STATUS__ = {
        pickup: fields.pickup?.value || '',
        drop: fields.drop?.value || '',
        appliedAt: Date.now()
      };
    }
    return count;
  }

  function scheduleAutofill() {
    [0,40,120,260,450,750,1200,2000,3500,5500,8000,11000,14500,16500].forEach(ms => {
      setTimeout(applyCabAutofill, ms);
    });
  }

  function wrapRidePlatform() {
    if (wrapped || typeof window.openRidePlatform !== 'function') return false;
    const original = window.openRidePlatform;
    window.openRidePlatform = function(...args) {
      const result = original.apply(this, args);
      scheduleAutofill();
      return result;
    };
    window.openRidePlatform.__dbestAiWrapped = true;
    wrapped = true;
    return true;
  }

  window.addEventListener('dbest-ai-routing-data', e => capture(e.detail));

  const existing = window.__DBEST_LAST_AI_DATA__;
  if (existing) capture(existing);

  if (!wrapRidePlatform()) {
    const timer = setInterval(() => {
      if (wrapRidePlatform()) clearInterval(timer);
    }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  }

  window.__DBEST_AI_CAB_AUTOFILL__ = {
    apply: applyCabAutofill,
    capture,
    version: '0.3-cab-render-bridge'
  };
})();
