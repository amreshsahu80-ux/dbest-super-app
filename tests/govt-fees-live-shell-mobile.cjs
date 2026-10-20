'use strict';
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base='https://dbest4u.com';
const fees=[['PAN Application',140],['Driving Licence',150],['ITR Filing',150],['Certificates',30],['Passport Application',150],['GST Return',150]];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2});
  await ctx.route(base+'/',async route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
  for(const file of ['govt-assistance-fees-v1.js','service-variable-pricing-v1.js']){
   await ctx.route('**/'+file+'*',async route=>route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(file,'utf8')}));
  }
  // No live Supabase or Vercel writes: block ALL backend endpoints. All form testing is pre-submit.
  await ctx.route('**/functions/v1/**',async route=>route.fulfill({status:403,contentType:'application/json',body:'{"error":"qa_backend_blocked"}'}));
  await ctx.route('**/api/**',async route=>route.fulfill({status:403,body:'QA backend blocked'}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('UI page error:',e.message.slice(0,140)));
  const res=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(res.status(),200);
  await page.waitForFunction(()=>typeof window.openService==='function'&&typeof window.serviceSchema==='function',{timeout:40000});
  await page.waitForFunction(()=>window.DBEST_GOVT_SERVICE_FEES?.version==='20261020-govt-assistance-fee-rules-v1',{timeout:14000});
  await page.evaluate(()=>window.openService('govt'));
  const buttons=await page.locator('.sectionContent .sub').allTextContents();
  assert.equal(buttons.length,6,'Six genuine Government service subtiles required');
  for(const [idx,pair] of fees.entries()){
   const [title,expected]=pair;
   assert(buttons[idx].includes(title),'button '+idx+' should mention '+title);
   await page.evaluate(i=>window.openContentForm('govt',i),idx);
   const actual=await page.locator('.serviceFormPage .feeStrip b').first().innerText();
   assert.equal(actual,'₹'+expected,'visible '+title+' fee must be correct');
   const form=await page.locator('.serviceFormPage form.serviceFormCard').count();
   assert.equal(form,1,title+' application form exists');
   const note=await page.locator('.serviceFormPage .feeStrip').innerText();
   assert.match(note,/statutory\/portal fees/i);
   console.log('PASS Mobile visible form '+title+' ₹'+expected);
  }
  // The later lazy-loaded Quote module must never revert GOVT to zero.
  await page.evaluate(async()=>window.DBEST_PERFORMANCE_BOOTSTRAP?.startGroup('service'));
  await page.evaluate(()=>window.openContentForm('govt',0));
  assert.equal(await page.locator('.serviceFormPage .feeStrip b').first().innerText(),'₹140');
  assert.equal(await page.evaluate(()=>window.serviceSchema('govt',3).fee),30);
  console.log('PASS Lazily loaded variable-pricing module preserves fixed Government fees');
  console.log('PASS No government submissions, payment gateway calls, or live writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
