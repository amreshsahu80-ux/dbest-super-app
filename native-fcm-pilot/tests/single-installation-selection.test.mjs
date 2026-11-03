import test from "node:test";
import assert from "node:assert/strict";
const a="install-a", b="install-b";
const choose=(active,rows)=>active?.enabled ? rows.filter(x=>x.id===active.id && x.enabled):[];
test("new consent chooses one installation",()=>assert.deepEqual(choose({id:b,enabled:true},[{id:a,enabled:true},{id:b,enabled:true}]).map(x=>x.id),[b]));
test("logout of selected installation disables delivery",()=>assert.equal(choose({id:b,enabled:false},[{id:a,enabled:true},{id:b,enabled:true}]).length,0));
test("expired selected token cannot fall back to prior installation",()=>assert.equal(choose({id:b,enabled:true},[{id:a,enabled:true},{id:b,enabled:false}]).length,0));
test("missing binding cannot target a device",()=>assert.equal(choose(null,[{id:a,enabled:true}]).length,0));
