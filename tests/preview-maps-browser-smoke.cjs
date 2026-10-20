'use strict';
const assert=require('node:assert/strict');
const { chromium }=require('playwright');

(async()=>{
 const base=process.env.DBEST_PREVIEW_URL;
 assert(base&&/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(base),'Use a specifically approved Vercel preview origin');
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();
  const errors=[];
  page.on('console',m=>{if(m.type()==='error'&&/google.maps|google maps|maps javascript api|referer|api key/i.test(m.text()))errors.push(m.text().replace(/AIza[0-9A-Za-z_-]+/g,'[REDACTED]'));});
  page.on('pageerror',e=>{if(/maps|google/i.test(e.message))errors.push(e.message.replace(/AIza[0-9A-Za-z_-]+/g,'[REDACTED]'));});
  const navigation=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(navigation.status(),200,'Preview must load directly without private Vercel bypass credentials');
  const r=await page.request.get(base+'/api/runtime-config',{timeout:20000});
  assert.equal(r.status(),200,'Preview runtime config must load');
  const js=await r.text();
  const match=js.match(/"googleMapsApiKey":"(AIza[0-9A-Za-z_-]+)"/);
  assert(match,'Scoped preview must have browser key; do not log it');
  const result=await page.evaluate(async key=>{
    return await new Promise(resolve=>{
      let done=false;
      const finish=(status)=>{if(!done){done=true;resolve(status)}};
      window.__dbestMapsProbeReady=async()=>{
       try{
        const maps=window.google?.maps;
        if(!maps?.Map)return finish('Google Maps Map constructor unavailable');
        const div=document.createElement('div');div.style.width='300px';div.style.height='200px';document.body.appendChild(div);
        const map=new maps.Map(div,{center:{lat:22.675,lng:85.63},zoom:12,mapTypeControl:false});
        await new Promise(r=>setTimeout(r,3000));
        finish(!!map?'ok':'Maps Map instance unavailable');
       }catch(e){finish('Map failed: '+String(e?.message||e))}
      };
      const script=document.createElement('script');
      script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&callback=__dbestMapsProbeReady';
      script.async=true;script.onerror=()=>finish('Maps script load failed');
      document.head.appendChild(script);
      setTimeout(()=>finish('Maps initialization timed out'),20000);
    });
  },match[1]);
  assert.equal(result,'ok',result);
  assert(!errors.some(x=>/referernotallowed|invalidkey|apinotactivated|maps javascript api error|billingnotenabled|api key not valid/i.test(x)),
    'Google Maps browser authorization error: '+errors.join(' | ').slice(0,350));
  console.log('PASS: Google Maps rendered on scoped Vercel preview origin without browser authentication errors.');
 }finally {await browser.close()}
})().catch(e=>{console.error('Preview Maps browser smoke failed: '+String(e.message||e).replace(/AIza[0-9A-Za-z_-]+/g,'[REDACTED]'));process.exitCode=1});
