const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const client=fs.readFileSync(path.join(__dirname,'../marketplace-multi-vendor-client-v1.js'),'utf8');
test('all sensitive multi-vendor operations use authenticated request helper',()=>{
 for(const action of ['invite_vendors','customer_offers','accept_offer','vendor_invitations','submit_offer'])
  assert.ok(client.includes("'"+action+"'"),'missing '+action);
 assert.ok(client.includes("'x-vendor-token'"));
 assert.ok(client.includes("'x-dbest-member-token'"));
});
test('feature flag defaults to disabled',()=>assert.ok(client.includes('cfg.marketplaceMultiVendorEnabled===true')));
test('client never embeds a service role key',()=>assert.ok(!/SERVICE_ROLE_KEY|service_role/i.test(client)));
