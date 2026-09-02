(function(){
  const rules={
    version:'2026-09-02',
    summit:'leader',
    sameLevelReferralIncomePct:5,
    guest:{
      insurance:{direct:3,upline:3,label:'All Insurance'},
      flights:{direct:0,upline:0,label:'Flights'},
      hotels:{direct:1,upline:1,label:'Hotels'},
      tour:{direct:1,upline:1,label:'Tour Package'},
      marketplace:{direct:1,upline:1,label:'Marketplace'},
      forms:{direct:3,upline:3,label:'Forms'},
      cabs:{direct:1,upline:1,label:'Cabs'},
      homejobs:{direct:2,upline:2,label:'Home Jobs'}
    },
    promoter:{
      health:{direct:15,label:'Health Insurance'},life:{direct:20,label:'Life Insurance'},motor:{direct:10,label:'Motor Insurance'},
      flights:{direct:1,label:'Flights'},hotels:{direct:2,label:'Hotels'},tour:{direct:3,label:'Tour Package'},marketplace:{direct:2,upline:1,label:'Marketplace'},forms:{direct:10,label:'Forms'},homejobs:{direct:5,label:'Home Jobs'},cabs:{direct:5,label:'Cabs'},
      hierarchy:{immediate:3,next:1,third:0.5,level1:3,level2:1,level3:0.5}
    },
    prime:{
      health:{direct:18,label:'Health Insurance'},life:{direct:25,label:'Life Insurance'},motor:{direct:15,label:'Motor Insurance'},
      flights:{direct:1.5,label:'Flights'},hotels:{direct:3,label:'Hotels'},tour:{direct:5,label:'Tour Package'},marketplace:{direct:3,upline:1,label:'Marketplace'},forms:{direct:12,label:'Forms'},homejobs:{direct:7,label:'Home Jobs'},cabs:{direct:7,label:'Cabs'},
      hierarchy:{immediate:3,next:1,third:0.5,level1:3,level2:1,level3:0.5}
    },
    leader:{
      health:{directMin:20,directMax:25,label:'Health Insurance'},life:{directMin:25,directMax:35,label:'Life Insurance'},motor:{directMin:20,directMax:30,label:'Motor Insurance'},
      flights:{direct:2,label:'Flights'},hotels:{direct:5,label:'Hotels'},tour:{direct:10,label:'Tour Package'},marketplace:{direct:5,upline:0,label:'Marketplace'},forms:{direct:15,label:'Forms'},homejobs:{direct:10,label:'Home Jobs'},cabs:{direct:10,label:'Cabs'},
      hierarchy:null
    }
  };
  window.DBEST_PAYOUT_RULES=Object.freeze(rules);
  window.dbestPayout=function(level,category,base,opts){
    level=String(level||'').toLowerCase(); category=String(category||'').toLowerCase(); base=Number(base)||0; opts=opts||{};
    const group=rules[level], r=group&&group[category]; if(!r) return null;
    let pct=r.direct;
    if(pct==null&&r.directMin!=null){pct=Math.min(r.directMax,Math.max(r.directMin,Number(opts.rate)||r.directMin));}
    const direct=base*pct/100;
    return {level,category,base,pct,direct,uplinePct:r.upline==null?null:r.upline,uplineAmount:r.upline==null?null:base*r.upline/100,hierarchy:group&&group.hierarchy?{...group.hierarchy}:null};
  };
})();