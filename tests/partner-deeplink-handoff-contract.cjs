'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const handoff=fs.readFileSync('owner-deeplink-all-sections.js','utf8');
const subtype=fs.readFileSync('external-service-subtype-preserver-v1.js','utf8');
const expected={
  insurance:'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C',
  flights:'https://dbestfly.com',
  travel:'https://dbestfly.com',
  mf:'https://p.njw.bz/13879'
};
const desc={
  insurance:['insurance','All Insurance',['Health Insurance','Motor Insurance','Life / Term Insurance','Travel Insurance']],
  flights:['flights','Flights Hotels Packages',['Flight Booking','Flight + Hotel','Visa Assistance']],
  travel:['travel','Hotels n Packages',['Hotel Booking','Tour Package','Custom Itinerary']],
  mf:['mf','Mutual Funds',['Mutual Fund Investment','Portfolio Assistance']]
};
const sleep=(t=12)=>new Promise(resolve=>setTimeout(resolve,t));
async function waitUntil(predicate,timeoutMs=450){
 const deadline=Date.now()+timeoutMs;
 while(!predicate()&&Date.now()<deadline)await sleep(10);
 assert(predicate(),'Expected handoff event did not occur within '+timeoutMs+'ms');
}

function env({central=true,session=true,token=true,ledgerDelay=0,ledgerFail=false,cachedLinks=null,refresh=null}={}){
  let txs=[],launches=[],messages=[],writes=[],forms=0,saves=0,login=0,baseService=0,refreshes=0;
  let runtimeLinks=cachedLinks||{};
  let cfgLinks=central?Object.fromEntries(Object.entries(expected).map(([id,url])=>[id,{url,enabled:true,partner:id==='insurance'?'InsuranceDekho':id==='mf'?'NJ Wealth':'DBest Fly',buttonLabel:'Continue'}])):null;
  const win={
    session:session?{id:'PR-QA-01',role:'prime'}:{id:'',role:'visitor'},
    location:null,
    DBEST_PUBLIC_LINKS:cfgLinks,
    DBEST_MEMBER_LIVE:token?{getToken:()=> 'QA_SECURE_TOKEN'}:null,
    DBEST_TRANSACTION_LEDGER:{record:x=>{writes.push({id:x.id,section:x.section,sub:x.sub,status:x.status});
      return new Promise((resolve,reject)=>setTimeout(()=>ledgerFail?reject(new Error('mock network outage')):resolve({ok:true}),ledgerDelay))}},
    openService:()=>{baseService++},
    openContentForm:()=>{forms++},
    DBEST_OWNER_CONTROL_LIVE:{refreshPublic:()=>{
      refreshes++;
      if(refresh)return refresh(win);
      win.DBEST_PUBLIC_LINKS=Object.fromEntries(Object.entries(expected).map(([id,url])=>[id,{url,enabled:true,partner:'Test Partner'}]));
      return Promise.resolve({ok:true});
    }}
  };
  const location={href:'https://dbest4u.com/',pathname:'/',search:'',assign:url=>{launches.push(url)}};
  win.location=location;
  const store=new Map([['d2_session',JSON.stringify(win.session)]]);
  const localStorage={getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,v),removeItem:key=>store.delete(key)};
  const ctx={
    window:win,URL,Date,Math,JSON,Promise,Error,Number,String,Array,Object,Set,Map,
    services:Object.values(desc).map(([id,title,subs])=>[id,title,'🔗','#fff','Partner handoff',subs]),
    links:runtimeLinks,session:win.session,txs,localStorage,location,setTimeout,clearTimeout,setInterval,clearInterval,
    document:{querySelectorAll:()=>[],getElementById:()=>null},
    getComputedStyle:()=>({display:'block',visibility:'visible'}),
    console:{warn:()=>{},error:()=>{},log:()=>{}},
    toast:msg=>messages.push(msg),
    loginChoice:()=>{login++},
    account:()=>{login++},
    addTx:(uid,section,sub,amt,status,partner,meta)=>{
      const x={id:'TXQA'+String(txs.length+1).padStart(8,'0'),userId:uid,section,sub,amount:amt,status,partner,meta,source:meta?.source||''};
      txs.unshift(x);return x;
    },
    save:()=>{saves++}
  };
  vm.runInNewContext(handoff,ctx,{timeout:1600});
  return {
    window:win,ctx,
    launches,txs,writes,messages,
    get forms(){return forms},get login(){return login},get saves(){return saves},
    get refreshes(){return refreshes},
    loadSubtype:()=>{vm.runInNewContext(subtype,ctx,{timeout:1600});win.DBEST_EXTERNAL_SERVICE_SUBTYPE?.install?.()},
  }
}
function assertPartner(url,id,sub,txid){
 const link=new URL(url),target=new URL(expected[id]);
 assert.equal(link.origin,target.origin,id+' partner host changed');
 assert.equal(link.pathname,target.pathname,id+' partner path changed');
 for(const [k,v] of target.searchParams)assert.equal(link.searchParams.get(k),v,id+' lost '+k+' referral parameter');
 assert.equal(link.searchParams.get('dbest_section'),id);
 assert.equal(link.searchParams.get('dbest_subsection'),sub);
 assert.equal(link.searchParams.get('dbest_tx_id'),txid);
 assert.equal(link.searchParams.get('dbest_user_id'),'PR-QA-01');
}
test('Owner config preserves exact InsuranceDekho referral, DBest Fly destination and NJ Wealth partner ID',()=>{
 const x=env();
 for(const id of ['insurance','flights','travel','mf'])assert.equal(x.window.DBEST_UNIVERSAL_DEEPLINKS.linkFor(id).url,expected[id]);
 assert.equal(new URL(expected.insurance).searchParams.get('sub-source'),'BESTSERVICES_B2C');
 assert.equal(new URL(expected.mf).pathname,'/13879');
});
test('Health, Motor, Life and Travel insurance use InsuranceDekho, never internal application form',async()=>{
 for(let i=0;i<4;i++){
  const x=env();x.window.openContentForm('insurance',i);await sleep();
  assert.equal(x.forms,0);assert.equal(x.launches.length,1);assert.equal(x.txs.length,1);
  assertPartner(x.launches[0],'insurance',desc.insurance[2][i],x.txs[0].id);
  assert.equal(x.txs[0].status,'Redirected / Pending');
  assert.equal(x.writes.length,1);
 }
});
test('Flight, Flight + Hotel and Visa Assistance use the configured Flights partner',async()=>{
 for(let i=0;i<3;i++){
  const x=env();x.window.openContentForm('flights',i);await sleep();
  assert.equal(x.forms,0);assert.equal(x.launches.length,1);
  assertPartner(x.launches[0],'flights',desc.flights[2][i],x.txs[0].id)
 }
});
test('Hotels n Packages routes Hotel Booking, Tour Package, Custom Itinerary to DBest Fly instead of payments',async()=>{
 for(let i=0;i<3;i++){
  const x=env();x.window.openContentForm('travel',i);await sleep();
  assert.equal(x.forms,0);assert.equal(x.launches.length,1);
  assertPartner(x.launches[0],'travel',desc.travel[2][i],x.txs[0].id)
 }
});
test('Mutual Fund investment and portfolio handoffs retain NJ Wealth partner code 13879',async()=>{
 for(let i=0;i<2;i++){
  const x=env();x.window.openContentForm('mf',i);await waitUntil(()=>x.launches.length===1);
  assert.equal(x.forms,0);assert.equal(x.launches.length,1);
  assertPartner(x.launches[0],'mf',desc.mf[2][i],x.txs[0].id)
 }
});
test('Anonymous visitor cannot create a partner transaction or navigate externally',async()=>{
 const x=env({session:false});
 x.window.openContentForm('travel',0);await sleep();
 assert.equal(x.login,1);assert.equal(x.txs.length,0);assert.equal(x.launches.length,0);assert.equal(x.forms,0);
});
test('Signed-in partner handoff records a pending transaction before redirect',async()=>{
 const x=env({ledgerDelay:80});
 x.window.openContentForm('insurance',0);
 await sleep(20);
 assert.equal(x.launches.length,0,'Navigation must wait briefly for authenticated ledger');
 await sleep(95);
 assert.equal(x.writes.length,1);assert.equal(x.launches.length,1);
});
test('Ledger outage does not trap user inside DBest',async()=>{
 const x=env({ledgerFail:true});
 x.window.openContentForm('mf',0);await sleep(70);
 assert.equal(x.writes.length,1);assert.equal(x.launches.length,1);
 assert.equal(x.txs[0].status,'Redirected / Pending');
});
test('Disabled Owner link never falls back to stale cached link or internal payment form',async()=>{
 const x=env({cachedLinks:{insurance:{url:'https://legacy.example/',enabled:true}}});
 x.window.DBEST_PUBLIC_LINKS.insurance={...x.window.DBEST_PUBLIC_LINKS.insurance,enabled:false};
 x.window.openContentForm('insurance',0);await sleep();
 assert.equal(x.forms,0);assert.equal(x.launches.length,0);assert.equal(x.txs.length,0);
 assert(x.messages.some(m=>/disabled/i.test(m)));
});
test('Removed Owner link does not reactivate previously saved browser link',async()=>{
 const x=env({cachedLinks:{mf:{url:'https://outdated.example/',enabled:true}}});
 delete x.window.DBEST_PUBLIC_LINKS.mf;
 x.window.openContentForm('mf',0);await sleep();
 assert.equal(x.forms,0);assert.equal(x.launches.length,0);
});
test('Fresh-device click waits for Owner config, without showing internal payment form',async()=>{
 const x=env({central:false,refresh:async w=>{await sleep(34);w.DBEST_PUBLIC_LINKS={travel:{url:expected.travel,partner:'DBest Fly',enabled:true}};return {ok:true}}});
 x.window.openContentForm('travel',0);
 assert.equal(x.forms,0);assert.equal(x.launches.length,0);
 await sleep(75);
 assert.equal(x.launches.length,1);assertPartner(x.launches[0],'travel',desc.travel[2][0],x.txs[0].id);
});
test('A repeated partner tap does not create duplicate pending handoff records',async()=>{
 const x=env();x.window.openContentForm('flights',0);x.window.openContentForm('flights',0);await sleep();
 assert.equal(x.txs.length,1);assert.equal(x.writes.length,1);assert.equal(x.launches.length,1);
});
test('An invalid non-HTTPS external URL is rejected before transaction creation',async()=>{
 const x=env();x.window.DBEST_PUBLIC_LINKS.mf.url='javascript:alert(1)';
 x.window.openContentForm('mf',0);await sleep();
 assert.equal(x.txs.length,0);assert.equal(x.launches.length,0);assert.equal(x.forms,0);
});
test('Subtype-preserver does not invent Health/Flight subtype or duplicate network write on generic handoff',async()=>{
 const x=env();x.loadSubtype();
 x.window.dbestUniversalExternalGo('insurance');await sleep(70);
 assert.equal(x.txs.length,1);assert.equal(x.txs[0].sub,'External Partner Transaction');
 assert.equal(x.writes.length,1);
});
test('Generic section handoff waits for Owner mapping instead of using a stale cached partner URL',async()=>{
 const x=env({central:false,cachedLinks:{mf:{url:'https://outdated.example/',enabled:true}},refresh:async w=>{
  await sleep(45);w.DBEST_PUBLIC_LINKS={mf:{url:expected.mf,enabled:true,partner:'NJ Wealth'}};return {ok:true}
 }});
 x.window.dbestUniversalExternalGo('mf');
 assert.equal(x.launches.length,0);
 await sleep(90);
 assert.equal(x.launches.length,1);
 assertPartner(x.launches[0],'mf','External Partner Transaction',x.txs[0].id);
});
test('Generic handoff refuses old links if authoritative Owner config cannot be refreshed',async()=>{
 const x=env({central:false,cachedLinks:{insurance:{url:'https://old.example/',enabled:true}},refresh:async()=>null});
 x.window.dbestUniversalExternalGo('insurance');await sleep(75);
 assert.equal(x.txs.length,0);assert.equal(x.launches.length,0);
 assert(x.messages.some(x=>/unable to verify/i.test(x)));
});

test('Unrelated services retain their original internal application form',()=>{
 const x=env();x.window.openContentForm('other',0);assert.equal(x.forms,1);
});
