'use strict';
const {chromium}=require('playwright-core');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base='https://dbest4u.com';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true});
  const own={services:[
   {id:'QA-HOME-DONE',service:'Electrician',status:'Completed',jobStatus:'Completed',requestedAt:'2026-09-19',completedAt:'2026-09-20',charge:400,receiptEligible:false,city:'QA City',preferredSlot:'11 AM'},
   {id:'QA-HOME-WAIT',service:'AC Mechanic',status:'Open',jobStatus:null,requestedAt:'2026-10-19',charge:0,receiptEligible:false,city:'QA City'},
   {id:'QA-HOME-PAID',service:'Plumber',status:'Completed',jobStatus:'Completed',requestedAt:'2026-10-18',charge:350,receiptEligible:true,paymentMethod:'Razorpay',city:'QA City'}
  ],ok:true};
  await ctx.route(base+'/',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync('index.html','utf8')}));
  await ctx.route('**/homejobs-customer-dashboard-v1.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync('homejobs-customer-dashboard-v1.js','utf8')}));
  await ctx.route('**/functions/v1/**',route=>{
   if(route.request().url().includes('/homejobs-customer-history-live'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(own)});
   return route.fulfill({status:403,contentType:'application/json',body:'{"error":"qa_network_blocked"}'});
  });
  await ctx.route('**/api/**',route=>route.fulfill({status:403,contentType:'application/json',body:'{"error":"qa_blocked"}'}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGE-WARN: '+e.message.slice(0,120)));
  const res=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});assert.equal(res.status(),200);
  await page.waitForFunction(()=>typeof window.openService==='function'&&window.DBEST_HOMEJOBS_CUSTOMER?.version==='20261020-homejobs-customer-history-v1',{timeout:35000});
  await page.evaluate(()=>window.openService('jobs'));
  await page.waitForSelector('#dbestHomeJobsMyHistory',{timeout:13000});
  console.log('PASS Home Jobs tile shows customer Service History & Documents');
  await page.evaluate(()=>{
   window.requireMember=()=>true;
   window.DBEST_MEMBER_LIVE={...(window.DBEST_MEMBER_LIVE||{}),getToken:()=> 'QA-MOBILE-TEST-TOKEN'};
  });
  await page.click('#dbestHomeJobsMyHistory');
  await page.waitForSelector('.homeJobsHistoryPage .ownerPanelCard',{timeout:14000});
  const cards=await page.locator('.homeJobsHistoryPage .ownerPanelCard').count();
  assert.equal(cards,3,'All three customer history cards should display');
  const receipts=await page.getByRole('button',{name:/Download Payment Receipt/}).count();
  assert.equal(receipts,1,'Only the truly paid record should offer a payment receipt');
  assert.equal(await page.getByRole('button',{name:/View \/ Save Service Summary/}).count(),3);
  const text=await page.locator('.homeJobsHistoryPage').innerText();
  assert(text.includes('QA-HOME-WAIT'));assert(text.includes('QA-HOME-DONE'));
  assert.match(text,/Payment receipts appear only after a verified DBest collection/i);
  console.log('PASS Mobile Home Jobs service history displays 3 records, only verified paid receipt');
  await page.locator('[data-homejob-filter="active"]').click();
  assert.equal(await page.locator('.homeJobsHistoryPage .ownerPanelCard').count(),1);
  await page.locator('[data-homejob-filter="completed"]').click();
  assert.equal(await page.locator('.homeJobsHistoryPage .ownerPanelCard').count(),2);
  console.log('PASS Active/Completed status filters do not change frozen modules or send backend writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
