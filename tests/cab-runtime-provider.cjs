const assert = require('node:assert/strict');
const handler = require('../api/runtime-config.js');

function response(){
  return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},
    status(n){this.code=n;return this},json(x){this.body=x;return this}};
}
async function main(){
  const oldFetch=global.fetch,oldKey=process.env.GOOGLE_MAPS_SERVER_KEY;
  delete process.env.GOOGLE_MAPS_SERVER_KEY;
  try{
    global.fetch=async url=>{
      const u=String(url);
      if(u.includes('/interpreter'))throw Error('OSM transient outage');
      if(u.includes('nominatim.openstreetmap.org/search')){
        return {ok:true,status:200,json:async()=>[
          {name:'Railway Hospital, Chakradharpur',lat:'22.675384',lon:'85.62599',class:'amenity',type:'hospital'},
          {name:'Sri Medical Store',lat:'22.677',lon:'85.625',class:'shop',type:'chemist'},
          {name:'Hospital in another district',lat:'23.70',lon:'85.60',class:'amenity',type:'hospital'}
        ]};
      }
      throw Error('unrecognized test host');
    };
    const good=response();await handler({query:{mode:'nearby',lat:'22.675',lng:'85.635'}},good);
    assert.equal(good.code,200,'Fallback should return landmarks even without Google server key');
    assert.ok(good.body.places.some(p=>p.name==='Railway Hospital, Chakradharpur'),'Relevant local hospital should be present');
    assert.ok(good.body.places.some(p=>p.types.includes('train_station')),'Relevant local railway stations should be present');
    assert.ok(!good.body.places.some(p=>p.name==='Sri Medical Store'||p.name==='Hospital in another district'),'Irrelevant or distant entries must be excluded');
    assert.deepEqual(good.body.places.find(p=>p.name==='Railway Hospital, Chakradharpur').types,['hospital']);
    const bad=response();await handler({query:{mode:'nearby',lat:'200',lng:'85.635'}},bad);
    assert.equal(bad.code,400);
    // Accept a real image only when the mapped OSM landmark itself names it.
    global.fetch=async url=>{
      if(String(url).includes('overpass.kumi.systems'))return {ok:true,json:async()=>({elements:[
        {tags:{name:'Railway Hospital, Chakradharpur',amenity:'hospital',image:'File:Railway_Hospital_CKP.jpg'},lat:22.675384,lon:85.62599},
        {tags:{name:'Chakradharpur Railway Station',railway:'station',image:'https://untrusted.example/photo.jpg'},lat:22.6783014,lon:85.6270604}
      ]})};
      throw Error('simulated media fallback');
    };
    const media=response();
    await handler({query:{mode:'nearby',lat:'22.57',lng:'85.635'}},media);
    assert.equal(media.code,200);
    assert.match(media.body.places.find(p=>p.name==='Railway Hospital, Chakradharpur').photo,/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
    assert.equal(media.body.places.find(p=>p.name==='Chakradharpur Railway Station').photo,undefined,'Untrusted image hosts must never render');

    console.log('Cab nearby provider functional fallback guards passed');
  }finally{
    global.fetch=oldFetch;
    if(oldKey===undefined)delete process.env.GOOGLE_MAPS_SERVER_KEY;
    else process.env.GOOGLE_MAPS_SERVER_KEY=oldKey;
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
