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
async function scenario(rows,initial){
  const s=selector(initial),scheduled=[];
  const document={documentElement:{},querySelectorAll:()=>[s],createElement:()=>option()};
  const context={window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'public-test-key'}},
    document,console:{warn(){}},setTimeout(fn){scheduled.push(fn);return scheduled.length;},
    clearTimeout(){},MutationObserver:class{observe(){}},
    fetch:async()=>({ok:true,json:async()=>({categories:rows})})};
  vm.runInNewContext(source,context,{timeout:1000});
  await scheduled[0]();return s;
}
(async()=>{
  const s=await scenario([{key:'Electronics',label:'Electronics',active:true}], ' electronics ');
  assert.equal(s.value,'Electronics','legacy category must restore canonical registry key');
  assert.equal(s.validity,'','restored valid category must clear validation error');
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
  console.log('Build 10 category registry runtime smoke: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
