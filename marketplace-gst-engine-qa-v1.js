/* DBest Marketplace tax calculation — isolated, opt-in module.
 * Rates are NEVER inferred from broad product categories.
 * No production checkout integration until classification and liability review.
 */
(function(root){
  'use strict';
  function money(value){var n=Number(value);if(!Number.isFinite(n)||n<0)throw Error('Invalid monetary value');return Math.round((n+Number.EPSILON)*100)/100;}
  function rate(value){var n=Number(value);if(!Number.isFinite(n)||n<0||n>100)throw Error('Invalid GST rate');return n;}
  function calculate(input){
    if(!input||!Array.isArray(input.lines))throw Error('Order lines required');
    var tax=0,net=0,gross=0,breakdown=[];
    input.lines.forEach(function(line,i){
      var qty=Number(line.qty);
      if(!Number.isInteger(qty)||qty<1)throw Error('Invalid quantity on line '+i);
      var unit=money(line.unitPrice),amount=money(unit*qty);
      if(!line.taxRule||!line.taxRule.verified||!line.taxRule.hsnSac||!line.taxRule.effectiveFrom)
        throw Error('Verified HSN/SAC tax rule required for '+(line.name||'line '+i));
      var rule=line.taxRule;
      if(rule.effectiveTo&&input.orderDate&&input.orderDate>rule.effectiveTo)throw Error('Expired tax rule');
      if(input.orderDate&&input.orderDate<rule.effectiveFrom)throw Error('Tax rule not yet effective');
      if(!['taxable','exempt','nil','non_gst'].includes(rule.treatment))throw Error('Invalid tax treatment');
      var pct=rule.treatment==='taxable'?rate(rule.gstRate):0;
      if(rule.treatment==='taxable'&&rule.gstRate==null)throw Error('GST rate missing');
      var inclusive=!!line.taxInclusive;
      var taxable=rule.treatment==='taxable'?(inclusive?money(amount/(1+pct/100)):amount):amount;
      var gst=rule.treatment==='taxable'?money(inclusive?amount-taxable:taxable*pct/100):0;
      var total=money(taxable+gst);
      if(rule.treatment==='taxable'&&inclusive)total=amount;
      var split=null;
      if(gst>0){
        if(input.supplyType==='intra_state')split={cgst:money(gst/2),sgst:money(gst-money(gst/2)),igst:0};
        else if(input.supplyType==='inter_state')split={cgst:0,sgst:0,igst:gst};
        else throw Error('Supply type required for taxable lines');
      }
      net=money(net+taxable);tax=money(tax+gst);gross=money(gross+total);
      breakdown.push({id:line.id||String(i),hsnSac:rule.hsnSac,treatment:rule.treatment,rate:pct,quantity:qty,taxableValue:taxable,gst:gst,total:total,split:split,liability:rule.liability||'review_required'});
    });
    if(input.delivery&&Number(input.delivery.amount)>0){
      if(!input.delivery.taxRule)throw Error('Delivery GST treatment must be reviewed');
      var deliveryLine={id:'delivery',name:'Delivery',qty:1,unitPrice:input.delivery.amount,taxInclusive:!!input.delivery.taxInclusive,taxRule:input.delivery.taxRule};
      var d=calculate({lines:[deliveryLine],orderDate:input.orderDate,supplyType:input.supplyType});
      net=money(net+d.taxableSubtotal);tax=money(tax+d.gstTotal);gross=money(gross+d.grandTotal);breakdown.push(d.lines[0]);
    }
    return {taxableSubtotal:net,gstTotal:tax,grandTotal:gross,lines:breakdown,reviewRequired:breakdown.some(function(x){return x.liability==='review_required';})};
  }
  root.DBestTaxEngine={calculate:calculate};
})(typeof window!=='undefined'?window:globalThis);
