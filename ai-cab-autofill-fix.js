(() => {
  'use strict';

  let pending = null;
  let wrappedRide = false;
  let wrappedGps = false;
  let touched = { pickup:false, drop:false };
  const MAX_PENDING_AGE = 10 * 60 * 1000;

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
    if (!detail || String(detail.route || '').toLowerCase() !== 'car') return false;
    const userText = String(detail._userText || detail.userText || '');
    const taskData = inferCabPair(userText, detail.taskData || {});
    pending = { taskData, userText, at: Date.now() };
    touched = { pickup:false, drop:false };
    window.__DBEST_AI_CAB_PENDING__ = { ...taskData, at: pending.at };
    return true;
  }

  function refreshPendingFromLatest() {
    const latest = window.__DBEST_LAST_AI_DATA__;
    if (latest && String(latest.route || '').toLowerCase() === 'car') capture(latest);
    return pending;
  }

  function activePending() {
    return !!(pending && Date.now() - pending.at <= MAX_PENDING_AGE && (pending.taskData?.pickup || pending.taskData?.drop));
  }

  function seedRideDraft() {
    if (!activePending()) return false;
    const d = pending.taskData || {};
    try {
      if (typeof rideDraft !== 'undefined' && rideDraft) {
        if (d.pickup) rideDraft.pickup = String(d.pickup).trim();
        if (d.drop) rideDraft.drop = String(d.drop).trim();
        if (d.schedule) rideDraft.schedule = String(d.schedule);
        window.__DBEST_AI_CAB_STATE_SEEDED__ = {
          pickup: rideDraft.pickup || '',
          drop: rideDraft.drop || '',
          seededAt: Date.now()
        };
        return true;
      }
    } catch (err) {
      console.warn('DBest AI could not seed rideDraft', err);
    }
    return false;
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
      el.addEventListener('input', e => { if (e.isTrusted) touched[key] = true; });
      el.addEventListener('keydown', e => { if (e.isTrusted) touched[key] = true; });
    }
  }

  function syncVisibleFields() {
    if (!activePending()) return 0;
    const fields = findCabFields();
    bindUserEdits(fields);
    let count = 0;
    const d = pending.taskData || {};
    if (fields.pickup && d.pickup && !touched.pickup) {
      const v = String(d.pickup).trim();
      if (fields.pickup.value !== v) fields.pickup.value = v;
      fields.pickup.defaultValue = v;
      fields.pickup.dataset.dbestAiAutofilled = '1';
      count++;
    }
    if (fields.drop && d.drop && !touched.drop) {
      const v = String(d.drop).trim();
      if (fields.drop.value !== v) fields.drop.value = v;
      fields.drop.defaultValue = v;
      fields.drop.dataset.dbestAiAutofilled = '1';
      count++;
    }
    if (count) {
      window.__DBEST_AI_CAB_AUTOFILL_STATUS__ = {
        pickup: fields.pickup?.value || '',
        drop: fields.drop?.value || '',
        stateFirst: true,
        appliedAt: Date.now()
      };
    }
    return count;
  }

  function updateGpsStatusForAiPickup() {
    if (!activePending() || !pending.taskData?.pickup) return;
    const st = document.getElementById('rideLocationStatus');
    if (st) st.textContent = 'Pickup provided by DBest AI • Tap Use GPS to replace it';
  }

  function wrapGps() {
    if (wrappedGps || typeof window.fetchRideLiveLocation !== 'function') return false;
    const original = window.fetchRideLiveLocation;
    window.fetchRideLiveLocation = function(silent=false) {
      refreshPendingFromLatest();
      if (silent === true && activePending() && pending.taskData?.pickup && !touched.pickup) {
        seedRideDraft();
        syncVisibleFields();
        updateGpsStatusForAiPickup();
        return;
      }
      if (silent === false) {
        touched.pickup = true;
        if (pending?.taskData) pending.taskData.pickup = '';
      }
      return original.apply(this, arguments);
    };
    wrappedGps = true;
    return true;
  }

  function wrapRidePlatform() {
    if (wrappedRide || typeof window.openRidePlatform !== 'function') return false;
    const original = window.openRidePlatform;
    window.openRidePlatform = function(...args) {
      refreshPendingFromLatest();
      seedRideDraft();
      const result = original.apply(this, args);
      setTimeout(() => { syncVisibleFields(); updateGpsStatusForAiPickup(); }, 0);
      setTimeout(() => { syncVisibleFields(); updateGpsStatusForAiPickup(); }, 40);
      setTimeout(() => { syncVisibleFields(); updateGpsStatusForAiPickup(); }, 300);
      setTimeout(() => { syncVisibleFields(); updateGpsStatusForAiPickup(); }, 900);
      return result;
    };
    wrappedRide = true;
    return true;
  }

  function bindContinueCapture() {
    const host = document.getElementById('dbest-ai-test-host');
    const root = host?.shadowRoot;
    if (!root) return false;
    if (root.__dbestCabContinueCaptureBound) return true;
    root.__dbestCabContinueCaptureBound = true;
    root.addEventListener('click', e => {
      const btn = e.target?.closest?.('button');
      const label = String(btn?.textContent || '');
      if (!btn || !/Continue in DBest/i.test(label) || !/Cab/i.test(label)) return;
      const users = [...root.querySelectorAll('.msg.user')];
      const userText = String(users.at(-1)?.textContent || '').trim();
      const taskData = inferCabPair(userText, window.__DBEST_LAST_AI_DATA__?.taskData || {});
      capture({ route:'car', _userText:userText, taskData });
      seedRideDraft();
    }, true);
    return true;
  }

  function install() {
    const okRide = wrapRidePlatform();
    const okGps = wrapGps();
    bindContinueCapture();
    return !!(okRide && okGps);
  }

  window.addEventListener('dbest-ai-routing-data', e => capture(e.detail));
  if (window.__DBEST_LAST_AI_DATA__) capture(window.__DBEST_LAST_AI_DATA__);

  const timer = setInterval(() => {
    install();
    if (wrappedRide && wrappedGps && bindContinueCapture()) clearInterval(timer);
  }, 100);
  setTimeout(() => clearInterval(timer), 15000);

  install();

  window.__DBEST_AI_CAB_AUTOFILL__ = {
    capture,
    refreshPendingFromLatest,
    seedRideDraft,
    syncVisibleFields,
    bindContinueCapture,
    getPending: () => pending,
    version: '0.6-direct-continue-capture'
  };
})();
