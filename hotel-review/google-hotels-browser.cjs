'use strict';
/**
 * Google Hotels PUBLIC B2C offer reader for isolated DBest hotel pilot.
 *
 * No OTA wholesale platform, API-key charge, login, CAPTCHA bypass,
 * spoofed identity, infinite scans or bulk crawling.
 * Only mapped property and one 2-adult, 1-room request supported.
 * Explicitly verify the Google Hotels page visibly selected EXACT stay
 * before reading the public 'All options' section.
 *
 * Licensing/redisplay approval remains a release prerequisite. Results
 * are a retail reference, not confirmed room inventory or DBest savings.
 */
const SOURCES=Object.freeze({
 'HOTEL-NANDAN-GHY':Object.freeze({
  hotel:'Hotel Nandan',city:'Guwahati',
  entity:'ChkImq6GmM_XyKKZARoML2cvMXE2YjZ6cnBwEAE'
 }),
 'HIST-016':Object.freeze({hotel:'Vivanta Guwahati',city:'Guwahati',entity:'CgsIr-bv8efM1eyfARAB'}),
 'DBEST-REPL-20261026-697':Object.freeze({hotel:'Ginger Agartala',city:'Agartala',entity:'CgoI05W_ufDezpBjEAE'}),
 'DBEST-REPL-20261024-138':Object.freeze({
  hotel:'Royal Orchid Beach Resort & Spa Goa',city:'Salcete',
  query:'Royal Orchid Beach Resort & Spa Goa Salcete',
  pageName:'Royal Orchid Beach Resort & Spa',area:'Goa'
 }),
 'DBEST-REPL-20261026-691':Object.freeze({
  hotel:'Polo Hotel Agartala',city:'Agartala',
  query:'Polo Hotel Agartala',
  pageName:'Polo Hotel, Agartala',area:'Agartala'
 }),
 'DBEST-REPL-20261026-632':Object.freeze({
  hotel:'Spree Resort Sariska',city:'Alwar',
  query:'Spree Resort Sariska Alwar',
  pageName:'Spree Resort Sariska',area:'Alwar'
 })
});
const PROVIDERS=Object.freeze([
 'MakeMyTrip.com','Goibibo.com','Booking.com','Agoda',
 'Yatra.com','Cleartrip.com','Skyscanner','EaseMyTrip.com',
 'Expedia.co.in','Expedia.com','Hotels.com','Trip.com',
 'Tripadvisor.in','Bluepillow.in','Traveloka.com','Etrip.net','Traveluro'
]);
function token(date){
 const [y,m,d]=date.split('-').map(Number);
 return {y,m,d};
}
function hex(b){return Number(b).toString(16).padStart(2,'0')}
function yearBytes(y){return hex((y&127)|128)+hex(y>>7)}
function encodeStay(stay){
 const a=token(stay.checkIn),b=token(stay.checkOut);
 const nights=Math.round((Date.parse(stay.checkOut)-Date.parse(stay.checkIn))/86400000);
 if(!Number.isInteger(nights)||nights<1||nights>30||a.y<2026||b.y>2030)
  throw Error('UNSUPPORTED_STAY');
 const code='08011a200a021a00121a12140a0708'+yearBytes(a.y)+
  '10'+hex(a.m)+'18'+hex(a.d)+'120708'+yearBytes(b.y)+
  '10'+hex(b.m)+'18'+hex(b.d)+'18'+hex(nights)+'32020801';
 return Buffer.from(code,'hex').toString('base64').replace(/=+$/,'');
}
function overviewUrl(entity,stay){
 const u=new URL('https://www.google.com/travel/hotels/entity/'+entity);
 u.searchParams.set('ts',encodeStay(stay));
 u.searchParams.set('hl','en');
 u.searchParams.set('gl','in');
 u.searchParams.set('curr','INR');
 return u.href;
}
function searchUrl(query,stay){
 const u=new URL('https://www.google.com/travel/search');
 u.searchParams.set('q',query);
 u.searchParams.set('ts',encodeStay(stay));
 u.searchParams.set('hl','en');u.searchParams.set('gl','in');u.searchParams.set('curr','INR');
 return u.href;
}
function displayedStayMatches(text,stay){
 const strip=s=>String(s).replace(/[\u2000-\u200b\u202f\u00a0]/g,' ').replace(/\s+/g,' ').trim();
 const x=strip(text).slice(0,900);
 const a=new Date(stay.checkIn+'T00:00:00Z'),b=new Date(stay.checkOut+'T00:00:00Z');
 const month=d=>d.toLocaleString('en-US',{month:'short',timeZone:'UTC'});
 const lead=month(a)+' '+a.getUTCDate();
 const tail=(a.getUTCMonth()!==b.getUTCMonth()?month(b)+' ':'')+b.getUTCDate();
 return x.includes(lead+' – '+tail)||x.includes(lead+'–'+tail)
  ||x.includes(lead+' - '+tail)||x.includes(lead+' – '+tail);
}
function parsePrices(body){
 const text=String(body||'');
 const start=text.indexOf('All options\n');
 if(start<0)return [];
 let section=text.slice(start+'All options\n'.length, start+8000);
 const end=section.search(/\n(?:Sponsored·Similar hotels|View more options from|Nearby places|Hotel priority|7 top things)/);
 if(end>=0)section=section.slice(0,end);
 const lines=section.split('\n').map(x=>x.trim()).filter(Boolean);
 const out=[];
 const used=new Set();
 for(let i=0;i<lines.length&&out.length<14;i++){
  const label=lines[i];
  if(!PROVIDERS.includes(label)||used.has(label))continue;
  const rest=lines.slice(i+1,i+7);
  const boundary=rest.indexOf('Visit site');
  if(boundary<0)continue;
  const candidates=rest.slice(0,boundary).filter(s=>/^₹[\d,]{3,10}$/.test(s));
  if(candidates.length!==1)continue;
  const price=Number(candidates[0].slice(1).replace(/,/g,''));
  if(!Number.isFinite(price)||price<=0||price>1000000)continue;
  used.add(label);
  out.push({provider:label,pricePerNight:price,currency:'INR',
   room:'Room category, taxes, meals and policy to verify with the OTA',
   cancellation:'See OTA booking terms',
   source:'GOOGLE_HOTELS_PUBLIC_B2C_BROWSER'});
 }
 return out;
}
async function getPublicGoogleRates(hotel,stay,{puppeteer,chromium}={}){
 const mapped=SOURCES[hotel?.id];
 if(!mapped||hotel.hotel!==mapped.hotel||hotel.city!==mapped.city)
  return {status:'PROPERTY_NOT_MAPPED',providers:[],live:false};
 if(stay.rooms!==1||stay.adults!==2)
  return {status:'OCCUPANCY_NOT_SUPPORTED',providers:[],live:false};
 const url=mapped.query?searchUrl(mapped.query,stay):overviewUrl(mapped.entity,stay);
 const p=puppeteer||(await import('puppeteer-core')).default;
 const c=chromium||(await import('@sparticuz/chromium')).default;
 let browser;
 try{
  browser=await p.launch({
   executablePath:await c.executablePath(),
   args:[...c.args,'--disable-http2','--disable-dev-shm-usage'],
   headless:true
  });
  const page=await browser.newPage();
  await page.setViewport({width:1360,height:850});
  page.setDefaultTimeout(14000);
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:23000});
  if(!response||response.status()!==200)throw Error('SOURCE_UNAVAILABLE');
  await new Promise(resolve=>setTimeout(resolve,1100));
  const title=await page.title();
  const overview=await page.evaluate(()=>document.body?.innerText||'');
  if(!title.includes(mapped.pageName||mapped.hotel)||
     (mapped.area&&!overview.slice(0,1000).includes(mapped.area))||
     !displayedStayMatches(overview,stay))
   return {status:'PAGE_DATES_OR_PROPERTY_NOT_VERIFIED',providers:[],live:false};
  if(!/\nCheck-out\n2\n/.test(overview))
   return {status:'PAGE_GUEST_COUNT_NOT_VERIFIED',providers:[],live:false};
  let body=overview;
  if(!mapped.query){
  const clicked=await page.evaluate(()=>{
   const btn=[...document.querySelectorAll('button')]
    .find(el=>String(el.innerText||'').startsWith('View more options'));
   if(btn){btn.click();return true}
   return false;
  });
  if(clicked){
   await Promise.race([
    page.waitForFunction(()=>location.pathname.endsWith('/prices'),{timeout:9000}).catch(()=>false),
    new Promise(resolve=>setTimeout(resolve,3000))
   ]);
  }else{
   const u=new URL(page.url());u.pathname=u.pathname.replace(/\/$/,'')+'/prices';
   await page.goto(u.href,{waitUntil:'domcontentloaded',timeout:23000});
  }
  await new Promise(resolve=>setTimeout(resolve,1100));
  body=await page.evaluate(()=>document.body?.innerText||'');
  }
  if(!/\nCheck-out\n2\n/.test(body))
   return {status:'PRICE_PAGE_GUEST_COUNT_NOT_VERIFIED',providers:[],live:false};
  const providers=parsePrices(body);
  const checkedAt=new Date().toISOString();
  const sourceUrl=page.url();
  return {
   status:providers.length?'PUBLIC_GOOGLE_B2C_OFFERS_FOUND':'NO_VERIFIED_PUBLIC_GOOGLE_B2C_OFFERS',
   providers:providers.map(x=>({...x,url:sourceUrl,checkedAt})),
   live:providers.length>0,checkedAt,stay,hotelName:hotel.hotel,
   checkedStayUrl:sourceUrl,canClaimSavings:false,
   priceBasis:'Google Hotels public pre-login nightly totals in INR for verified dates and two adults; room and final terms may differ',
   note:'Visible OTA listings on Google Hotels, not guaranteed checkout totals or confirmed DBest inventory.'
  };
 }finally{
  if(browser)await browser.close();
 }
}
module.exports={SOURCES,PROVIDERS,encodeStay,overviewUrl,searchUrl,displayedStayMatches,parsePrices,getPublicGoogleRates};
