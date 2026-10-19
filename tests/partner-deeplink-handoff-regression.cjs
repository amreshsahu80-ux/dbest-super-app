'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

const original=fs.readFileSync('owner-deeplink-all-sections.js','utf8');
const APPROVED={
 insurance:{url:'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C',partner:'InsuranceDekho',enabled:true,buttonLabel:'Check Premium Now'},
 flights:{url:'https://dbestfly.com',partner:'DBest Fly',enabled:true,buttonLabel:'Flights |Hotels| Packages'},
 mf:{url:'https://p.njw.bz/13879',partner:'NJ Wealth',enabled:true,buttonLabel:'Invest Now'}
};
const services=[
 ['insurance','All Insurance','🛡️','','',['Health Insurance','Motor Insurance','Life / Term Insurance','Travel Insurance']],
 ['flights','Flights Hotels Packages','✈️','','',['Flight Booking','Flight + Hotel','Visa Assistance']],
 ['travel','Hotels n Packages','🏨','','',['Hotel Booking','Tour Package','Custom Itinerary']],
 ['mf','Mutual Funds','📈','','',['Mutual Fund Investment','Portfolio Assistance']]
];

function browser({member=true,central=APPROVED,localLinks={}}={}){
 const results={redirects:[],transactions:[],toasts:[],login:0,forms:0,save:0,refreshes:0};
 const sess=member?{id:'QA_MEMBER_ONLY',role:'prime'}:{id:'',role:'visitor'};
 const location={href:'https://dbest4u.com/',assign:(url)=>results.redirects.push(url)};
 const window={session:sess,location,openService:()=>null,openContentForm:function(){results.forms++},ownerOperations:()=>null,projectTests:()=>[]};
 if(central!==null)window.DBEST_PUBLIC_LINKS=structuredClone(central);
 const context={
  window,location,services,session:sess,links:structuredClone(localLinks),URL,console,
  setTimeout:()=>1,clearTimeout:()=>{},document:{querySelectorAll:()=>[]},
  localStorage:{getItem:(key)=>key==='d2_session'?JSON.stringify(sess):null},
  loginChoice:()=>{results.login++},toast:(m)=>results.toasts.push(String(m)),
  addTx:function(userId,section,sub,amount,status,partner,meta){
    const row={id:'TXQA'+String(results.transactions.length+1).padStart(6,'0'),userId,section,sub,amount,status,partner,meta};
    results.transactions.push(row);return row
  },
  save:()=>{results.save++}
 };
 vm.runInNewContext(original,context,{filename:'owner-deeplink-all-sections.js',timeout:1200});
 return {window,location,context,results}
}
async function navigate(browser,id,i){
 const before=browser.results.redirects.length;
 await browser.window.dbestUniversalExternalGo(id,i);
 return {url:browser.results.redirects[before],tx:browser.results.transactions.at(-1)}
}

test('All four Insurance types preserve exact InsuranceDekho affiliate parameters',async()=>{
 const b=browser();
 for(let i=0;i<4;i++){
  const result=await navigate(b,'insurance',i);
  assert.equal(result.url,APPROVED.insurance.url);
  assert.equal(result.tx.sub,services[0][5][i]);
  assert.equal(result.tx.section,'All Insurance');
  assert.equal(result.tx.status,'Redirected / Pending');
  assert.equal(result.tx.meta.source,'Partner Deeplink');
  assert(!result.url.includes('dbest_tx_id'));
  assert(!result.url.includes('dbest_user_id'));
 }
 assert.equal(b.results.transactions.length,4);
});

test('Flights, Flights + Hotel and Visa always preserve exact DBest Fly URL',async()=>{
 const b=browser();
 for(let i=0;i<3;i++){
  const result=await navigate(b,'flights',i);
  assert.equal(result.url,'https://dbestfly.com/');
  assert.equal(result.tx.sub,services[1][5][i]);
 }
});

test('Separate Hotel/Packages tile uses Owner-approved Flights/Hotels partner and never local service-payment form',async()=>{
 const b=browser();
 assert.equal(b.window.DBEST_UNIVERSAL_DEEPLINKS.linkFor('travel').url,APPROVED.flights.url);
 for(let i=0;i<3;i++){
  await b.window.openContentForm('travel',i);
  assert.equal(b.results.redirects.at(-1),'https://dbestfly.com/');
  assert.equal(b.results.transactions.at(-1).sub,services[2][5][i]);
 }
 assert.equal(b.results.forms,0,'Legacy service application must not hijack DBest Fly hotel bookings');
});

test('Mutual Fund handoff keeps NJ Wealth exact personal partner URL',async()=>{
 const b=browser();
 for(let i=0;i<2;i++){
  const result=await navigate(b,'mf',i);
  assert.equal(result.url,APPROVED.mf.url);
  assert.equal(result.tx.sub,services[3][5][i]);
 }
 assert(!b.results.redirects.some(x=>x.includes('?dbest_')));
});

