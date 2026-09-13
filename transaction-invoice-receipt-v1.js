(function(){
  'use strict';

  function normalizedStatus(tx) {
    return String((tx && tx.status) || '').trim().toLowerCase();
  }

  function transactionText(tx) {
    var meta = tx && tx.meta ? tx.meta : {};
    var order = meta && meta.order ? meta.order : {};
    return [
      tx && tx.status,
      tx && tx.source,
      tx && tx.section,
      tx && tx.sub,
      tx && tx.details,
      meta.paymentStatus,
      meta.payment_status,
      meta.paymentStage,
      meta.payment_stage,
      meta.paymentMethod,
      meta.payment_method,
      meta.flow,
      order.paymentStatus,
      order.paymentMethod
    ].join(' ').toLowerCase();
  }

  function isExternal(tx) {
    var text = transactionText(tx);
    return !!(tx && tx.meta && tx.meta.external) || text.indexOf('external partner') >= 0 || text.indexOf('external success') >= 0;
  }

  function isPayAtDelivery(tx) {
    var text = transactionText(tx);
    return text.indexOf('pay_at_delivery_online') >= 0 || text.indexOf('pay online at delivery') >= 0 || text.indexOf('payment due at delivery') >= 0 || text.indexOf('due at delivery') >= 0;
  }

  function paymentConfirmed(tx) {
    var text = transactionText(tx);
    var status = normalizedStatus(tx);
    var blocked = ['failed','cancelled','canceled','rejected','declined','refunded','reversed','pending','initiated','submitted','awaiting','processing','retry','payment due','unpaid'];
    if (blocked.some(function(word){ return text.indexOf(word) >= 0; })) return false;

    var explicitPaid = ['payment verified','payment successful','payment success','paid','settled','captured'].some(function(word){ return text.indexOf(word) >= 0; });
    if (explicitPaid) return true;

    if (isExternal(tx)) {
      return ['verified','approved','successful','success','completed','complete'].some(function(word){ return status.indexOf(word) >= 0; });
    }

    return ['verified','successful','success','settled','completed','complete','activated'].some(function(word){ return status.indexOf(word) >= 0; });
  }

  function eligible(tx) {
    if (!tx) return false;
    if (isPayAtDelivery(tx) && !paymentConfirmed(tx)) return false;
    return paymentConfirmed(tx);
  }

  window.DBEST_TX_INVOICE = Object.assign(window.DBEST_TX_INVOICE || {}, {
    version: '1.1.0',
    eligible: eligible,
    paymentConfirmed: paymentConfirmed,
    isExternal: isExternal,
    isPayAtDelivery: isPayAtDelivery
  });
})();