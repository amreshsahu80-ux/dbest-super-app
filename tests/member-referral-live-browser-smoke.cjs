'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const LIVE='https://dbest4u.com';
const MEMBER='DBEST-BROWSER-QA-MEMBER';
const REF='DBESTQA2088';
const failures=[];
(async()=>{
  const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
  const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:2});
    await ctx.addInitScript(({id,ref})=>{
      // This is synthetic QA only, never a real DBest account or backend token.
      try{
        localStorage.setItem('d2_session',JSON.stringify({role:'leader',id}));
        localStorage.setItem('dbest_member_live_token','synthetic-qa-no-real-auth');
        localStorage.setItem('d2_users',JSON.stringify([{
          id,name:'QA Referral Test',tier:'leader',role:'leader',ref,
          email:'synthetic@qa.invalid',status:'Active',paymentStatus:'Approved',card:true
        }]));
      }catch(_){}
    },{id:MEMBER,ref:REF});
    const page=await ctx.newPage();
    page.on('pageerror',err=>{if(/member-referral-share-v1|buildUrl|referralFrom/.test(err.message))failures.push(err.message)});
    await page.route('**/functions/v1/**',async route=>{
      const u=route.request().url();
      if(u.includes('/member-network-live')){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
          ok:true,viewerId:MEMBER,
          members:[{id:MEMBER,name:'QA Referral Test',ref:REF,tier:'leader',status:'Active',paymentStatus:'Approved'}],
          transactions:[],summary:{earnings:{today:0,month:0,year:0,all:0},direct:{},network:{}}
        })});return;
      }
      await route.fulfill({status:401,contentType:'application/json',body:'{"error":"qa_blocked_real_backend_call"}'});
    });
    await page.route('**/api/**',async route=>route.fulfill({status:403,body:'QA real API calls disabled'}));
    const root=await page.goto(LIVE+'/',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(root.status(),200,'live homepage should render');
    await page.waitForFunction(()=>typeof window.memberDash==='function',{timeout:40000});
    await page.evaluate(id=>{window.memberDash(id)},MEMBER);
    await page.waitForTimeout(2500);
    const diag=await page.evaluate(()=>({
      title:document.title,route:location.pathname,
      memberDash:typeof window.memberDash,
      shareLoaded:!!window.DBEST_MEMBER_REFERRAL_SHARE,
      version:window.DBEST_MEMBER_REFERRAL_SHARE?.version,
      session:window.DBEST_SESSION_COMPAT?.read?.()||window.session||null,
      sectionCount:document.querySelectorAll('.sectionContent.classicDash').length,
      hasMemberMiniHead:!!document.querySelector('.sectionContent.classicDash .memberMiniHead'),
      dashboardText:(document.querySelector('.sectionContent.classicDash')?.innerText||'').slice(0,650),
      refButton:!!document.getElementById('dbestCreateReferralLink'),
      sessionTokenPresent:!!(localStorage.getItem('dbest_member_live_token')),
      injectedUserCount:JSON.parse(localStorage.getItem('d2_users')||'[]').length
    }));
    console.log('QA DIAGNOSTICS:',JSON.stringify(diag));
    await page.waitForSelector('#dbestCreateReferralLink',{timeout:12000});
    assert.equal(await page.locator('#dbestCreateReferralLink').count(),1);
    await page.locator('#dbestCreateReferralLink').click();
    const link=await page.locator('#dbestReferralSharePanel input[readonly]').inputValue();
    assert.equal(link,LIVE+'/membership-choose.html?ref='+REF);
    const href=await page.locator('#dbestWhatsappReferralLink').getAttribute('href');
    assert(href.startsWith('https://wa.me/?text='));
    assert(href.includes(encodeURIComponent(REF)),'WhatsApp includes actual synthetic referral ID');
    await page.locator('#dbestCopyReferralLink').click();
    console.log('PASS: Live dashboard referral button, synthetic approved member, link and WhatsApp');
    await page.goto(link,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(new URL(page.url()).searchParams.get('ref'),REF);
    await page.waitForFunction(()=>typeof window.go==='function',{timeout:12000});
    await page.evaluate(()=>window.go('prime'));
    await page.waitForURL(/\/join-v2\.html\?/,{timeout:18000});
    let paid=new URL(page.url());
    assert.equal(paid.searchParams.get('ref'),REF);
    assert.equal(paid.searchParams.get('tier'),'prime');
    console.log('PASS: Live joining chooser → paid Prime carries referral ID');
    await page.goto(link,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>typeof window.goStarter==='function',{timeout:12000});
    await page.evaluate(()=>window.goStarter());
    await page.waitForURL(/\/starter-join\.html\?/,{timeout:18000});
    assert.equal(new URL(page.url()).searchParams.get('ref'),REF);
    console.log('PASS: Live joining chooser → free Starter carries eligible sponsor ID');
    assert.deepEqual(failures,[]);
    console.log('PASS: Browser smoke completed; NO real member login, paid registration or payout performed');
    await ctx.close();
  }finally{await browser.close()}
})().catch(err=>{console.error('Browser smoke FAILED:',err.stack||err);process.exitCode=1});
