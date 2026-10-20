'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  const page=await ctx.newPage();
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="m"><div class="sectionContent"><div class="sectionHero"><b>Home Jobs & Local Services</b></div><div class="subs"><button class="sub">Electrician</button></div></div></main></body></html>');
  await page.evaluate(()=>{
   window.DBEST_RUNTIME_CONFIG={supabaseUrl:'https://dbest-api.invalid',supabasePublishableKey:'TEST-ANON'};
   window.DBEST_MEMBER_LIVE={getToken:()=> 'SYNTH-TEST-MEMBER'};
   window.sectionScreen=html=>{document.querySelector('#m').innerHTML=html};
   window.sectionTopBar=(title)=>'<header>'+title+'</header>';
   window.openService=()=>{};
   window.__historyReads=[];
   window.fetch=async(url,opts)=>{
    window.__historyReads.push({url,memberToken:opts?.headers?.['x-dbest-member-token']});
    if(!String(url).includes('homejobs-customer-history-live'))throw Error('Unexpected network request');
    return {ok:true,json:async()=>({ok:true,history:[
     {transactionId:'TX-SUMMARY',service:'Electrician',status:'Completed',createdAt:'2026-09-19T08:00:00Z',completedAt:'2026-09-19T09:00:00Z',assigned:true,payment:{verified:false,status:'No Confirmed Charge',amount:0},documentType:'service_summary'},
     {transactionId:'TX-RECEIPT',service:'Plumber',status:'Completed',createdAt:'2026-09-19T07:00:00Z',completedAt:'2026-09-19T08:00:00Z',assigned:true,payment:{verified:true,status:'Payment Verified',amount:299,mode:'PayU',reference:'QA-REF'},documentType:'payment_receipt'},
     {transactionId:'TX-PENDING',service:'AC Mechanic',status:'Open',createdAt:'2026-09-20T07:00:00Z',assigned:false,payment:{verified:false,status:'No Confirmed Charge',amount:0},documentType:null}
    ]})};
   };
  });
  await page.addScriptTag({content:fs.readFileSync('homejobs-customer-history-v1.js','utf8')});
  await page.waitForSelector('#dbestHomeJobsCustomerDashboardTile',{timeout:7000});
  assert.equal(await page.locator('#dbestHomeJobsCustomerDashboardTile').count(),1);
  assert.equal(await page.locator('.subs button').count(),2,'Original button remains alongside new dashboard button');
  await page.locator('#dbestHomeJobsCustomerDashboardTile').click();
  await page.waitForSelector('#dbestHomeJobsCustomerRows .dbestHomeJobRow',{timeout:7000});
  assert.equal(await page.locator('.dbestHomeJobRow').count(),3);
  assert.equal(await page.locator('[data-homejob-document]').count(),2);
  assert.equal(await page.locator('[data-homejob-document="TX-PENDING"]').count(),0);
  assert.equal(await page.locator('[data-homejob-document="TX-SUMMARY"]').count(),1);
  assert.equal(await page.locator('[data-homejob-document="TX-RECEIPT"]').count(),1);
  const request=await page.evaluate(()=>window.__historyReads[0]);
  assert.equal(request.memberToken,'SYNTH-TEST-MEMBER');
  const receipt=page.waitForEvent('popup');
  await page.locator('[data-homejob-document="TX-RECEIPT"]').click();
  const popup=await receipt;
  await popup.waitForLoadState('domcontentloaded');
  const print=await popup.locator('body').innerText();
  assert.match(print,/DBest Payment Receipt/);assert.match(print,/299\.00/);
  await popup.close();
  await page.locator('[data-homejob-filter="active"]').click();
  assert.equal(await page.locator('.dbestHomeJobRow').count(),1);
  await page.evaluate(()=>{window.DBEST_MEMBER_LIVE.getToken=()=>'';window.DBEST_HOMEJOBS_CUSTOMER_HISTORY.open()});
  await page.waitForFunction(()=>document.body.innerText.includes('Please sign in to your DBest member account'));
  console.log('PASS mobile dashboard tile, authenticated history, receipts, service summary, filters, logout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
