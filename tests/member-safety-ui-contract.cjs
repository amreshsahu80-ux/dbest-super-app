'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const dashboard=fs.readFileSync('member-dashboard-controller-v1.js','utf8');
const login=fs.readFileSync('member-live-login-bridge.js','utf8');

test('Member Dashboard HTML-escapes untrusted member profile labels',()=>{
  const screens=[];
  const active={id:'MEM-TEST',role:'leader'};
  const win={DBEST_RUNTIME_CONFIG:{},DBEST_SESSION_COMPAT:{read:()=>active},session:active,sectionScreen:html=>screens.push(html),memberDash:()=>true};
  const ctx={window:win,session:active,memberDash:win.memberDash,console,
    localStorage:{getItem:k=>k==='d2_users'?JSON.stringify([{id:active.id,name:'<img src=x onerror=alert(1)> & CEO',tier:'leader <svg onload=alert(1)>'}]):null},
    document:{addEventListener:()=>{},documentElement:{}},
    MutationObserver:class{observe(){}},setTimeout:()=>{},clearTimeout:()=>{},
    users:[],txs:[]};
  vm.runInNewContext(dashboard,ctx,{timeout:1800});
  win.memberDash(active.id);
  assert(screens.length>0);
  assert(screens[0].includes('&lt;img src=x onerror=alert(1)&gt; &amp; CEO'));
  assert(screens[0].includes('leader &lt;svg onload=alert(1)&gt;'));
  assert(!screens[0].includes('<img src=x onerror=alert(1)>'));
  assert(!screens[0].includes('<svg onload=alert(1)>'));
});

test('OTP overlay escapes server-provided masked-email HTML',async()=>{
  let overlayMarkup='';
  const btn={disabled:false,textContent:'Login'};
  const win={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://qa.example',supabasePublishableKey:'publishable-test'},addEventListener:()=>{}};
  const ctx={window:win,console,localStorage:{setItem:()=>{},getItem:()=>null},FormData:class{get(k){return k==='id'?'testmember':''}},
    document:{getElementById:()=>null,createElement:()=>({id:'',style:{},innerHTML:'',querySelector:()=>({style:{},addEventListener:()=>{},textContent:'',onclick:null})}),body:{appendChild:el=>{overlayMarkup=el.innerHTML}}},
    fetch:async()=>({ok:true,status:200,json:async()=>({maskedEmail:'<img src=x onerror=alert(1)>@example.com'})}),
    setTimeout:()=>{}};
  vm.runInNewContext(login,ctx,{timeout:1800});
  await win.memberGo({preventDefault:()=>{},target:{querySelector:()=>btn}});
  assert(overlayMarkup.includes('&lt;img src=x onerror=alert(1)&gt;@example.com'));
  assert(!overlayMarkup.includes('<img src=x onerror=alert(1)>'));
  assert.equal(btn.disabled,false);
});

test('Safe patches preserve member API and OTP business contracts',()=>{
  for(const word of ['member-network-live','dbest_member_live_token','DBEST_MEMBER_DASHBOARD_CONTROLLER','transactions']){
    assert(dashboard.includes(word),word+' missing from dashboard');
  }
  for(const word of ['member-login-live','requestOtp','verifyOtp','DBEST_MEMBER_LIVE','Secure DBest Login']){
    assert(login.includes(word),word+' missing from login');
  }
  assert(!dashboard.includes('localStorage.clear()'));
  assert(!login.includes('localStorage.clear()'));
});


test('Member dashboard rejects network responses belonging to a different member',async()=>{
  async function runCase({networkViewer='MEM-A',switchMember=false}={}){
    const baseSession={id:'MEM-A',role:'prime'};
    const writes=[];let renders=0;let release;
    const pending=new Promise(resolve=>{release=resolve});
    const win={
      DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://qa.example',supabasePublishableKey:'public-qa-key'},
      session:baseSession,
      DBEST_SESSION_COMPAT:{read:()=>win.session},
      memberDash:()=>{renders++;return 'rendered';}
    };
    const ctx={window:win,session:baseSession,memberDash:win.memberDash,console,
      document:{addEventListener:()=>{},documentElement:{}},
      MutationObserver:class{observe(){}},
      localStorage:{getItem:k=>k==='dbest_member_live_token'?'qa-session':k==='d2_users'?'[]':null,setItem:(k,v)=>writes.push({k,v})},
      fetch:()=>pending,setTimeout:()=>{},clearTimeout:()=>{},
      users:[],txs:[]
    };
    vm.runInNewContext(dashboard,ctx,{timeout:2000});
    win.memberDash('MEM-A');
    assert.equal(renders,1,'Initial dashboard render still works');
    if(switchMember)win.session={id:'MEM-B',role:'leader'};
    release({ok:true,json:async()=>({viewerId:networkViewer,
      members:[{id:'MEM-A',name:'Private Member'}],
      transactions:[{transaction_id:'TX-SENSITIVE',actor_ref:'MEM-A',section:'Membership'}]})});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(renders,1,'Untrusted or stale network response must not rerender');
    assert.deepEqual(writes,[],'Untrusted or stale response must not write profile or transaction cache');
  }
  await runCase({networkViewer:'MEM-B'});
  await runCase({networkViewer:'MEM-A',switchMember:true});
});
