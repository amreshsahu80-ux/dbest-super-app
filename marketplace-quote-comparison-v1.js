/* DBest quotation comparison module. No payment or order mutation. */
(function (root) {
  'use strict';
  const CATEGORIES = Object.freeze({ grocery: 10, restaurant: 15, medicine: 15 });
  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid non-negative amount');
    return Math.round((n + Number.EPSILON) * 100);
  }
  function normalizeOffer(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid quotation');
    const id = String(raw.id || '').trim();
    const vendorId = String(raw.vendor_id || raw.vendorId || '').trim();
    if (!id || !vendorId) throw new Error('Quotation and vendor IDs required');
    const items = raw.items || raw.quote_items;
    if (!Array.isArray(items) || !items.length) throw new Error('Quotation requires items');
    const normalizedItems = items.map(item => {
      const name = String(item.name || '').trim();
      const quantity = Number(item.quantity ?? item.qty);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Invalid item');
      const unitPaise = money(item.unit_price ?? item.price);
      return { name, quantity, unitPaise, linePaise: Math.round(unitPaise * quantity),
        substitution: String(item.substitution_note || '') };
    });
    const subtotalPaise = normalizedItems.reduce((sum, item) => sum + item.linePaise, 0);
    const deliveryPaise = money(raw.delivery_fee ?? 0);
    return Object.freeze({
      id, vendorId, vendorName: String(raw.vendor_name || raw.vendorName || vendorId),
      version: String(raw.version ?? raw.updated_at ?? ''),
      status: String(raw.status || ''),
      expiresAt: raw.expires_at || null,
      items: normalizedItems,
      subtotalPaise, deliveryPaise, totalPaise: subtotalPaise + deliveryPaise
    });
  }
  function compare(offers) {
    return (Array.isArray(offers) ? offers : [])
      .map(normalizeOffer)
      .filter(offer => !offer.expiresAt || Date.parse(offer.expiresAt) > Date.now())
      .sort((a, b) => a.totalPaise - b.totalPaise || a.vendorName.localeCompare(b.vendorName));
  }
  function formatPaise(paise) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
  }
  root.DBEST_QUOTE_COMPARISON = Object.freeze({
    categoryRadiusKm: CATEGORIES, normalizeOffer, compare, formatPaise
  });
})(typeof window === 'undefined' ? globalThis : window);
