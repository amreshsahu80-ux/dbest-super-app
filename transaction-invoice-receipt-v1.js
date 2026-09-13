(function(){
  'use strict';

  function normalizedStatus(tx) {
    return String((tx && tx.status) || '').trim().toLowerCase();
  }

  function transactionText(tx) {
    var meta = tx && tx.meta ? tx.meta : {};
    return [
      tx && tx.status,
      tx && tx.source,
      tx && tx.section,
      tx && tx.sub,
      tx && tx.details,
      meta.paymentMethod,
      meta.payment_method,
      meta.flow
    ].join(' ').toLowerCase();
  }

  function isExternal(tx) {
    var text = transactionText(tx);
    return !!(tx && tx.meta && tx.meta.external) || text.indexOf('external partner') >= 0 || text.indexOf('external success') >= 0;
  }

  function isCod(tx) {
    var text = transactionText(tx);
    return text.indexOf('cash on delivery') >= 0 || text.indexOf('pay after delivery') >= 0 || text.indexOf(' cod ') >= 0;
  }

  function eligible(tx) {
    if (!tx) return false;
    var status = normalizedStatus(tx);
    var blocked = ['failed','cancelled','canceled','rejected','declined','refunded','reversed','pending','initiated','submitted','awaiting','processing','retry'];
    if (blocked.some(function(word){ return status.indexOf(word) >= 0; })) return false;

    if (isExternal(tx)) {
      return ['verified','approved','successful','success','completed','complete'].some(function(word){ return status.indexOf(word) >= 0; });
    }

    if (isCod(tx)) {
      var text = transactionText(tx);
      return text.indexOf('delivered') >= 0 && (
        text.indexOf('cash collected') >= 0 ||
        text.indexOf('collection confirmed') >= 0 ||
        text.indexOf('payment collected') >= 0 ||
        text.indexOf('paid') >= 0
      );
    }

    return ['verified','successful','success','paid','completed','complete','activated','settled','confirmed'].some(function(word){ return status.indexOf(word) >= 0; });
  }

  window.DBEST_TX_INVOICE = Object.assign(window.DBEST_TX_INVOICE || {}, {
    version: '1.0.0',
    eligible: eligible,
    isExternal: isExternal,
    isCod: isCod
  });
})();