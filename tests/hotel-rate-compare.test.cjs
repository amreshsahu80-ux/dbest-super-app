'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('hotel-rate-compare.html', 'utf8');
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/i);
assert.ok(scriptMatch, 'Stand-alone preview must contain its application script');

function boot() {
  const elements = new Map();
  const defaults = {checkin:'2026-11-15',checkout:'2026-11-16',city:'all',adults:'2:1',ownerMarkup:'12'};
  function el(id) {
    if (!elements.has(id)) elements.set(id, {
      id, value:defaults[id] || '', innerHTML:'', textContent:'', min:'',
      listeners:{}, classList:{toggle(){}}, style:{},
      setAttribute(){},
      addEventListener(event, fn){this.listeners[event]=fn},
      showModal(){},close(){}
    });
    return elements.get(id);
  }
  const context = {
    document: {
      getElementById:el,
      addEventListener(){},
      createElement(tag){return {tagName:tag,style:{},textContent:'',className:'',parentNode:{},remove(){}};}
    },
    window:{scrollTo(){}},
    navigator:{},
    console,
    Date,
    URL,
    Blob,
    setTimeout() {},
    alert(message){throw new Error('Unexpected alert: '+message)}
  };
  vm.runInNewContext(scriptMatch[1],context,{filename:'hotel-rate-compare.inline.js',timeout:3000});
  return {el};
}
test('6 real-name hotel cards, 5 photo links, missing permission placeholder',()=>{
  const {el}=boot();
  const output=el('results').innerHTML;
  assert.equal((output.match(/<article class="hotel">/g)||[]).length,6);
  assert.equal((output.match(/data-property-photo="1"/g)||[]).length,5);
  assert.match(output,/Hotel Nandan/);
  assert.match(output,/awaiting usage permission/);
  assert.match(output,/Illustrative/);
  assert.match(html,/not live prices/i);
});
test('real property photos carry source, photographer, licence and property identifier',()=>{
 const {el}=boot(),out=el('results').innerHTML;
 assert.equal((out.match(/Photo source<\/a>/g)||[]).length,5);
 assert.equal((out.match(/data-property-id=/g)||[]).length,5);
 assert.match(out,/CC BY-SA 4\.0/);
 assert.match(out,/CC BY-SA 3\.0/);
 assert.match(out,/commons\.wikimedia\.org/);
});
test('owner supplier rate not exposed in public price box; demo selling price distinct',()=>{
 const {el}=boot(),guest=el('results').innerHTML,owner=el('ownerRows').innerHTML;
 assert.match(guest,/DBest illustrative guest price/);
 assert.match(owner,/Rambagh Palace/);
 assert.doesNotMatch(guest,/Private B2B base/);
});
test('image load and error events update owner diagnostics, with unavailable-image fallback',()=>{
 const {el}=boot(),listeners=el('results').listeners;
 assert.equal(typeof listeners.load,'function');
 assert.equal(typeof listeners.error,'function');
 const p={dataset:{propertyId:'DBEST-REPL-20261024-149'},matches:()=>true,style:{}};
 listeners.load({target:p});
 assert.match(el('photoSummary').innerHTML,/1 photo\(s\) loaded/);
 assert.match(el('photoRows').innerHTML,/Loaded on this device/);
 let inserted=false;
 const image={dataset:{propertyId:'DBEST-REPL-20261024-138'},matches:()=>true,style:{},parentNode:{insertBefore(node){inserted=(node.textContent==='Property photo temporarily unavailable')}}};
 listeners.error({target:image});
 assert.equal(image.style.display,'none');
 assert.ok(inserted);
 assert.match(el('photoSummary').innerHTML,/1 failed/);
});
test('date and destination search rerenders matching result without changing owner markup',()=>{
 const {el}=boot();
 el('city').value='Goa'; el('checkin').value='2026-11-15'; el('checkout').value='2026-11-18';
 el('searchForm').listeners.submit({preventDefault(){}});
 const out=el('results').innerHTML;
 assert.equal((out.match(/<article class="hotel">/g)||[]).length,1);
 assert.match(out,/Royal Orchid Beach Resort/);
 assert.match(el('stayLabel').textContent,/3 nights/);
 el('ownerMarkup').listeners.change({target:{value:'20'}});
 assert.match(el('results').innerHTML,/Royal Orchid Beach Resort/);
 assert.match(el('ownerRows').innerHTML,/5,?\d{3}/);
});
test('no real OTA feed or checkout is wired into demo',()=>{
 assert.match(html,/not connected to live DBest bookings/i);
 assert.match(html,/not owner approved/i);
 assert.match(html,/tax_included/);
 assert.match(html,/permission/);
 assert.match(html,/Snapshot older than 3 hours/);
 assert.doesNotMatch(html, /<script\b[^>]+src=["']https:\/\/[^"']+["']/i);
});

test('untrusted CSV cannot replace illustrative public hotel prices',()=>{
 const {el}=boot();
 const htmlGuest=el('results').innerHTML;
 assert.match(htmlGuest,/MMT/);
 assert.match(htmlGuest,/Demo/);
 assert.match(html,/o\.accepted=false;o\.reviewState='candidate';imported\.push\(o\)/);
 assert.doesNotMatch(html,/o\.accepted=true;imported\.push\(o\)/);
 const offerMatch=html.match(/function offers\(h\)\{[\s\S]*?\}\nfunction render\(/);
 assert.ok(offerMatch);
 assert.doesNotMatch(offerMatch[0],/matchQuote|total_inr/);
});
