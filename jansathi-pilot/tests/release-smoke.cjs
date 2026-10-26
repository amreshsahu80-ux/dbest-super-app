'use strict';
/**
 * JanSathi static launch smoke checks.
 * npm-free; run: node jansathi-pilot/tests/release-smoke.cjs
 * Checks only UI/source invariants, not browser/SSO/end-to-end production readiness.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const web=path.join(__dirname,'..','web');
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
const js=fs.readFileSync(path.join(web,'app.js'),'utf8');
const css=fs.readFileSync(path.join(web,'styles.css'),'utf8');
const start=html.indexOf('<section id="homeView"');
const end=html.indexOf('<section id="exploreView"');
assert.ok(start>=0&&end>start,'home and explore must be separate screens');
const home=html.slice(start,end);
const tiles=[...home.matchAll(/<button[^>]+class="mainTile"[^>]+data-report="(civic|news)"/g)].map(m=>m[1]);
assert.deepEqual(tiles,['civic','news'],'exactly two home action tiles');
assert.match(home,/>Report a Problem</);
assert.match(home,/>Report a News</);
const photos=[...home.matchAll(/<img[^>]+src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)].map(m=>m[1]);
assert.equal(photos.length,2,'two embedded, self-contained photographs');
photos.forEach((base64,i)=>{
 const b=Buffer.from(base64,'base64');
 assert.ok(b.length>1000,'photo '+i+' must contain image bytes');
 assert.equal(b.toString('ascii',0,4),'RIFF','must be a WebP RIFF file');
 assert.equal(b.toString('ascii',8,12),'WEBP','must be a valid WebP container marker');
});
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/,'keep tiles side-by-side on mobile');
assert.match(css,/\.tileProblem img\{left:0!important\}/,'problem tile must show the road crop');
assert.match(css,/\.tileNews img\{left:-100%!important\}/,'news tile must show the news crop');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'all HTML IDs must be unique');
const references=[...js.matchAll(/byId\(["']([^"']+)["']\)/g)].map(m=>m[1]);
const unresolved=[...new Set(references)].filter(id=>!ids.includes(id));
assert.deepEqual(unresolved,[],'all existing UI controls must remain present');
for(const id of ['ownerGeoPanel','ownerSeverityPanel','ownerNationalPanel','loginDrawer','myReportsPanel']){
 assert.ok(ids.includes(id),'critical control missing: '+id);
}
assert.match(js,/if\(ONLINE&&!session\)/,'report submission requires sign-in');
assert.match(js,/reportKind==="news"&&!paidNewsEligible/,'news permission gate');
assert.doesNotMatch(html+js,/SUPABASE_SERVICE_ROLE_KEY|JANSATHI_SERVICE_ROLE_KEY|DBEST_PRO_SERVICE_ROLE_KEY/);
new vm.Script(js,{filename:'jansathi-pilot/web/app.js'});
console.log('PASS: JanSathi 2-tile image UI, mobile layout, controls, login gate, owner gates & JS syntax.');
console.log('NOT TESTED: real Auth, DBest SSO, verified residence, browser E2E, abuse moderation.');
