'use strict';
const assert=require('node:assert/strict');
const { chromium }=require('playwright');
const baseline='https://dbest4u.com';
const preview=process.env.DBEST_PREVIEW_URL;
assert(preview&&/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(preview),'Approved Vercel preview origin required');
const hide=s=>String(s||'').replace(/AIza[0-9A-Za-z_-]+/g,'[REDACTED]');

async function probe(browser,base){
 const page=await browser.newPage();
 try{
  const errors=[];
  page.on('console',m=>{if(m.type()==='error'&&/google.maps|google maps|maps javascript api|referer|api key/i.test(m.text()))errors.push(hide(m.text()));});
  page.on('pageerror',e=>{if(/maps|google/i.test(e.message))errors.push(hide(e.message));});
  const nav=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(nav.status(),200,'Site must load on '+new URL(base).hostname);
  const r=await page.request.get(base+'/api/runtime-config',{timeout:20000});
  assert.equal(r.status(),200,'Runtime config must respond');
  const js=await r.text();
  const match=js.match(/"googleMapsApiKey":"(AIza[0-9A-Za-z_-]+)"/);
  assert(match,'Maps key missing from browser runtime config; value never logged');
  const state=await page.evaluate(async key=>await new Promise(resolve=>{
   let settled=false;
   const finish=x=>{if(!settled){settled=true;resolve(x)}};
   window.__dbestMapsProbeReady=async()=>{
    try{
     const maps=window.google?.maps;
     if(!maps?.Map)return finish('missing-map-constructor');
     const div=document.createElement('div');div.style.width='280px';div.style.height='170px';document.body.appendChild(div);
     new maps.Map(div,{center:{lat:22.675,lng:85.63},zoom:12});
     await new Promise(ok=>setTimeout(ok,2800));
     finish('map-constructor-ready');
    }catch(e){finish('map-error:'+String(e?.message||e))}
   };
   const s=document.createElement('script');
   s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&callback=__dbestMapsProbeReady';
   s.async=true;s.onerror=()=>finish('maps-script-network-error');document.head.appendChild(s);
   setTimeout(()=>finish('maps-initialization-timeout'),18000);
  }),match[1]);
  const detected=errors.map(x=>(x.match(/(?:ApiNotActivatedMapError|RefererNotAllowedMapError|ApiTargetBlockedMapError|InvalidKeyMapError|BillingNotEnabledMapError)/)||[])[0]).filter(Boolean);
  return {key:match[1],state,detected:[...new Set(detected)]};
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const live=await probe(browser,baseline),test=await probe(browser,preview);
  console.log('Frozen production Maps JS status:',live.state,live.detected.join(',')||'no auth codes');
  console.log('Preview Maps JS status:',test.state,test.detected.join(',')||'no auth codes');
  assert.equal(live.key,test.key,'Preview must use exact same already-published browser key as frozen production');
  assert.equal(live.state,test.state,'Preview Maps runtime differs from production');
  assert.deepEqual(live.detected,test.detected,'Preview Google Maps authorization error differs from frozen production');
  if(test.detected.length)console.log('::warning::Maps JavaScript authentication is already failing on the frozen production baseline; no new regression from preview. Correct project API activation separately, without altering frozen Cab code.');
  else console.log('PASS: Maps JS browser authorization matches production and no Google API authorization codes detected.');
 }finally{await browser.close()}
})().catch(e=>{console.error('Maps preview-to-production parity FAILED: '+hide(e.message||e));process.exitCode=1});
