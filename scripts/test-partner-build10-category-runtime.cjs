'use strict';
// Isolated runtime smoke test: no network, database, or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('vendor-dynamic-categories-v1.js','utf8');
function option(){return {value:'',textContent:'',disabled:false,selected:false};}
function selector(initial){
  const original=option();original.value=initial;original.text=initial;
  return {name:'type',value:initial,options:[original],selectedIndex:0,dataset:{},validity:'',
    setCustomValidity(v){this.validity=v;},addEventListener(type,fn){this.onChange=fn;},
    replaceChildren(...items){this.options=items;this.value=items[0]?.value||'';},
    appendChild(o){this.options.push(o);if(o.selected)this.value=o.value;},
    set innerHTML(v){this.options=[];this.value='';}};
}
async function scenario(rows,initial,fetchOverride){
  const s=selector(initial),scheduled=[];
  const document={documentElement:{},querySelectorAll:()=>[s],createElement:()=>option(),addEventListener(type,fn){if(type==='submit')s.onSubmit=fn;}};
  const context={window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'public-test-key'}},
    document,console:{warn(){}},setTimeout(fn){scheduled.push(fn);return scheduled.length;},
    clearTimeout(){},MutationObserver:class{observe(){}},
    fetch:fetchOverride|| (async()=>({ok:true,json:async()=>({categories:rows})}))};
  vm.runInNewContext(source,context,{timeout:1000});
  await scheduled[0]();return s;
}
(async()=>{
  const s=await scenario([{key:'Electronics',label:'Electronics',active:true}], ' electronics ');
  assert.equal(s.value,'Electronics','legacy category must restore canonical registry key');
  assert.equal(s.validity,'','restored valid category must clear validation error');
  const registryFailure=await scenario([], 'Electronics', async()=>({ok:false,json:async()=>({error:'registry_offline'})}));
  assert.match(registryFailure.validity,/could not be verified/i,'registry HTTP errors must block Electronics registration');
  const malformedRegistry=await scenario([], 'Electronics', async()=>({ok:true,json:async()=>({categories:{Electronics:true}})}));
  assert.match(malformedRegistry.validity,/could not be verified/i,'malformed category payload must block registration');
  const blocked=await scenario([{key:'Electronics',active:false},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(blocked.validity,'','disabled Electronics must not be accepted');
  const dup=await scenario([{key:'Electronics'},{key:' electronics '}],'Electronics');
  assert.match(dup.validity,/could not be verified/i,'duplicate active keys must fail closed');
  const inactive=await scenario([{key:'Electronics',status:'archived'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(inactive.validity,'','archived Electronics must not be accepted');
  const stringDisabled=await scenario([{key:'Electronics',enabled:'false'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(stringDisabled.validity,'','string-disabled Electronics must not be accepted');
  const suspended=await scenario([{key:'Electronics',status:'suspended'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(suspended.validity,'','suspended Electronics must not be accepted');
  const isActiveDisabled=await scenario([{key:'Electronics',is_active:'0'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(isActiveDisabled.validity,'','string-zero is_active must not be accepted');
  const empty=await scenario([],'Electronics');
  assert.equal(empty.validity,'No active business categories available','empty authoritative registry must fail closed');
  const deleted=await scenario([{key:'Electronics',status:'deleted'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(deleted.validity,'','deleted Electronics must not be accepted');
  const softDeleted=await scenario([{key:'Electronics',active:true,deleted_at:'2026-11-20T00:00:00Z'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(softDeleted.validity,'','soft-deleted active Electronics must not be selectable');
  const archivedAt=await scenario([{key:'Electronics',active:true,archived_at:'2026-11-20T00:00:00Z'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(archivedAt.validity,'','archived active Electronics must not be selectable');
  const mixed=await scenario([{key:'Electronics',active:false},{key:' electronics ',active:true}],'electronics');
  assert.equal(mixed.value,'electronics','disabled duplicate must not block active canonical registry key');
  assert.equal(mixed.validity,'','active category must remain selectable despite disabled historical duplicate');
  const pendingFlag=await scenario([{key:'Electronics',active:'pending'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(pendingFlag.validity,'','unknown activation flags must fail closed');
  const pendingEnabled=await scenario([{key:'Electronics',enabled:'pending'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(pendingEnabled.validity,'','pending enabled flags must not be selectable');
  const positiveFlag=await scenario([{key:'Electronics',active:'1',enabled:'yes',is_active:true}],'electronics');
  assert.equal(positiveFlag.value,'Electronics','known affirmative activation flags must remain selectable');
  const disabledByStatus=await scenario([{key:'Electronics',status:'inactive'},{key:'Grocery',active:true}],'Electronics');
  assert.notEqual(disabledByStatus.validity,'','inactive Electronics must not be accepted');
  const spaced=await scenario([{key:' Electronics ',label:'Electronics',active:true}],'electronics');
  assert.equal(spaced.value,'Electronics','registry key whitespace must normalize before restoring selection');
  const selectable=await scenario([{key:'Electronics',active:true},{key:'Grocery',active:true}],'');
  assert.equal(selectable.validity,'Choose a business category','blank selection must remain invalid');
  selectable.value='Electronics';
  selectable.onChange();
  assert.equal(selectable.validity,'','valid Electronics selection must clear validation');
  selectable.value='UnregisteredCategory';
  selectable.onChange();
  assert.notEqual(selectable.validity,'','unregistered category must fail validation');
  let prevented=false;selectable.value='UnregisteredCategory';selectable.onSubmit({target:{querySelectorAll:()=>[selectable]},preventDefault(){prevented=true;}});assert.equal(prevented,true,'unregistered category must block form submission');
  prevented=false;selectable.value='Electronics';selectable.onSubmit({target:{querySelectorAll:()=>[selectable]},preventDefault(){prevented=true;}});assert.equal(prevented,false,'active category must permit form submission');
  // A refresh must discard cached category authorization after owner registry changes.
  {
    const s=selector('Electronics'),scheduled=[];
    let active=true,requests=0;
    const document={documentElement:{},querySelectorAll:()=>[s],createElement:()=>option(),
      addEventListener(type,fn){if(type==='submit')s.onSubmit=fn;}};
    const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'public-test-key'}};
    const context={window,document,console:{warn(){}},
      setTimeout(fn){scheduled.push(fn);return scheduled.length;},clearTimeout(){},
      MutationObserver:class{observe(){}},
      fetch:async()=>{requests++;const rows=active?[{key:'Electronics',active:true}]:[{key:'Electronics',active:false}];
        return {ok:true,json:async()=>({categories:rows})};}};
    vm.runInNewContext(source,context,{timeout:1000});
    await scheduled[0]();
    assert.equal(s.value,'Electronics','initial Electronics category must be selectable');
    active=false;
    await window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
    assert.ok(requests>=2,'refresh must request the latest registry instead of using cached categories');
    let prevented=false;
    s.onSubmit({target:{querySelectorAll:()=>[s]},preventDefault(){prevented=true;}});
    assert.equal(prevented,true,'revoked Electronics category must not submit after registry refresh');
  }
  // A competing legacy script may replace options without changing the select node.
  // The authoritative registry must restore the options on the next observer pass.
  {
    const s=selector('Electronics'),scheduled=[];
    const document={documentElement:{},querySelectorAll:()=>[s],createElement:()=>option(),
      addEventListener(type,fn){if(type==='submit')s.onSubmit=fn;}};
    const context={window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'public-test-key'}},
      document,console:{warn(){}},setTimeout(fn){scheduled.push(fn);return scheduled.length;},clearTimeout(){},
      MutationObserver:class{observe(){}},fetch:async()=>({ok:true,json:async()=>({categories:[{key:'Electronics',active:true}]})})};
    vm.runInNewContext(source,context,{timeout:1000});
    await scheduled[0]();
    assert.ok(s.options.some(o=>o.value==='Electronics'));
    const legacy=option();legacy.value='other';legacy.textContent='Other';
    s.replaceChildren(legacy);s.value='other';
    await scheduled[1]();
    assert.ok(s.options.some(o=>o.value==='Electronics'),'observer must restore registry options after legacy DOM overwrite');
    assert.ok(!s.options.some(o=>o.value==='other'),'legacy static category must not survive authoritative refresh');
  }
  // Registry recovery must not allow an older in-flight response to restore revoked categories.
  {
    const s=selector('Electronics'),scheduled=[];
    let resolveFirst,requests=0;
    const document={documentElement:{},querySelectorAll:()=>[s],createElement:()=>option(),
      addEventListener(type,fn){if(type==='submit')s.onSubmit=fn;}};
    const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'public-test-key'}};
    const context={window,document,console:{warn(){}},
      setTimeout(fn){scheduled.push(fn);return scheduled.length;},clearTimeout(){},
      MutationObserver:class{observe(){}},
      fetch:()=>{requests++;return requests===1?new Promise(resolve=>{resolveFirst=resolve;}):
        Promise.resolve({ok:true,json:async()=>({categories:[{key:'Electronics',active:false}]})});}};
    vm.runInNewContext(source,context,{timeout:1000});
    const stale=scheduled[0]();
    await window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
    resolveFirst({ok:true,json:async()=>({categories:[{key:'Electronics',active:true}]})});
    await stale;
    assert.equal(requests,2,'refresh must fetch new registry while prior request is pending');
    assert.ok(!s.options.some(o=>o.value==='Electronics'),'stale response must not restore revoked Electronics');
    let prevented=false;s.value='Electronics';
    s.onSubmit({target:{querySelectorAll:()=>[s]},preventDefault(){prevented=true;}});
    assert.equal(prevented,true,'stale response must not authorize Electronics submission');
  }
  console.log('Build 10 category registry runtime smoke: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
