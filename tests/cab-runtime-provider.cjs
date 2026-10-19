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
    assert.deepEqual(good.body.places.map(p=>p.name),['Railway Hospital, Chakradharpur']);
    assert.deepEqual(good.body.places[0].types,['hospital']);
    const bad=response();await handler({query:{mode:'nearby',lat:'200',lng:'85.635'}},bad);
    assert.equal(bad.code,400);
    console.log('Cab nearby provider functional fallback guards passed');
  }finally{
    global.fetch=oldFetch;
    if(oldKey===undefined)delete process.env.GOOGLE_MAPS_SERVER_KEY;
    else process.env.GOOGLE_MAPS_SERVER_KEY=oldKey;
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