test('Public central settings override stale on-device partner links',async()=>{
 const b=browser({localLinks:{insurance:{url:'https://stale.invalid/insurance',enabled:true},flights:{url:'https://stale.invalid/flight',enabled:true},travel:{url:'https://stale.invalid/hotel',enabled:true},mf:{url:'https://stale.invalid/mf',enabled:true}}});
 for(const id of ['insurance','flights','travel','mf']){
  const result=await navigate(b,id,0);
  assert.equal(result.url,id==='insurance'?APPROVED.insurance.url:id==='mf'?APPROVED.mf.url:'https://dbestfly.com/');
 }
});

test('Explicit Owner Hotel destination takes precedence over inherited flight destination',async()=>{
 const c=structuredClone(APPROVED);c.travel={url:'https://dbestfly.com/hotels',enabled:true,partner:'DBest Fly'};
 const b=browser({central:c});
 assert.equal((await navigate(b,'travel',0)).url,'https://dbestfly.com/hotels');
 assert.equal((await navigate(b,'flights',0)).url,'https://dbestfly.com/');
});

test('Guests cannot create pending partner transactions or leave DBest',async()=>{
 const b=browser({member:false});
 await navigate(b,'insurance',0);
 assert.equal(b.results.transactions.length,0);
 assert.equal(b.results.redirects.length,0);
 assert.equal(b.results.login,1);
});

test('Disabled partner cannot hand off or create a pending transaction',async()=>{
 const c=structuredClone(APPROVED);c.insurance.enabled=false;
 const b=browser({central:c});
 await navigate(b,'insurance',0);
 assert.equal(b.results.redirects.length,0);
 assert.equal(b.results.transactions.length,0);
 assert(b.results.toasts.some(x=>/disabled/i.test(x)));
});

test('Unsafe configured scheme is rejected before any pending transaction is recorded',async()=>{
 const c=structuredClone(APPROVED);c.mf.url='javascript:alert(1)';
 const b=browser({central:c});
 await navigate(b,'mf',0);
 assert.equal(b.results.transactions.length,0);
 assert.equal(b.results.redirects.length,0);
 assert(b.results.toasts.some(x=>/Could not open partner destination/i.test(x)));
});

test('Only Owner-declared transaction placeholders are expanded, without other query mutations',async()=>{
 const c=structuredClone(APPROVED);c.insurance.url='https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C&ref={DBEST_TX_ID}';
 const b=browser({central:c});
 const x=await navigate(b,'insurance',0);
 assert.equal(x.url,'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C&ref=TXQA000001');
});

test('Late Owner-public config is awaited before navigating, preserving configured URL',async()=>{
 const b=browser({central:null,localLinks:{}});
 b.window.DBEST_OWNER_CONTROL_LIVE={refreshPublic:async()=>{b.results.refreshes++;b.window.DBEST_PUBLIC_LINKS=structuredClone(APPROVED)}};
 const x=await navigate(b,'mf',0);
 assert.equal(x.url,APPROVED.mf.url);
 assert.equal(b.results.refreshes,1);
 assert.equal(b.results.transactions.length,1);
});

test('Late Insurance rendering cannot overwrite the newer Hotel partner card',async()=>{
 const b=browser(),scheduled=[],rendered=[];
 const hero={insertAdjacentHTML:(position,html)=>rendered.push(String(html))};
 const root={
   getBoundingClientRect:()=>({width:393,height:700}),
   querySelector:(selector)=>selector==='.sectionHero'?hero:null,
   insertAdjacentHTML:(position,html)=>rendered.push(String(html))
 };
 b.context.setTimeout=(fn,ms)=>{scheduled.push({fn,ms});return scheduled.length};
 b.context.document.querySelectorAll=selector=>selector==='.sectionContent'?[root]:[];
 b.context.getComputedStyle=()=>({display:'block',visibility:'visible'});
 b.window.openService('insurance');
 b.window.openService('travel');
 for(const pending of scheduled.sort((a,b)=>a.ms-b.ms))pending.fn();
 await Promise.resolve();
 assert(rendered.length>0,'Newest section card must render');
 assert(rendered.every(html=>html.includes('DBest Fly')&&!html.includes('InsuranceDekho')),'Old Insurance requests must not overwrite Hotel partner card');
});

test('User handoff source does not amend affiliate URL or use popup blockers',()=>{
 assert(!original.includes("u.searchParams.set('dbest_user_id'"));
 assert(!original.includes("u.searchParams.set('dbest_tx_id'"));
 assert(original.includes('window.location.assign(url)'));
 assert(original.includes("source:'Partner Deeplink'"));
 console.log('PASS: All Insurance, Flights, Hotels/Packages and NJ Wealth secure handoff contracts.');
});
