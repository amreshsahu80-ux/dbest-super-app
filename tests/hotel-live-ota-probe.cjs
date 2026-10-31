'use strict';
/* One property, one future stay, read-only live Google Hotels B2C diagnostic.
   No login, bypass, bulk crawling or fake prices. */
(async()=>{
 const google=require('./google-hotels-browser.cjs');
 const hotel={id:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',city:'Guwahati'};
 const stay={checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1};
 const begin=Date.now();
 try{
  const r=await google.getPublicGoogleRates(hotel,stay);
  console.log('DBEST_GOOGLE_LIVE_DIAGNOSTIC',JSON.stringify({
   status:r.status,elapsedSec:Math.round((Date.now()-begin)/1000),
   verifiedStay:r.stay||null,providerCount:r.providers?.length||0,
   providers:(r.providers||[]).map(p=>({provider:p.provider,pricePerNight:p.pricePerNight,currency:p.currency}))
  }));

  if(r.status==='NO_VERIFIED_PUBLIC_GOOGLE_B2C_OFFERS'){
   const puppeteer=(await import('puppeteer-core')).default;
   const chromium=(await import('@sparticuz/chromium')).default;
   let browser;
   try {
    browser=await puppeteer.launch({
      executablePath:await chromium.executablePath(),
      args:[...chromium.args,'--disable-http2','--disable-dev-shm-usage'],headless:true
    });
    const page=await browser.newPage();
    await page.setViewport({width:1360,height:850});
    const url=google.overviewUrl(google.SOURCES[hotel.id].entity,stay);
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:23000});
    const before=await page.evaluate(()=>document.body?.innerText||'');
    const target=new URL(page.url());
    target.pathname=target.pathname.endsWith('/')?target.pathname.slice(0,-1)+'/prices':target.pathname+'/prices';
    await page.goto(target.href,{waitUntil:'domcontentloaded',timeout:23000});
    await new Promise(resolve=>setTimeout(resolve,1800));
    const after=await page.evaluate(()=>document.body?.innerText||'');
    
    const currencyOpened=await page.evaluate(()=>{
      const b=[...document.querySelectorAll('button,[role="button"]')]
        .find(x=>/Currency\s*USD/i.test(String(x.innerText||'').replace(/\u200b/g,'')));
      if(b){b.click();return true}return false;
    });
    if(currencyOpened){
      await new Promise(resolve=>setTimeout(resolve,900));
      const menu=await page.evaluate(()=>{
       const t=document.body?.innerText||'';
       const index=t.indexOf('Currency\n');
       const optionLabels=[...document.querySelectorAll('[role="option"],[role="menuitem"],button,[role="button"]')]
         .map(x=>String(x.innerText||'').trim()).filter(x=>/INR|Indian Rupee|Currency|USD|US Dollar|Rupee/i.test(x)).slice(0,20);
       return {index,currencySection:index>=0?t.slice(index,index+650):'',optionLabels};
      });
      console.log('DBEST_CURRENCY_MENU',JSON.stringify(menu));
    }

    const index=after.indexOf('All options');
    const shortlist=after.split('\n').filter(x=>/MakeMyTrip|Goibibo|Booking\.com|Yatra\.com|Cleartrip|₹|Visit site|All options|View more options/i.test(x));
    console.log('DBEST_PUBLIC_PAGE_STRUCTURE',JSON.stringify({
      path:new URL(page.url()).pathname,
      requestedCurrency:new URL(page.url()).searchParams.get('curr'),
      visibleCurrencyControls:await page.evaluate(()=>
       [...document.querySelectorAll('button,[role="button"],[role="combobox"]')]
        .map(e=>({label:String(e.getAttribute('aria-label')||'').slice(0,90),
                   text:String(e.innerText||'').trim().slice(0,90)}))
        .filter(x=>/USD|INR|currency|dollar|rupee|₹|\$/i.test(x.label+' '+x.text))
        .slice(0,15)),
      footerSnippet:after.slice(-650),
      beforeLength:before.length,afterLength:after.length,
      hasAllOptions:index>=0,
      offerSection:index>=0?after.slice(index,index+1500):'',
      selectedLines:shortlist.slice(0,32).map(x=>x.slice(0,120))
    }));
   }catch(e){
    console.log('DBEST_PUBLIC_PAGE_STRUCTURE',JSON.stringify({
      status:'INSPECTION_FAILED',message:String(e?.message||'').slice(0,120)
    }));
   }finally{if(browser)await browser.close()}
  }
 }catch(e){
  console.log('DBEST_GOOGLE_LIVE_DIAGNOSTIC',JSON.stringify({
   status:'READER_EXCEPTION',elapsedSec:Math.round((Date.now()-begin)/1000),
   errorName:e?.name||'Error',errorMessage:String(e?.message||'').slice(0,180)
  }));
  process.exitCode=1;
 }
})();
