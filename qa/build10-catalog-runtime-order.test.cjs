// Runtime regression: out-of-order marketplace responses must not replace the newest snapshot.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','marketplace-live-catalog-authority.js'),'utf8');
test('latest location request wins when older fetch completes last',async()=>{
  const pending=[];
  const location={lat:22.8,lng:86.2};
  const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'test'},DBEST_TOP_LIVE_LOCATION:location,isSecureContext:false,addEventListener(){},openMarketplace(){},sectionScreen(){}};
  const document={querySelector(){return null},getElementById(){return {}}};
  const context={window,document,navigator:{},console,Date,JSON,Number,String,Promise,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},requestAnimationFrame(){},sessionStorage:{setItem(){}},localStorage:{getItem(){return null}},fetch(_url,opts){return new Promise(resolve=>pending.push({resolve,body:JSON.parse(opts.body)}))}};
  vm.runInNewContext(source,context);
  const ctl=window.DBEST_MARKETPLACE_CONTROLLER_V3;
  // boot starts the first request.
  for(let i=0;i<10&&pending.length<1;i++)await Promise.resolve();
  assert.equal(pending.length,1);
  location.lat=23.0;
  const newer=ctl.loadSnapshot(true);
  for(let i=0;i<10&&pending.length<2;i++)await Promise.resolve();
  assert.equal(pending.length,2);
  pending[1].resolve({ok:true,json:async()=>({products:[],vendors:[],marker:'new'})});
  await newer;
  assert.equal(ctl.state.snapshot.marker,'new');
  pending[0].resolve({ok:true,json:async()=>({products:[],vendors:[],marker:'old'})});
  await Promise.resolve();await Promise.resolve();
  assert.equal(ctl.state.snapshot.marker,'new');
});
