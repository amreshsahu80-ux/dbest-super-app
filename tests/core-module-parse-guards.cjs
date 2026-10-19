const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
let total=0;
for(const group of ['baseExtras','ownerExtras']){
 const match=html.match(new RegExp('const '+group+'=(\\[[^;]+\\]);'));
 assert.ok(match,'Bootstrap module list missing: '+group);
 const assets=vm.runInNewContext(match[1]);
 for(const path of assets){
  assert.ok(fs.existsSync(path),'Missing '+group+' module: '+path);
  const source=fs.readFileSync(path,'utf8');
  try{new vm.Script(source,{filename:path})}catch(e){throw new Error('Invalid startup module '+path+': '+e.message)}
  total++;
 }
}
const legacyCab=fs.readFileSync('cab-planned-ui-v2.js','utf8');
const events=[];
const mockWindow={};
const mockDocument={addEventListener:(...args)=>events.push(args)};
vm.runInNewContext(legacyCab,{window:mockWindow,document:mockDocument,console},{filename:'cab-planned-ui-v2.js'});
assert.equal(events.length,0,'Legacy Cab must not intercept click events by default');
assert.equal(mockWindow.DBEST_CAB_V13,undefined,'Legacy Cab must not seize UI authority without opt-in');
assert.ok(total>=70,'Unusually short startup module list');
console.log('DBest core/Owner startup module parse guard passed for '+total+' modules.');
