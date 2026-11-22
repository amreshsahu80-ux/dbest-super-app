// Isolated Build 10 category selector runtime regression. No network or production access.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','vendor-dynamic-categories-v1.js'),'utf8');
function harness(payload){
 let registryPayload=payload;
 const listeners={}; const options=[];
 const select={
   name:'type',dataset:{},required:false,options,selectedIndex:0,
   set innerHTML(v){if(v===''){this.options.length=0;this._value='';this.selectedIndex=-1;}},
   appendChild(item){this.options.push(item);if(item.selected)this.value=item.value;return item;},
   _value:'',validityMessage:'',
   get value(){return this._value;},set value(v){this._value=v;this.selectedIndex=this.options.findIndex(o=>o.value===v);},
   setCustomValidity(v){this.validityMessage=v;},
   addEventListener(event,fn){(listeners[event]??=[]).push(fn);},
   replaceChildren(...items){this.options.splice(0,this.options.length,...items);this._value='';this.selectedIndex=0;},
   reportValidity(){return !this.validityMessage;}
 };
 const document={
   documentElement:{},visibilityState:'hidden',
   createElement(tag){if(tag!=='option')throw new Error('Unexpected DOM element: '+tag);return {value:'',textContent:'',get text(){return this.textContent;},set text(v){this.textContent=v;},disabled:false,selected:false};},
   querySelectorAll(q){return q==='select[name="type"]'?[select]:[];},
   addEventListener(event,fn){(listeners['document:'+event]??=[]).push(fn);}
 };
 const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'test-public-key'},addEventListener(){}};
 const context={window,document,console:{warn(){}},MutationObserver:class{observe(){}},
   setTimeout(){return 0;},clearTimeout(){},
   fetch:async()=>({ok:true,json:async()=>registryPayload}),
 };
 vm.runInNewContext(source,context,{timeout:1000});
 return {select,window,listeners,setRegistry(next){registryPayload=next;}};
}
test('authoritative Electronics registry populates required selector and accepts selection',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.equal(h.select.required,true);
 assert.equal(h.select.options.some(o=>o.value==='electronics'),true);
 h.select.value='electronics';
 h.listeners.change[0]();
 assert.equal(h.select.validityMessage,'');
});
test('inactive registry entry cannot be submitted',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:false}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.notEqual(h.select.validityMessage,'');
 assert.equal(h.select.options.some(o=>o.value==='electronics'),false);
});
test('registry refresh rejects previously selected category after deactivation',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 h.select.value='electronics';h.listeners.change[0]();
 assert.equal(h.select.validityMessage,'');
 h.setRegistry({categories:[{key:'electronics',label:'Electronics',active:false}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.equal(h.select.options.some(o=>o.value==='electronics'),false);
 assert.notEqual(h.select.validityMessage,'');
 assert.equal(h.select.required,true);
});

test('registry label update preserves Electronics selection without duplicate listeners',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 h.select.value='electronics';h.listeners.change[0]();
 h.setRegistry({categories:[{key:'electronics',label:'Electronics & Appliances',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.equal(h.select.value,'electronics');
 assert.equal(h.select.options.find(o=>o.value==='electronics')?.textContent,'Electronics & Appliances');
 assert.equal(h.select.validityMessage,'');
 assert.equal(h.listeners.change.length,1);
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.equal(h.select.value,'electronics');
 assert.equal(h.listeners.change.length,1);
});
test('invalid registry response fails closed rather than retaining stale Electronics',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 h.select.value='electronics';
 h.setRegistry({error:'registry_unavailable'});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 assert.equal(h.select.options.some(o=>o.value==='electronics'),false);
 assert.notEqual(h.select.validityMessage,'');
});

test('form submission blocks stale Electronics after registry deactivation',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 h.select.value='electronics';
 h.setRegistry({categories:[{key:'electronics',label:'Electronics',active:false}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 let prevented=false;
 const form={querySelectorAll(q){return q==='select[name="type"]'?[h.select]:[];}};
 h.listeners['document:submit'][0]({target:form,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.notEqual(h.select.validityMessage,'');
});
test('form submission accepts active Electronics registry selection',async()=>{
 const h=harness({categories:[{key:'electronics',label:'Electronics',active:true}]});
 await h.window.DBEST_VENDOR_DYNAMIC_CATEGORIES.refresh();
 h.select.value='electronics';
 let prevented=false;
 const form={querySelectorAll(q){return q==='select[name="type"]'?[h.select]:[];}};
 h.listeners['document:submit'][0]({target:form,preventDefault(){prevented=true;}});
 assert.equal(prevented,false);
 assert.equal(h.select.validityMessage,'');
});
