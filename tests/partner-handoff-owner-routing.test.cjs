'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('owner-deeplink-all-sections.js','utf8');
new vm.Script(source,{filename:'owner-deeplink-all-sections.js'});

const URLs=Object.freeze({
 insurance:'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C',
 travel:'https://dbestfly.com',
 flights:'https://dbestfly.com',
 mf:'https://p.njw.bz/13879'
});
const services=[
 ['insurance','All Insurance','🛡️','','',['Health Insurance','Motor Insurance','Life / Term Insurance','Travel Insurance']],
 ['flights','Flights Hotels Packages','✈️','','',['Flight Booking','Flight + Hotel','Visa Assistance']],
 ['travel','Hotels n Packages','🏨','','',['Hotel Booking','Tour Package','Custom Itinerary']],
 ['mf','Mutual Funds','📈','','',['Mutual Fund Investment','Portfolio Assistance']]
];
function harness({publicLinks=null,session={id:'QA_MEMBER',role:'prime'},ownerRefresh=null,localLinks=null}={}){
 let redirects=[],txs=[],toasts=[],baseForm=0,oldPopup=0,ownerReads=0,loginCount=0;
 const local=localLinks||{
  insurance:{url:'https://wrong-insurance.example/old',enabled:true,partner:'Wrong Insurance'},
  flights:{url:'https://wrong-flights.example',enabled:true,partner:'Wrong Flights'},
  travel:{url:'https://wrong-hotels.example',enabled:true,partner:'Wrong Hotels'},
  mf:{url:'https://wrong-nj.example',enabled:true,partner:'Wrong MF'}
 };
 const authLinks=publicLinks||Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:{insurance:'InsuranceDekho',travel:'DBest Fly',flights:'DBest Fly',mf:'NJ Wealth'}[id],buttonLabel:'Continue to Partner'}]));
 const storage=new Map([['d2_session',JSON.stringify(session)]]);
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)};
 const loc={href:'https://dbest4u.com/',origin:'https://dbest4u.com',pathname:'/',search:'',assign:url=>redirects.push(String(url))};
 let context={console,URL,Promise,Map,Set,FormData,Number,String,Object,Array,JSON,Math,
  localStorage,location:loc,session,services,links:local,
  setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},
  document:{querySelectorAll:()=>[],querySelector:()=>null,getElementById:()=>null},
  toast:m=>toasts.push(String(m)),
  loginChoice:()=>loginCount++,
  addTx:(id,section,sub,_,status,partner,meta)=>{
    let tx={id:'TX_QA_'+(txs.length+1),userId:id,section,sub,status,partner,meta};txs.push(tx);return tx
  },
  save:()=>{},
  window:{
    location:loc,session,
    openService:()=>{},
    openContentForm:()=>{baseForm++},
    externalGo:()=>{oldPopup++},
    ownerOperations:()=>{},
    projectTests:()=>[],
    DBEST_OWNER_CONTROL_LIVE:{refreshPublic:async()=>{ownerReads++;context.window.DBEST_PUBLIC_LINKS=authLinks;return {config:{links:authLinks}}}}
  }
 };
 if(ownerRefresh==='missing')delete context.window.DBEST_OWNER_CONTROL_LIVE;
 if(publicLinks!==null)context.window.DBEST_PUBLIC_LINKS=publicLinks;
 vm.createContext(context);vm.runInContext(source,context,{timeout:2800});
 return {context,redirects,txs,toasts,base:()=>baseForm,popup:()=>oldPopup,login:()=>loginCount,reads:()=>ownerReads,authLinks};
}
function assertPartnerRoute(h,section,subIndex,destination){
 const target=h.redirects.at(-1);assert(target,'Expected same-tab handoff');
 const u=new URL(target);const expected=new URL(destination);
 assert.equal(u.origin,expected.origin,'Destination origin must match approved Owner link');
 assert.equal(u.pathname,expected.pathname,'Partner referral path must not be lost');
 for(const [key,value] of expected.searchParams)assert.equal(u.searchParams.get(key),value,'Existing partner referral parameter preserved: '+key);
 assert.equal(u.searchParams.get('dbest_section'),section);
 assert.equal(u.searchParams.get('dbest_subsection'),services.find(s=>s[0]===section)[5][subIndex]);
 assert.equal(u.searchParams.get('dbest_user_id'),'QA_MEMBER');
 assert.match(u.searchParams.get('dbest_tx_id')||'',/^TX_QA_/);
 assert.equal(h.txs.at(-1)?.sub,services.find(s=>s[0]===section)[5][subIndex]);
 assert.equal(h.txs.at(-1)?.meta?.source,'Partner Deeplink');
}

