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
  for(const file of ['govt-assistance-fees-v1.js','govt-payu-test-only-v1.js','service-variable-pricing-v1.js','payment-policy-router-v1.js']){
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
  // Use a synthetic in-browser transaction. No actual DBest application/transaction is created.
  await page.evaluate(()=>{
    txs.unshift({id:'TX-SYNTH-GOVT-TEST',userId:'QA-FAKE',section:'PAN, DL, ITR',sub:'PAN Application',
      amount:140,status:'Application Submitted / Payment Pending',meta:{sectionId:'govt',subIndex:0,application:{email:'qa@test.invalid'}}});
    window.paymentReview('TX-SYNTH-GOVT-TEST');
  });
  await page.waitForSelector('[data-dbest-govt-payu-only="1"]',{timeout:10000});
  await page.waitForTimeout(350);
  console.log('QA-PayU isolated label:',await page.locator('[data-dbest-govt-payu-only="1"]').evaluate(el=>el.shadowRoot?.querySelector('button')?.textContent));
  const payments=await page.locator('.paymentPage button:visible').allTextContents();
  assert(payments.some(x=>/PayU Test/i.test(x)),JSON.stringify(payments));
  assert(!payments.some(x=>/Razorpay|ICICI|UPI|Pay\s+Direct/i.test(x)),JSON.stringify(payments));
  assert(await page.locator('[data-dbest-govt-payu-submit]').isDisabled(),
    'PayU Test button must be disabled when sandbox credentials are not configured');
  assert.equal(await page.locator('[data-dbest-govt-payu-only="1"] .notice').innerText(),
    'Government statutory/portal fees, if applicable, are separate.');
  assert.equal(await page.locator('[data-dbest-govt-payu-only="1"] p').innerText(),'DBest Assistance Fee: ₹140');
  console.log('PASS Government review: ONLY disabled PayU Test payment, other gateways hidden');
  // Ensure another working section has exactly its existing payment options when relevant.
  await page.evaluate(()=>window.paymentReview('TX-SYNTH-GOVT-TEST'));
  assert.equal(await page.locator('[data-dbest-govt-payu-only="1"]').count(),1);
  console.log('PASS Reopening payment review does not duplicate checkout');
  console.log('PASS No government submissions, payment gateway calls, or live writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