test('all four Insurance types use InsuranceDekho and preserve the configured affiliate attribution',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 for(const n of [0,1,2,3]){h.context.window.openContentForm('insurance',n);assertPartnerRoute(h,'insurance',n,URLs.insurance)}
 assert.equal(h.base(),0,'No legacy DBest fee/insurance application form should appear');
 assert.equal(h.popup(),0,'Do not create an Android popup that may be blocked');
});
test('Flights and Flight + Hotel use DBest Fly with a separately tracked subsection',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 for(const n of [0,1]){h.context.window.openContentForm('flights',n);assertPartnerRoute(h,'flights',n,URLs.flights)}
 assert.equal(h.base(),0)
});
test('Hotel booking and packages use DBest Fly rather than the old internal application fee form',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 for(const n of [0,1,2]){h.context.window.openContentForm('travel',n);assertPartnerRoute(h,'travel',n,URLs.travel)}
 assert.equal(h.base(),0)
});
test('Mutual Fund investment and assistance preserve NJ Wealth referral short-link path',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 for(const n of [0,1]){h.context.window.openContentForm('mf',n);assertPartnerRoute(h,'mf',n,URLs.mf)}
 assert.equal(h.base(),0)
});
test('all generic section partner buttons use a same-tab handoff rather than a popup',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 for(const [id,url] of Object.entries(URLs)){
  h.context.window.externalGo(id);
  const u=new URL(h.redirects.at(-1));assert.equal(u.origin,new URL(url).origin);assert.equal(u.searchParams.get('dbest_section'),id)
 }
 assert.equal(h.popup(),0)
});
test('stale browser-local links cannot override the authoritative Owner destinations',()=>{
 const h=harness({publicLinks:Object.fromEntries(Object.entries(URLs).map(([id,url])=>[id,{url,enabled:true,partner:id}]))});
 h.context.window.openContentForm('insurance',0);
 const u=new URL(h.redirects.at(-1));assert.equal(u.origin,new URL(URLs.insurance).origin);assert(!u.hostname.includes('wrong'))
});
test('Owner-disabled partner link refuses handoff even when browser has a previously enabled local link',()=>{
 const cfg={insurance:{url:URLs.insurance,enabled:false},travel:{url:URLs.travel,enabled:true}};
 const h=harness({publicLinks:cfg});
 h.context.window.openContentForm('insurance',0);
 assert.equal(h.redirects.length,0);assert.equal(h.txs.length,0);assert.equal(h.base(),0);
 assert(h.toasts.some(x=>/disabled/.test(x)))
});
test('Owner-removed protected link does not fall back to stale local referral',()=>{
 const h=harness({publicLinks:{travel:{url:URLs.travel,enabled:true}}});
 h.context.window.openContentForm('insurance',1);
 assert.equal(h.redirects.length,0);assert.equal(h.txs.length,0)
});
test('unsigned visitor must log in, no partner navigation or tracked transaction',()=>{
 const h=harness({publicLinks:{insurance:{url:URLs.insurance,enabled:true}},session:{id:'',role:'visitor'}});
 h.context.window.openContentForm('insurance',0);
 assert.equal(h.login(),1);
 assert.equal(h.redirects.length,0);assert.equal(h.txs.length,0)
});
test('reject insecure and executable partner destinations without a transaction',()=>{
 for(const url of ['http://www.insurancedekho.com/','javascript:alert(1)']){
  const h=harness({publicLinks:{insurance:{url,enabled:true}}});
  h.context.window.openContentForm('insurance',0);
  assert.equal(h.redirects.length,0);assert.equal(h.txs.length,0)
 }
});
test('a first-time device waits for Owner public links, never redirects to wrong cached provider',async()=>{
 const h=harness();
 h.context.window.openContentForm('insurance',0);
 h.context.window.openContentForm('insurance',0);
 await new Promise(resolve=>setTimeout(resolve,0));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(h.reads(),1,'One public refresh per pending service');
 assert.equal(h.redirects.length,1,'Only one handoff should occur after refresh');
 assertPartnerRoute(h,'insurance',0,URLs.insurance);
});
test('a failed Owner refresh fails closed instead of using old browser-local links',async()=>{
 const h=harness({ownerRefresh:'missing'});
 h.context.window.openContentForm('insurance',0);
 await Promise.resolve();
 assert.equal(h.redirects.length,0);
 assert.equal(h.txs.length,0);
 assert(h.toasts.some(x=>/loading/.test(x)));
});
test('unrelated DBest service continues to use its existing internal application flow',()=>{
 const h=harness({publicLinks:{travel:{url:URLs.travel,enabled:true}}});
 h.context.window.openContentForm('other',0);
 assert.equal(h.base(),1);assert.equal(h.redirects.length,0);
});
