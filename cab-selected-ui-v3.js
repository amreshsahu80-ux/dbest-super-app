(function(){
'use strict';
const VERSION='20261005-local-smart-search-v9';
const cfg=()=>({...window.DBEST_RUNTIME_CONFIG,...window.DBEST_RUNTIME_SECRETS});
const RECENT_KEY='dbest_cab_recent_places_v6';
const IMG={
 bike:'https://www.nicepng.com/png/full/693-6933025_shine-png.png',
 auto:'https://wallpapers.com/images/high/yellow-black-auto-rickshaw-side-view-png-i1udu28purzkrd2x-i1udu28purzkrd2x.png',
 mini:'https://toppng.com/uploads/preview/seat-cars-png-download-11663840844a35f6arz1x.png',
 sedan:'https://toppng.com/uploads/preview/mercedes-cars-png-free-11663106574ofjrkgo0xd.png',
 suv:'https://toppng.com/uploads/preview/mercedes-cars-png-11663106529htsw5otepi.png'
};
const PLATFORM_FEE=15;
const VEH=[
 {id:'bike',name:'Bike',seats:1,base:4,km:3,min:4},
 {id:'auto',name:'Auto/E-Rickshaw',seats:3,base:20,km:6,min:20},
 {id:'sedan',name:'Sedan',seats:4,base:70,km:18,min:100},
 {id:'suv',name:'SUV',seats:6,base:105,km:23,min:160}
];
const S={p:null,d:null,stops:[],route:null,mode:'ride',tripType:'oneway',nightHalt:false,schedule:'now',scheduledAt:'',rider:'self',riderName:'',riderMobile:'',rentalHours:2,rentalKm:20,selected:'auto',provider:'fallback',map:null,layer:null,entryMap:null,carpoolSeats:1,carpoolVehicle:'Any',carpoolName:'',carpoolMobile:'',carpoolRequestId:''};
const $=id=>document.getElementById(id), q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
function css(){
 if($('dbest-cab-v6-css'))return;
 const x=document.createElement('style');x.id='dbest-cab-v6-css';x.textContent=`
.cab6Page{min-height:100dvh;background:linear-gradient(180deg,#f7f8fb 0%,#fff 38%,#f8fafc 100%);color:#111827}
.cab6Top{position:sticky;top:0;z-index:100;display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:8px;min-height:64px;padding:8px 12px;background:rgba(255,255,255,.92);border-bottom:1px solid rgba(226,232,240,.9);backdrop-filter:blur(20px);box-shadow:0 8px 28px rgba(15,23,42,.05)}
.cab6Top button{width:44px;height:44px;border:1px solid #e2e8f0;border-radius:50%;background:#fff;color:#172033;font-weight:900;font-size:0;box-shadow:0 4px 14px rgba(15,23,42,.06)}.cab6Top button:first-child:after{content:'←';font-size:21px}.cab6Top button:last-child:after{content:'⌂';font-size:20px}.cab6TopTitle{text-align:center}.cab6TopTitle b{display:block;font-size:15px;letter-spacing:-.2px}.cab6TopTitle small{display:block;margin-top:2px;color:#8a94a6;font-size:9px;font-weight:750}.cab6Logo{display:none!important}
.cab6Wrap{max-width:720px;margin:auto;padding:12px 10px 34px}.cab6Search{border:1px solid #e6e9ef;border-radius:30px;background:rgba(255,255,255,.96);padding:18px 14px;box-shadow:0 20px 50px rgba(15,23,42,.09)}
.cab6Spark{width:40px;height:40px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:#fff;border:1px solid #dde1f0;color:#5360d5;font-size:19px}.cab6Title{margin:0 0 4px;font-size:25px;line-height:1.08}.cab6Sub{margin:0 0 14px;color:#777f94;font-size:11px}
.cab6Field{position:relative;margin:9px 0}.cab6Field input,.cab6Field select{box-sizing:border-box;width:100%;min-height:55px;border:1px solid #d8deed;border-radius:18px;background:#fff;padding:12px 15px;font-size:14px;color:#17203b;box-shadow:0 6px 16px #27366b0d}.cab6Field.pick input{border-left:6px solid #2ab779}.cab6Field.drop input{border-left:6px solid #f45361}.cab6Field input:focus,.cab6Field select:focus{outline:none;border-color:#7c83ee;box-shadow:0 0 0 4px #6673e814}
.cab6Suggest{display:none;position:absolute;z-index:250;left:0;right:0;top:calc(100% + 5px);max-height:250px;overflow:auto;background:#fff;border:1px solid #dce2ef;border-radius:16px;box-shadow:0 16px 38px #1d2d6126}.cab6Suggest.show{display:block}.cab6Suggest button{display:block;width:100%;padding:11px 12px;text-align:left;border:0;border-bottom:1px solid #eef1f6;background:#fff;color:#24304e;font-size:11px}
.cab6RecentHead{margin:13px 2px 7px;font-size:11px;font-weight:900}.cab6Recents{display:grid;gap:6px}.cab6Recent{width:100%;min-height:42px;text-align:left;border:1px solid #dfe3ef;border-radius:14px;background:#ffffffc8;padding:9px 11px;color:#566078;font-size:10px;font-weight:850}
.cab6Tools{display:flex;gap:8px;margin:10px 0}.cab6Tools button{min-height:40px;border:1px solid #dce1ef;border-radius:14px;background:#fff;color:#415180;padding:8px 11px;font-size:10px;font-weight:900}.cab6Tools .gps{flex:1;color:#168375}
.cab6StopBar{display:flex;justify-content:flex-end;margin:2px 1px 5px}.cab6AddStop{border:0;background:transparent;color:#315efb;font-size:10px;font-weight:900;padding:4px 2px}.cab6Stops{display:grid;gap:5px}.cab6StopRow{display:grid;grid-template-columns:1fr 34px;gap:6px;align-items:center}.cab6StopRow .cab6Field{margin:0}.cab6StopRemove{height:34px;border:1px solid #e1e5ef;border-radius:11px;background:#fff;color:#9b3340;font-weight:900}.cab6TripType{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.cab6TripType button{min-height:46px;border:1px solid #dfe3ef;border-radius:15px;background:#fff;color:#344566;font-size:11px;font-weight:900}.cab6TripType button.on{background:#111827;color:#fff;border-color:#111827;box-shadow:0 8px 20px rgba(15,23,42,.14)}.cab6RoundNote{display:none;margin:7px 0 10px;padding:10px 11px;border:1px solid #dfe7fb;border-radius:14px;background:#f4f7ff;color:#43506d;font-size:9.5px;line-height:1.45}.cab6RoundNote.show{display:block}.cab6PoolBox{display:none;margin:7px 0 10px;padding:11px;border:1px solid #dfe7fb;border-radius:14px;background:#f7f9ff}.cab6PoolBox.show{display:block}.cab6PoolGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.cab6PoolBox .cab6Field{margin:6px 0}.cab6PoolNote{font-size:9.5px;color:#59647a;line-height:1.45;margin-bottom:6px}.cab6PoolSuccess{padding:18px;border-radius:22px;background:#fff;border:1px solid #e0e7f2;box-shadow:0 16px 38px #20306418}.cab6PoolSuccess h2{margin:0 0 6px}.cab6PoolId{font-size:23px;font-weight:950;color:#1f5cf3;margin:10px 0}.cab6RoundNote label{display:flex;gap:7px;align-items:center;margin-top:8px;font-weight:850}.cab6Quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0}.cab6Quick button{min-height:77px;border:1px solid #dfe3ef;border-radius:18px;background:#fff;padding:8px 4px;color:#17203d;font-size:8.8px;font-weight:900;box-shadow:0 7px 18px #28376e0b}.cab6Quick span{display:grid;place-items:center;width:31px;height:31px;margin:0 auto 6px;border-radius:11px;background:#eef0ff;font-size:15px}.cab6Quick button.on{border-color:#7d84ed;background:#f3f4ff}.cab6Quick button.on span{background:linear-gradient(135deg,#315cf4,#6d4fe8);color:#fff}
.cab6Extra{display:none;margin:8px 0;padding:8px;border:1px solid #e1e5ef;border-radius:15px;background:#ffffffa8}.cab6Extra.show{display:block}.cab6Go,.cab6Book{width:100%;min-height:56px;border:0;border-radius:18px;background:#111827;color:#fff;font-size:15px;font-weight:950;box-shadow:0 14px 30px rgba(15,23,42,.18)}
.cab6MapFrame{position:relative;height:315px;overflow:hidden;border-radius:28px;background:#171d48;box-shadow:0 22px 48px #17204d3c}.cab6Map{position:absolute;inset:0}.cab6MapShade{pointer-events:none;position:absolute;inset:0;z-index:400;background:linear-gradient(180deg,#10163a10,#10163a06 58%,#10163a35)}.cab6RoutePill{position:absolute;z-index:500;left:14px;right:14px;top:14px;padding:8px 11px;border:1px solid #ffffff36;border-radius:999px;background:#10163aaa;color:#fff;font-size:9px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px)}
.cab6Sheet{position:relative;z-index:20;margin:12px 7px 0;border:1px solid #e1e5ef;border-radius:28px;background:#fff;padding:15px 12px 17px;box-shadow:0 18px 40px #202b7126}.cab6SheetHead{display:flex;align-items:end;justify-content:space-between;margin:0 2px 10px}.cab6SheetHead b{font-size:18px}.cab6SheetHead small{font-size:9px;color:#7b8294}.cab6Meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.cab6Meta div{padding:9px 10px;border:1px solid #e5e7f1;border-radius:14px;background:#f6f7ff}.cab6Meta small{display:block;color:#858c9d;font-size:8.5px}.cab6Meta b{display:block;margin-top:2px;color:#21305d;font-size:13px}
.cab6Vehicles{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 8px;scrollbar-width:none}.cab6Vehicles::-webkit-scrollbar{display:none}.cab6Veh{flex:0 0 118px;min-height:135px;border:1px solid #dfe4ed;border-radius:20px;background:#fff;padding:8px;text-align:left;display:flex;flex-direction:column;color:#1d2747;box-shadow:0 7px 17px #29386e0a}.cab6Veh.on{border-color:#7883ee;background:#f5f5ff;box-shadow:0 0 0 2px #7582ee12}.cab6Veh .photo{height:58px;border-radius:13px;background:linear-gradient(180deg,#fafbff,#eef0ff);display:flex;align-items:center;justify-content:center;overflow:hidden}.cab6Veh img{width:104px;height:56px;object-fit:contain;filter:drop-shadow(0 6px 5px #1c234b28)}.cab6Veh b{font-size:11px;margin-top:6px}.cab6Veh small{font-size:8px;color:#818999}.cab6Veh strong{margin-top:auto;font-size:15px;color:#1e2d61}
.cab6Confirm{position:relative;z-index:20;margin:12px 7px 0;border:1px solid #e1e5ef;border-radius:25px;background:#fff;padding:15px;box-shadow:0 20px 46px #202b7126}.cab6ConfirmMap .cab6MapFrame{height:225px;margin-bottom:0;border-radius:24px}.cab6VehicleHero{display:flex;gap:11px;align-items:center;margin-bottom:8px}.cab6VehicleHero .pic{width:106px;height:62px;border-radius:14px;background:#f2f4ff;display:flex;align-items:center;justify-content:center}.cab6VehicleHero img{width:100px;height:58px;object-fit:contain;filter:drop-shadow(0 6px 5px #1c234b28)}.cab6RouteRow{padding:9px 0;border-bottom:1px solid #edf0f5}.cab6RouteRow small{display:block;color:#8790a2;font-size:8.5px}.cab6RouteRow b{display:block;margin-top:3px;color:#1e2947;font-size:12px}.cab6Fare{display:flex;justify-content:space-between;align-items:end;margin:13px 0 9px}.cab6Fare strong{font-size:27px;color:#172960}.cab6Pay{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.cab6Pay label{border:1px solid #dfe3ee;border-radius:14px;background:#fafbff;padding:10px;font-size:10px;font-weight:850;color:#354567}
.cab6Page .leaflet-control-attribution{font-size:7px!important;background:#ffffffb8!important}.cab6Page .leaflet-control-zoom{border:0!important;box-shadow:0 5px 12px #0002!important}.cab6Page .leaflet-control-zoom a{background:#ffffffdf!important;color:#263454!important}.cab6Page .leaflet-marker-icon{filter:drop-shadow(0 4px 5px #0005)}
body:has(.cab6Page) #dbestServicePartnerQuick,body:has(.cab6Page) .floatingServicePartner,body:has(.cab6Page) [data-service-partner-floating],body:has(.cab6Page) .dbcgProvider{display:none!important}

.cab6EntryMapWrap{position:relative;height:260px;margin:0 0 12px;border-radius:24px;overflow:hidden;background:linear-gradient(145deg,#dbe9ff,#edf3ff);box-shadow:0 14px 34px rgba(30,55,120,.12)}
.cab6EntryMap{position:absolute;inset:0}
.cab6EntryMapFallback{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#42506c;background:radial-gradient(circle at 25% 25%,rgba(44,177,132,.18),transparent 26%),linear-gradient(135deg,#edf4ff,#e9eefc 50%,#f6f8ff)}
.cab6EntryMapFallback:before{content:'';position:absolute;left:9%;right:8%;top:48%;height:7px;border-radius:999px;background:linear-gradient(90deg,#1bc2dc,#2462ee);transform:rotate(-9deg);box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.cab6EntryMapPin{position:absolute;left:50%;top:45%;transform:translate(-50%,-100%) rotate(-45deg);width:34px;height:34px;border-radius:50% 50% 50% 0;background:#2362ee;box-shadow:0 8px 18px rgba(35,98,238,.3)}
.cab6EntryMapPin:after{content:'';position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;left:11px;top:11px}
.cab6EntryMapBadge{position:absolute;z-index:3;left:14px;top:14px;padding:8px 11px;border-radius:999px;background:rgba(16,30,71,.82);color:#fff;font-size:9px;font-weight:900;backdrop-filter:blur(8px)}
.cab6EntryLocate{position:absolute;z-index:3;right:14px;bottom:58px;width:42px;height:42px;border:0;border-radius:14px;background:#fff;color:#2162ef;font-size:19px;box-shadow:0 8px 20px rgba(28,52,110,.18)}
.cab6Search.cab6EntrySheet{position:relative;z-index:6;margin:0 6px;border-radius:24px;padding:13px 12px 15px;background:rgba(255,255,255,.99);box-shadow:0 18px 40px rgba(29,46,100,.16);border:1px solid #e3e8f3}
.cab6Search.cab6EntrySheet .cab6Spark,.cab6Search.cab6EntrySheet .cab6Title,.cab6Search.cab6EntrySheet .cab6Sub{display:none!important}
.cab6EntryHandle{width:38px;height:4px;border-radius:99px;background:#d6dbe7;margin:0 auto 8px}
.cab6EntryHeading{display:flex;align-items:center;justify-content:space-between;margin:0 2px 6px}
.cab6EntryHeading b{font-size:15px;color:#17203d}.cab6EntryHeading small{font-size:8.5px;color:#8490a4}
.cab6Search.cab6EntrySheet .cab6Field{margin:7px 0}
.cab6Search.cab6EntrySheet .cab6Field input{min-height:48px;border-radius:15px;background:#fbfcff;font-size:13px}
.cab6Search.cab6EntrySheet .cab6RecentHead{margin-top:7px}
.cab6Search.cab6EntrySheet .cab6Quick{margin:8px 0 10px}
.cab6Search.cab6EntrySheet .cab6Quick button{min-height:60px;border-radius:15px}
.cab6Search.cab6EntrySheet .cab6Tools{display:none}
.cab6Search.cab6EntrySheet .cab6Go{position:static;min-height:52px;border-radius:16px;box-shadow:0 10px 24px rgba(51,80,208,.24)}
@media(max-width:480px){.cab6Wrap{padding:8px 8px 18px}.cab6MapFrame{height:235px;margin-bottom:14px;border-radius:22px}.cab6ConfirmMap .cab6MapFrame{height:205px;margin-bottom:0;border-radius:21px}.cab6Confirm{margin:10px 2px 0;padding:13px;border-radius:22px}.cab6Sheet{margin-top:0;clear:both}.cab6EntryMapWrap{height:195px;margin:0 0 8px;border-radius:20px}.cab6EntryMapBadge{left:10px;top:9px;padding:5px 8px}.cab6EntryLocate{right:10px;bottom:9px;width:36px;height:36px;border-radius:12px}.cab6Search.cab6EntrySheet{margin:0 2px;padding:9px 10px 11px;border-radius:21px}.cab6EntryHandle{margin-bottom:6px}.cab6EntryHeading{margin-bottom:4px}.cab6Search.cab6EntrySheet .cab6Field{margin:5px 0}.cab6Search.cab6EntrySheet .cab6Field input{min-height:45px}.cab6StopBar{margin:0 1px 3px}.cab6AddStop{font-size:9.5px;padding:2px}.cab6StopRow{grid-template-columns:1fr 32px;gap:5px}.cab6StopRemove{height:32px}.cab6TripType{margin:7px 0 8px}.cab6TripType button{min-height:39px}.cab6Search.cab6EntrySheet .cab6Quick{margin:7px 0 8px;gap:6px}.cab6Search.cab6EntrySheet .cab6Quick button{font-size:8px;min-height:50px;padding:6px 3px}.cab6Quick span{width:28px;height:28px;margin-bottom:4px}.cab6Tools{margin:5px 0}.cab6Go{min-height:48px!important;margin-top:7px!important}}

@media(max-width:390px){.cab6Top{grid-template-columns:70px 1fr 70px}.cab6Top button{font-size:10px}.cab6Logo{width:100px}.cab6Veh{flex-basis:112px}.cab6MapFrame{height:220px;margin-bottom:14px;border-radius:22px}.cab6Sheet{margin:0 2px 0;border-radius:24px;clear:both}.cab6Meta{margin-top:2px}}

/* Vibrant V5 visual layer — presentation only */
.cab6Page{background:radial-gradient(circle at 12% 4%,rgba(99,102,241,.15),transparent 26%),radial-gradient(circle at 92% 18%,rgba(14,165,233,.13),transparent 25%),linear-gradient(180deg,#f8faff 0%,#f5f7ff 48%,#fff 100%)}
.cab6Top{background:rgba(255,255,255,.86);border-bottom:1px solid rgba(99,102,241,.12);box-shadow:0 10px 30px rgba(46,54,104,.08)}
.cab6Top button{border:1px solid rgba(99,102,241,.16);background:linear-gradient(145deg,#fff,#f3f5ff);color:#4f46e5;box-shadow:0 7px 20px rgba(79,70,229,.10)}
.cab6TopTitle b{font-size:16px;background:linear-gradient(90deg,#111827,#4f46e5);-webkit-background-clip:text;color:transparent}.cab6TopTitle small{color:#8187a2}
.cab6EntryMapWrap,.cab6MapFrame{border:1px solid rgba(99,102,241,.14);box-shadow:0 20px 50px rgba(48,55,112,.16)}
.cab6Search{border:1px solid rgba(99,102,241,.12);background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(247,248,255,.97));box-shadow:0 24px 60px rgba(52,58,120,.14)}
.cab6EntrySheet{backdrop-filter:blur(18px)}
.cab6EntryHandle{background:linear-gradient(90deg,#818cf8,#22d3ee)!important}
.cab6EntryHeading b{background:linear-gradient(90deg,#111827,#4f46e5);-webkit-background-clip:text;color:transparent}
.cab6Field input,.cab6Field select{border:1px solid #e0e4f2;background:rgba(255,255,255,.96);box-shadow:0 7px 20px rgba(42,51,101,.06)}
.cab6Field.pick input{border-left:6px solid #10b981}.cab6Field.drop input{border-left:6px solid #fb4f72}
.cab6Field input:focus,.cab6Field select:focus{border-color:#818cf8;box-shadow:0 0 0 4px rgba(99,102,241,.10),0 8px 22px rgba(79,70,229,.08)}
.cab6TripType{padding:5px;border:1px solid #e5e7f3;border-radius:19px;background:rgba(244,246,255,.88)}
.cab6TripType button{border:0;background:transparent;border-radius:14px}
.cab6TripType button.on{background:linear-gradient(135deg,#4f46e5,#7c3aed 58%,#2563eb);box-shadow:0 10px 24px rgba(79,70,229,.25)}
.cab6Quick button{border:1px solid #e2e5f1;background:linear-gradient(145deg,#fff,#f8f9ff);box-shadow:0 9px 22px rgba(40,48,95,.07);transition:transform .15s ease,box-shadow .15s ease}
.cab6Quick button:active{transform:scale(.97)}.cab6Quick span{background:linear-gradient(145deg,#eef2ff,#e0e7ff);color:#4f46e5}
.cab6Quick button:nth-child(2) span{background:linear-gradient(145deg,#ecfeff,#cffafe);color:#0891b2}.cab6Quick button:nth-child(3) span{background:linear-gradient(145deg,#faf5ff,#ede9fe);color:#7c3aed}
.cab6AddStop{color:#4f46e5}.cab6Tools button{background:rgba(255,255,255,.92);box-shadow:0 6px 16px rgba(42,51,101,.06)}
.cab6Go,.cab6Book{background:linear-gradient(105deg,#4f46e5 0%,#7c3aed 48%,#2563eb 100%);box-shadow:0 16px 34px rgba(79,70,229,.30);letter-spacing:.1px}
.cab6Sheet,.cab6Confirm{border:1px solid rgba(99,102,241,.12);box-shadow:0 22px 54px rgba(48,55,112,.13)}
.cab6Veh.on{border-color:#6366f1;background:linear-gradient(145deg,#f5f3ff,#eef2ff);box-shadow:0 0 0 2px rgba(99,102,241,.10),0 10px 22px rgba(79,70,229,.10)}
@media(max-width:700px){.cab6Wrap{padding-top:9px}.cab6Search{border-radius:29px}.cab6Top{min-height:60px}.cab6Top button{width:42px;height:42px}}

.cab6Nearby{margin:13px 0 3px}.cab6NearbyHead{display:flex;justify-content:space-between;align-items:end;margin:0 3px 8px}.cab6NearbyHead b{font-size:12px;color:#202947}.cab6NearbyHead small{font-size:8.5px;color:#8a93a8}.cab6NearbyRail{display:flex;gap:9px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none}.cab6NearbyRail::-webkit-scrollbar{display:none}.cab6Place{position:relative;flex:0 0 128px;height:88px;border:0;border-radius:17px;overflow:hidden;padding:0;background:linear-gradient(135deg,#6366f1,#22c1c3);box-shadow:0 9px 22px rgba(40,49,100,.13);text-align:left}.cab6Place img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cab6Place:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 25%,rgba(8,15,38,.82))}.cab6Place span{position:absolute;z-index:2;left:9px;right:8px;bottom:8px;color:#fff;font-size:10px;font-weight:900;text-shadow:0 1px 3px #000}.cab6Place.loading{display:grid;place-items:center;color:#fff;font-size:9px;font-weight:850}.cab6Place.loading:after{display:none}
.cab6Top.cab6IconNav{grid-template-columns:48px 1fr 48px;min-height:58px;padding:6px 16px}.cab6Top.cab6IconNav button{width:44px;height:44px;font-size:0!important}.cab6Top.cab6IconNav button:first-child:after{content:'←';font-size:25px!important}.cab6Top.cab6IconNav button:last-child:after{content:'⌂';font-size:23px!important}.cab6Top.cab6IconNav>div{min-height:1px}
.cab6Top.cab6HeroNav{grid-template-columns:48px 1fr 48px;min-height:78px;padding:8px 16px;background:linear-gradient(105deg,rgba(255,255,255,.96),rgba(246,245,255,.95) 48%,rgba(239,248,255,.96));border-bottom:1px solid rgba(99,102,241,.10)}.cab6HeroCopy{text-align:center;line-height:1.08}.cab6HeroCopy .cab6HeroEyebrow{display:inline-block;margin-bottom:3px;padding:3px 8px;border-radius:999px;background:linear-gradient(90deg,#ede9fe,#e0f2fe);color:#5b4ce6;font-size:7.5px;font-weight:950;letter-spacing:.9px;text-transform:uppercase}.cab6HeroCopy b{display:block;font-size:17px;letter-spacing:-.35px;background:linear-gradient(90deg,#17203d,#6d3df5 55%,#1677ef);-webkit-background-clip:text;color:transparent}.cab6HeroCopy small{display:block;margin-top:4px;color:#8a93a8;font-size:8.5px;font-weight:800}.cab6Top.cab6HeroNav button{background:rgba(255,255,255,.92);border-color:rgba(99,102,241,.14);box-shadow:0 8px 22px rgba(79,70,229,.10)}
.cab6Suggest button b{display:block;font-size:11px;color:#202947}.cab6Suggest button small{display:block;margin-top:3px;color:#8b94a8;font-size:8.5px}.cab6NearbyHead b{font-size:14px}.cab6NearbyRail{gap:11px;padding-bottom:10px}.cab6Place{flex-basis:154px;height:106px;border-radius:19px}.cab6Place span{font-size:11px;bottom:10px}.cab6Nearby{margin-top:16px;margin-bottom:8px}
`;document.head.appendChild(x)}
function header(back){return `<div class="cab6Top cab6IconNav cab6HeroNav"><button type="button" aria-label="Back" title="Back" onclick="${back}">Back</button><div class="cab6HeroCopy"><span class="cab6HeroEyebrow">DBest Cab</span><b>Where to next?</b><small>Smart rides • Local discovery</small></div><button type="button" aria-label="Home" title="Home" onclick="backHome()">Home</button></div>`}
function screen(body,back='backHome()'){css();destroyMap();sectionScreen(`<div class="cab6Page">${header(back)}<div class="cab6Wrap">${body}</div></div>`)}
function destroyMap(){entryMapRun++;try{if(S.map&&S.map.remove)S.map.remove()}catch(e){}try{if(S.entryMap&&S.entryMap.remove)S.entryMap.remove()}catch(e){}S.map=null;S.layer=null;S.entryMap=null}
function minLocal(){const d=new Date(Date.now()+15*60000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function recents(){try{return (JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')||[]).slice(0,4)}catch(e){return[]}}
function saveRecent(v){v=String(v||'').trim();if(!v)return;try{localStorage.setItem(RECENT_KEY,JSON.stringify([v,...recents().filter(x=>x.toLowerCase()!==v.toLowerCase())].slice(0,4)))}catch(e){}}
function renderRecents(){const h=$('cab6Recents');if(!h)return;const a=recents();h.innerHTML=a.length?a.map(v=>`<button type="button" class="cab6Recent" data-r="${esc(v)}">↻ ${esc(v.split(',')[0]||v)}</button>`).join(''):'<div style="font-size:9px;color:#8a92a4;padding:3px 2px">Your recent destinations will appear here.</div>';qa('[data-r]',h).forEach(b=>b.onclick=()=>{const d=$('cab6D');if(d){d.value=b.dataset.r||'';d.dispatchEvent(new Event('input',{bubbles:true}));d.focus()}})}
function nearbyWatchdog(){const rail=$('cab6NearbyRail');if(!rail)return;const current=Number(rail.dataset.nearbyRun||0)+1;rail.dataset.nearbyRun=String(current);setTimeout(()=>{if(!rail.isConnected||Number(rail.dataset.nearbyRun)!==current||!rail.querySelector('.cab6Place.loading'))return;rail.innerHTML='<div style="font-size:12px;color:#687386;padding:12px">Still finding nearby destinations…</div>';},15000)}
function open(){
 S.route=null;
 screen(`<div class="cab6EntryMapWrap"><div id="cab6EntryMap" class="cab6EntryMap"><div class="cab6EntryMapFallback"><div class="cab6EntryMapPin"></div></div></div><div class="cab6EntryMapBadge">Live pickup map</div><button type="button" id="cab6EntryLocate" class="cab6EntryLocate" aria-label="Use current location">◎</button></div><div class="cab6Search cab6EntrySheet"><div class="cab6Spark">✦</div><h1 class="cab6Title">Enter Your Destination</h1><p class="cab6Sub">Choose pickup, destination and ride preference.</p><div class="cab6EntryHandle"></div><div class="cab6EntryHeading"><b>Book Your Ride</b><small>DBest Cab</small></div><div class="cab6Field pick"><input id="cab6P" autocomplete="off" placeholder="My Location / Pickup"><div id="cab6PS" class="cab6Suggest"></div></div><div id="cab6DropWrap" class="cab6Field drop"><input id="cab6D" autocomplete="off" placeholder="Enter destination"><div id="cab6DS" class="cab6Suggest"></div></div><div id="cab6Stops" class="cab6Stops"></div><div class="cab6StopBar"><button type="button" id="cab6AddStop" class="cab6AddStop">＋ Add Stop</button></div><div class="cab6TripType"><button type="button" class="on" data-trip="oneway">One Way</button><button type="button" data-trip="roundtrip">2 Way</button><button type="button" data-trip="carpool">Car Pool</button></div><div id="cab6RoundNote" class="cab6RoundNote"><b>Same vehicle for onward + return</b><br>Sedan ₹15/km • SUV ₹18/km • Tolls extra<br><label><input type="checkbox" id="cab6NightHalt"> Night halt: Sedan ₹1,000 / SUV ₹1,500</label></div><div id="cab6PoolBox" class="cab6PoolBox"><div class="cab6PoolNote"><b>Scheduled shared ride</b><br>Request seats on the same route. Co-passenger mobile numbers stay private.</div><div class="cab6PoolGrid"><div class="cab6Field"><select id="cab6PoolSeats"><option value="1">1 Seat</option><option value="2">2 Seats</option><option value="3">3 Seats</option><option value="4">4 Seats</option><option value="5">5 Seats</option></select></div><div class="cab6Field"><select id="cab6PoolVehicle"><option value="Any">Sedan / SUV</option><option value="Sedan">Sedan</option><option value="SUV">SUV</option></select></div></div><div class="cab6Field"><input id="cab6PoolName" placeholder="Passenger name"></div><div class="cab6Field"><input id="cab6PoolMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div></div><div class="cab6Tools"><button type="button" class="gps" id="cab6Gps">◎ Current location</button><button type="button" id="cab6Swap">⇅</button></div><div id="cab6Nearby" class="cab6Nearby"><div class="cab6NearbyHead"><b>Popular near you</b><small>Based on your pickup area</small></div><div id="cab6NearbyRail" class="cab6NearbyRail"><div class="cab6Place loading">Finding nearby places…</div></div></div><div class="cab6Quick"><button type="button" data-q="schedule"><span>🗓</span>Schedule Later</button><button type="button" data-q="other"><span>👥</span>Book for Someone Else</button><button type="button" data-q="rental"><span>⏱</span>Hourly Rental</button></div><div id="cab6Schedule" class="cab6Extra"><div class="cab6Field"><input id="cab6At" type="datetime-local" min="${minLocal()}"></div></div><div id="cab6Other" class="cab6Extra"><div class="cab6Field"><input id="cab6Name" placeholder="Rider name"></div><div class="cab6Field"><input id="cab6Mobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div></div><div id="cab6Rental" class="cab6Extra"><div class="cab6Field"><select id="cab6RentalPkg"><option value="1|10">1 Hour / 10 km</option><option value="2|20" selected>2 Hours / 20 km</option><option value="4|40">4 Hours / 40 km</option><option value="8|80">8 Hours / 80 km</option><option value="12|120">12 Hours / 120 km</option></select></div></div><button type="button" id="cab6Go" class="cab6Go">Search Cabs</button></div>`);
 bindSearchPage();nearbyWatchdog();initSearchProvider().catch(()=>{});$('cab6EntryLocate').onclick=()=>useGps(true);renderEntryMap();useGps(false);
}
function bindSearchPage(){
 renderRecents();const addStop=$('cab6AddStop');if(addStop)addStop.onclick=()=>{const list=$('cab6Stops'),count=list?.querySelectorAll('.cab6StopRow').length||0;if(count>=3)return say('Maximum 3 stops allowed.');const row=document.createElement('div');row.className='cab6StopRow';row.innerHTML='<div class="cab6Field"><input class="cab6StopInput" autocomplete="off" placeholder="Enter stop '+(count+1)+'"></div><button type="button" class="cab6StopRemove" aria-label="Remove stop">✕</button>';row.querySelector('.cab6StopRemove').onclick=()=>row.remove();list.appendChild(row)};qa('[data-trip]').forEach(btn=>btn.onclick=()=>{qa('[data-trip]').forEach(x=>x.classList.toggle('on',x===btn));S.tripType=btn.dataset.trip||'oneway';const round=S.tripType==='roundtrip',pool=S.tripType==='carpool';$('cab6RoundNote')?.classList.toggle('show',round);$('cab6PoolBox')?.classList.toggle('show',pool);if(round)S.selected='sedan';if(pool){S.mode='ride';S.schedule='later';if($('cab6Go'))$('cab6Go').textContent='Find / Create Pool';const sch=q('[data-q="schedule"]');if(sch)sch.classList.add('on');$('cab6Schedule')?.classList.add('show');if($('cab6Stops'))$('cab6Stops').innerHTML='';if($('cab6AddStop'))$('cab6AddStop').parentElement.style.display='none'}else{if($('cab6Go'))$('cab6Go').textContent='Search Cabs';if($('cab6AddStop'))$('cab6AddStop').parentElement.style.display='';}});const nh=$('cab6NightHalt');if(nh)nh.onchange=e=>S.nightHalt=!!e.target.checked;$('cab6Gps').onclick=()=>useGps(true);$('cab6Swap').onclick=()=>{const a=$('cab6P').value;$('cab6P').value=$('cab6D').value;$('cab6D').value=a;const t=S.p;S.p=S.d;S.d=t};
 qa('[data-q]').forEach(b=>b.onclick=()=>{const k=b.dataset.q;if(k==='schedule'){S.schedule=S.schedule==='later'?'now':'later';b.classList.toggle('on',S.schedule==='later');$('cab6Schedule').classList.toggle('show',S.schedule==='later')}else if(k==='other'){S.rider=S.rider==='other'?'self':'other';b.classList.toggle('on',S.rider==='other');$('cab6Other').classList.toggle('show',S.rider==='other')}else{S.mode=S.mode==='rental'?'ride':'rental';b.classList.toggle('on',S.mode==='rental');$('cab6Rental').classList.toggle('show',S.mode==='rental');$('cab6DropWrap').style.display=S.mode==='rental'?'none':'';if($('cab6Stops'))$('cab6Stops').style.display=S.mode==='rental'?'none':'';if($('cab6AddStop'))$('cab6AddStop').parentElement.style.display=S.mode==='rental'?'none':''}});
 $('cab6At').onchange=e=>S.scheduledAt=e.target.value;$('cab6Name').oninput=e=>S.riderName=e.target.value.trim();$('cab6Mobile').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);S.riderMobile=e.target.value};$('cab6RentalPkg').onchange=e=>{const[h,k]=e.target.value.split('|').map(Number);S.rentalHours=h;S.rentalKm=k};$('cab6PoolSeats').onchange=e=>S.carpoolSeats=Number(e.target.value||1);$('cab6PoolVehicle').onchange=e=>S.carpoolVehicle=e.target.value||'Any';$('cab6PoolName').oninput=e=>S.carpoolName=e.target.value.trim();$('cab6PoolMobile').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);S.carpoolMobile=e.target.value};$('cab6Go').onclick=continueRide;bindSearch('cab6P','cab6PS','p');bindSearch('cab6D','cab6DS','d')
}
let searchProviderPromise=null,leafletPromise=null,entryMapRun=0;
function loadScript(src,id){return new Promise((ok,no)=>{const old=$(id);if(old){if(old.dataset.ready==='1')return ok();old.addEventListener('load',ok,{once:true});old.addEventListener('error',no,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=()=>{s.dataset.ready='1';ok()};s.onerror=no;document.head.appendChild(s)})}
function loadCss(href,id){if($(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
async function waitGoogleKey(ms=2200){const end=Date.now()+ms;while(Date.now()<end){const k=String(cfg().googleMapsApiKey||'').trim();if(k)return k;await new Promise(r=>setTimeout(r,120))}return String(cfg().googleMapsApiKey||'').trim()}
async function initSearchProvider(){
 if(searchProviderPromise)return searchProviderPromise;
 searchProviderPromise=(async()=>{const k=await waitGoogleKey();if(k){try{if(!window.google?.maps)await loadScript('https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(k)+'&libraries=places&v=weekly','cab6-google');if(window.google?.maps){S.provider='google';return}}catch(e){console.warn('DBest Google Places unavailable',e)}}S.provider=String(cfg().supabaseUrl||'').trim()?'supabase':'osm'})();return searchProviderPromise
}
async function initLeaflet(){
 if(window.L)return window.L;if(leafletPromise)return leafletPromise;
 leafletPromise=(async()=>{
   loadCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css','cab6-leaflet-css');
   for(const [id,url] of [
     ['cab6-leaflet-cdn1','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'],
     ['cab6-leaflet-cdn2','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js']
   ]){
     try{await Promise.race([loadScript(url,id),new Promise((_,reject)=>setTimeout(()=>reject(Error('Leaflet timeout')),4500))]);if(window.L)return window.L}
     catch(e){console.warn('DBest map CDN fallback',e)}
   }
   throw Error('Map renderer unavailable');
 })().catch(e=>{leafletPromise=null;throw e});
 return leafletPromise
}
async function reverseGoogle(lat,lng){
 try{
  await Promise.race([initSearchProvider(),new Promise(resolve=>setTimeout(resolve,2500))]);
  if(!window.google?.maps?.Geocoder)return '';
  return await new Promise(resolve=>{
   const timer=setTimeout(()=>resolve(''),6500);
   new google.maps.Geocoder().geocode({location:{lat,lng}},(rows,status)=>{
    clearTimeout(timer);resolve(status==='OK'&&rows?.[0]?.formatted_address?rows[0].formatted_address:'');
   });
  });
 }catch(e){console.warn('Pickup Google reverse geocode failed',e);return ''}
}
async function reverseNominatim(lat,lng){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
 try{
  const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng),{headers:{Accept:'application/json'},signal:controller.signal});
  if(!r.ok)return '';
  const j=await r.json();return String(j.display_name||'').trim();
 }catch(e){console.warn('Pickup OSM reverse geocode failed',e);return ''}finally{clearTimeout(timer)}
}
function placePhotoUrl(lat,lng,name){return 'https://maps.googleapis.com/maps/api/streetview?size=360x220&location='+encodeURIComponent(lat+','+lng)+'&fov=80&pitch=0&key='+encodeURIComponent(googleKey())}
/* Photo overlays are attached to the matching Google Place, never a generic image. */
const CAB_PUBLIC_TYPES=['train_station','transit_station','bus_station','bus_stop','airport','hospital','university','college','school','shopping_mall','supermarket','market','park','tourist_attraction','museum','stadium','government_office','city_hall'];
const CAB_PUBLIC_NAME=/\b(station|railway|airport|airstrip|hospital|medical|clinic|college|university|school|campus|mall|market|bazaar|park|garden|museum|stadium|bus stand|bus stop|terminal|tourist|temple|mandir|fort|zoo|shopping|government|court|district|police|bank|post office)\b/i;
function cabPublicPlace(name,types){
 const n=String(name||'').trim();if(!n||/^(home|house|residence|private|my home|address|plot|flat|room)\b/i.test(n)||/\b(pharmacy|chemist|medical (store|shop)|medicine shop|drugstore)\b/i.test(n)||/^(hospital|railway station|bus station|bus stand|college|park|airport|clinic|medical|unknown)$/i.test(n))return false;
 return (types||[]).some(t=>CAB_PUBLIC_TYPES.includes(t))||CAB_PUBLIC_NAME.test(n);
}
function cabPlacePriority(p){
 const t=(p.types||[]).map(x=>String(x).toLowerCase()),n=String(p.name||'').toLowerCase();
 if(t.includes('hospital')||/hospital|medical college hospital|clinic|nursing home/.test(n))return 0;
 if(t.includes('train_station')||/railway station|rail station|junction/.test(n))return 1;
 if(t.some(x=>['bus_station','bus_stop'].includes(x))||/bus stand|bus station|bus terminal|bus depot/.test(n))return 2;
 if(t.includes('airport')||/airport|airstrip|aerodrome/.test(n))return 3;
 if(t.some(x=>['university','college'].includes(x))||/college|university|campus/.test(n))return 4;
 if(t.includes('park')||/park|garden/.test(n))return 5;
 return 6;
}
async function loadNearbyPlaces(lat,lng){
 const rail=$('cab6NearbyRail');if(!rail)return;
 if(!Number.isFinite(lat)||!Number.isFinite(lng)){rail.textContent='Select a pickup location to see nearby places.';return}
 const requestId=String(Date.now())+'-'+Math.random();rail.dataset.requestId=requestId;
 let hasRenderedPlaces=false;const render=rows=>{if(!rail.isConnected||rail.dataset.requestId!==requestId)return;if(rows.length&&hasRenderedPlaces)return;if(rows.length)hasRenderedPlaces=true;
  const distance=p=>Math.hypot((p.lat-lat)*111.2,(p.lng-lng)*111.2*Math.cos(lat*Math.PI/180));rows=[...rows].filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&distance(p)<=15&&cabPublicPlace(p.name,p.types||[])).sort((a,b)=>cabPlacePriority(a)-cabPlacePriority(b)||distance(a)-distance(b));
  if(!rows.length){rail.innerHTML='<div style="padding:12px;color:#687386;font-size:12px">Nearby places are unavailable right now. You can enter a destination above.</div>';return}
  rail.innerHTML=rows.slice(0,8).map(p=>'<button type="button" class="cab6Place" data-place="'+esc(p.name)+'" data-lat="'+p.lat+'" data-lng="'+p.lng+'">'+(p.photo?'<img class="cab6PlacePhoto" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;z-index:0" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.cab6PhotoCredit\')?.remove()" src="'+esc(p.photo)+'">':'<span aria-hidden="true" style="position:absolute;top:13px;left:13px;z-index:2;font-size:24px">'+(cabPlacePriority(p)===0?'🏥':cabPlacePriority(p)===1?'🚉':cabPlacePriority(p)===2?'🚌':cabPlacePriority(p)===3?'✈️':cabPlacePriority(p)===4?'🎓':cabPlacePriority(p)===5?'🌳':'📍')+'</span>')+'<span style="position:absolute;bottom:12px;left:12px;right:8px;z-index:2;color:white;font-weight:700;text-shadow:0 1px 4px #000">'+esc(p.name)+'</span>'+(p.attribution?'<small class="cab6PhotoCredit" style="position:absolute;top:6px;right:6px;left:6px;z-index:2;font-size:9px;color:white;text-align:right;text-shadow:0 1px 4px #000;pointer-events:none">Photo: '+esc(p.attribution)+'</small>':'')+'</button>').join('');
  qa('.cab6Place',rail).forEach(btn=>btn.onclick=()=>{const d=$('cab6D');if(!d)return;d.value=btn.dataset.place;S.d={label:d.value,lat:Number(btn.dataset.lat),lng:Number(btn.dataset.lng)};$('cab6DS')?.classList.remove('show')});
 };
 const browserGoogleNearby=async()=>{
  await initSearchProvider();
  if(!window.google?.maps?.importLibrary)throw Error('Google Maps JavaScript not loaded');
  const {Place,SearchNearbyRankPreference}=await google.maps.importLibrary('places');
  const seen=new Set(),all=[];
  const add=places=>{for(const p of places||[]){
   const name=String(p.displayName||'').trim();
   const plat=Number(typeof p.location?.lat==='function'?p.location.lat():p.location?.lat);
   const plng=Number(typeof p.location?.lng==='function'?p.location.lng():p.location?.lng);
   const key=name.toLowerCase();
   if(!cabPublicPlace(name,[p.primaryType,...(p.types||[])])||seen.has(key)||!Number.isFinite(plat)||!Number.isFinite(plng))continue;
   const photo=p.photos?.[0];let photoUrl='';try{if(photo?.getURI)photoUrl=photo.getURI({maxWidth:480,maxHeight:320})}catch(e){}const attribution=(photo?.authorAttributions||[]).map(a=>a.displayName).filter(Boolean).join(', ');seen.add(key);all.push({name,lat:plat,lng:plng,types:[p.primaryType,...(p.types||[])],photo:photoUrl,attribution});
  }};
  let lastError;
  for(const radius of [12000]){
   try{
    const result=await Place.searchNearby({fields:['displayName','location','primaryType','types','photos'],includedTypes:['train_station','bus_station','airport','hospital','university','school','shopping_mall','park','tourist_attraction'],locationRestriction:{center:{lat,lng},radius},maxResultCount:20,rankPreference:SearchNearbyRankPreference.DISTANCE});
    add(result.places);
    if(all.length>=18)break;
   }catch(e){lastError=e;console.warn('DBest Places radius '+radius+'m failed',e);break}
  }
  if(all.length<5&&typeof Place.searchByText==='function'){
   for(const query of ['railway station bus station airport hospital','college university shopping mall park garden']){
    try{
     const result=await Place.searchByText({textQuery:query,fields:['displayName','location','primaryType','types','photos'],locationRestriction:{center:{lat,lng},radius:25000},maxResultCount:12});
     add(result.places);
     if(all.length>=8)break;
    }catch(e){lastError=e;console.warn('DBest Places text fallback failed',e)}
   }
  }
  if(!all.length&&lastError)throw lastError;
  const dist=p=>{const dy=(p.lat-lat)*111.2,dx=(p.lng-lng)*111.2*Math.cos(lat*Math.PI/180);return Math.hypot(dx,dy)};
  return all.filter(p=>dist(p)<=50).sort((a,b)=>cabPlacePriority(a)-cabPlacePriority(b)||dist(a)-dist(b)).slice(0,20);
 };
 const timer=setTimeout(()=>{if(rail.isConnected&&rail.dataset.requestId===requestId&&!rail.querySelector('.cab6Place:not(.loading)')){rail.innerHTML='<div style="font-size:12px;color:#687386;padding:12px">Nearby search is taking longer than expected.</div>'}},30000);
 try{
  let nearbyFailure='';
 const googlePromise=browserGoogleNearby().then(rows=>{if(rows.length){render(rows);return true}nearbyFailure='Google returned no places';return false}).catch(e=>{nearbyFailure=String(e?.message||e||'Google Places error').slice(0,140);console.warn('DBest browser Places failed',e);return false});
  const serverPromise=(async()=>{
   const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch('/api/runtime-config?mode=nearby&lat='+encodeURIComponent(lat)+'&lng='+encodeURIComponent(lng),{signal:controller.signal});
    if(!response.ok)throw Error('Nearby server HTTP '+response.status);
    const data=await response.json();const rows=(data.places||[]).filter(p=>cabPublicPlace(p.name,p.types||[])&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
    if(rows.length){render(rows);return true}return false;
   }catch(e){console.warn('DBest nearby server failed',e);return false}
   finally{clearTimeout(abort)}
  })();
  const outcomes=await Promise.all([googlePromise,serverPromise]);
  if(!outcomes.some(Boolean)){render([]);if(rail.isConnected&&rail.dataset.requestId===requestId){const retry=document.createElement('button');retry.type='button';retry.className='cab6RetryNearby';retry.textContent='↻ Retry nearby places';retry.style.cssText='background:#edf3ff;border:1px solid #c6d8fa;border-radius:12px;padding:12px;color:#3157a8;font-size:12px;font-weight:750';retry.onclick=()=>loadNearbyPlaces(lat,lng);rail.appendChild(retry)}}
 }finally{clearTimeout(timer)}
}
async function useGps(noisy){
 const input=$('cab6P');
 if(!navigator.geolocation){if(noisy)say('Location is not supported on this device.');return}
 navigator.geolocation.getCurrentPosition(async p=>{
  const lat=p.coords.latitude,lng=p.coords.longitude;
  const fallback='Current location ('+lat.toFixed(5)+', '+lng.toFixed(5)+')';
  S.p={lat,lng,label:fallback};
  if(input&&input.isConnected&&!input.value.trim())input.value=fallback;
  loadNearbyPlaces(lat,lng).catch(e=>console.warn('Nearby lookup failed',e));
  renderEntryMap();
  try{
   const googleLookup=reverseGoogle(lat,lng);
   const osmLookup=reverseNominatim(lat,lng);
   let label=await Promise.race([Promise.any([googleLookup,osmLookup].map(p=>p.then(v=>{if(!v)throw Error('No address');return v}))).catch(()=>''),new Promise(resolve=>setTimeout(()=>resolve(''),9000))]);
   if(!label)label=fallback;
   if(S.p&&S.p.lat===lat&&S.p.lng===lng){
    S.p.label=label;
    if(input&&input.isConnected&&(input.value===fallback||!input.value.trim()))input.value=label;
   }
  }catch(e){console.warn('Pickup reverse geocoding failed',e)}
 },e=>{if(noisy)say('Please allow location access or enter pickup manually.');console.warn('DBest pickup GPS unavailable',e?.code)},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
}
async function renderEntryMap(){
 const el=$('cab6EntryMap');if(!el)return;
 const thisRun=++entryMapRun;
 let pos=null;
 if(S.p&&Number.isFinite(S.p.lat)&&Number.isFinite(S.p.lng))pos={lat:S.p.lat,lng:S.p.lng};
 if(!pos){const txt=String($('cab6P')?.value||'').trim();if(txt.length>=3){try{const p=await Promise.race([geocodeText(txt),new Promise(r=>setTimeout(()=>r(null),2500))]);if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)){S.p=p;pos={lat:p.lat,lng:p.lng};loadNearbyPlaces(p.lat,p.lng).catch(e=>console.warn('Nearby lookup failed',e))}}catch(e){}}}
 if(!pos){try{pos=await new Promise(resolve=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(null),{enableHighAccuracy:false,timeout:2500,maximumAge:60000}):resolve(null))}catch(e){}}
 if(!pos)return;
 try{
   const L=await initLeaflet();if(thisRun!==entryMapRun||$('cab6EntryMap')!==el)return;
   if(S.entryMap&&S.entryMap.getContainer?.()===el){S.entryMap.setView([pos.lat,pos.lng],14);return}
   try{S.entryMap?.remove?.()}catch(e){}
   S.entryMap=null;
   el.innerHTML='';S.entryMap=L.map(el,{zoomControl:false,attributionControl:true,preferCanvas:true}).setView([pos.lat,pos.lng],14);
   const thisMap=S.entryMap;let loadedTiles=0,usedBackup=false;
   const visual=document.createElement('div');visual.className='cab6EntryMapFallback';
   visual.style.cssText='z-index:440;pointer-events:none;display:grid;place-items:center;color:#284575;background:linear-gradient(130deg,#e1effe,#f3f6ff)';
   visual.innerHTML='<div class="cab6EntryMapPin"></div><strong style="position:absolute;bottom:40%;font-size:12px">Loading your pickup map…</strong>';
   el.appendChild(visual);
   const status=document.createElement('div');status.className='cab6TileStatus';status.setAttribute('role','status');
   status.style.cssText='display:none;position:absolute;z-index:450;inset:auto 12px 12px;background:#fff;color:#24304e;border-radius:14px;padding:10px 12px;font-size:12px;box-shadow:0 6px 22px #0002';
   status.textContent='Map tiles are temporarily unavailable. Pickup location is still saved.';
   el.appendChild(status);
   const attachTiles=(url,attribution)=>L.tileLayer(url,{maxZoom:19,attribution}).on('tileload',()=>{loadedTiles++;status.style.display='none';visual.remove()}).addTo(thisMap);
   let tiles=attachTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png','© OpenStreetMap contributors');
   setTimeout(()=>{if(S.entryMap!==thisMap||!el.isConnected||loadedTiles)return;usedBackup=true;thisMap.removeLayer(tiles);tiles=attachTiles('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png','© OpenStreetMap contributors · © CARTO')},3200);
   setTimeout(()=>{if(S.entryMap===thisMap&&el.isConnected&&!loadedTiles&&usedBackup)status.style.display='block'},6800);
   L.circleMarker([pos.lat,pos.lng],{radius:8,weight:4,color:'#fff',fillColor:'#2362ee',fillOpacity:1}).addTo(S.entryMap);
   setTimeout(()=>S.entryMap?.invalidateSize?.(),100);
 }catch(e){console.warn('Entry map failed',e);const w=$('cab6EntryMap');if(w&&!w.querySelector('.cab6EntryMapFallback'))w.innerHTML='<div class="cab6EntryMapFallback"><div class="cab6EntryMapPin"></div><strong style="position:absolute;bottom:26%;font-size:12px;color:#334b76">Map temporarily unavailable. Your pickup location is saved.</strong></div>'}
}
const LOCAL_PLACE_RADIUS_KM=250;
function cabPlaceDistanceKm(a,b){
 if(!a||!b||!Number.isFinite(+a.lat)||!Number.isFinite(+a.lng)||!Number.isFinite(+b.lat)||!Number.isFinite(+b.lng))return Infinity;
 const rad=Math.PI/180,dLat=(+b.lat-+a.lat)*rad,dLng=(+b.lng-+a.lng)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(+a.lat*rad)*Math.cos(+b.lat*rad)*Math.sin(dLng/2)**2;
 return 12742*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)))
}
function cabFilterIndianResults(rows){
 const pickup=S.p&&Number.isFinite(+S.p.lat)&&Number.isFinite(+S.p.lng)?S.p:null;
 const seen=new Set();
 return (rows||[]).filter(x=>{
  const lat=Number(x.lat),lng=Number(x.lng);
  if(!x.label||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<6||lat>37.5||lng<68||lng>97.5)return false;
  // Photon is global despite lat/lon bias. Require explicit India country evidence.
  const country=String(x.country||'').trim(),detail=String(x.detail||'').trim();
  if(country&&country.toLowerCase()!=='india')return false;
  if(x.source==='photon'&&country.toLowerCase()!=='india'&&!/(?:^|,)\s*India\s*$/i.test(detail))return false;
  if(/(?:^|,)\s*(Germany|Pakistan|Bangladesh|Nepal|Myanmar|Sri Lanka|China|Bhutan)\s*$/i.test(detail))return false;
  const key=lat.toFixed(4)+','+lng.toFixed(4);
  if(seen.has(key))return false;seen.add(key);return true
 }).map(x=>({...x,distanceKm:pickup?cabPlaceDistanceKm(pickup,x):Infinity}))
 .sort((a,b)=>a.distanceKm-b.distanceKm)
}
async function searchLocations(term){
 if(term.length<2)return[];
 const pickup=S.p&&Number.isFinite(+S.p.lat)&&Number.isFinite(+S.p.lng)?S.p:null;
 // Restore the proven 5 October order: India-restricted Google Places FIRST,
 // geographically biased toward pickup. This must not be preceded by the
 // unfiltered global Photon backend, which returned Germany for Etwari Bazar.
 await Promise.race([initSearchProvider(),new Promise(resolve=>setTimeout(resolve,2400))]);
 if(S.provider==='google'&&window.google?.maps?.places){
  try{
   const origin=pickup&&window.google.maps.LatLng?new google.maps.LatLng(+pickup.lat,+pickup.lng):null;
   const predictions=await Promise.race([new Promise(resolve=>{
    const req={input:term,componentRestrictions:{country:'in'}};
    if(origin){req.location=origin;req.radius=50000;req.origin=origin}
    new google.maps.places.AutocompleteService().getPlacePredictions(req,(rows,status)=>{
     const good=status===google.maps.places.PlacesServiceStatus.OK?(rows||[]):[];
     resolve(good.map(x=>({label:x.description,placeId:x.place_id,distanceMeters:Number(x.distance_meters||0)})).sort((a,b)=>{
      const aDist=a.distanceMeters>0?a.distanceMeters:Infinity,bDist=b.distanceMeters>0?b.distanceMeters:Infinity;
      return aDist-bDist
     }).slice(0,8))
    })
   }),new Promise(resolve=>setTimeout(()=>resolve([]),2800))]);
   if(predictions.length)return predictions
  }catch(e){console.warn('Cab Google autocomplete fallback',e)}
 }
 const base=String(cfg().supabaseUrl||'').replace(/\/$/,''),key=String(cfg().supabasePublishableKey||cfg().supabaseAnonKey||'');
 if(base){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4200);
  try{
   const r=await fetch(base+'/functions/v1/location-search-live',{
    method:'POST',headers:{'content-type':'application/json',apikey:key},
    body:JSON.stringify({q:term,...(pickup?{lat:+pickup.lat,lon:+pickup.lng}:{})}),signal:controller.signal
   });
   if(r.ok){
    const j=await r.json();
    const rows=(j.results||[]).map(x=>({
     label:String(x.label||x.detail||''),lat:Number(x.lat),lng:Number(x.lon??x.lng),
     country:x.country||'',detail:String(x.detail||''),source:x.source||'backend'
    }));
    const indian=cabFilterIndianResults(rows);
    if(indian.length)return indian.slice(0,8)
   }
  }catch(e){console.warn('Cab location backend fallback',e)}
  finally{clearTimeout(timeout)}
 }
 try{
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),3000);
  const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=12&q='+encodeURIComponent(term),{headers:{Accept:'application/json'},signal:ctl.signal});
  clearTimeout(timeout);
  const j=await r.json();
  return cabFilterIndianResults((j||[]).map(x=>({label:x.display_name,lat:Number(x.lat),lng:Number(x.lon),country:x.address?.country||'India',source:'nominatim'}))).slice(0,8)
 }catch(e){return[]}
}
async function resolvePlace(x){if(x?.lat!=null)return x;if(S.provider==='google'&&x?.placeId){return await new Promise(resolve=>{const svc=new google.maps.places.PlacesService(document.createElement('div'));svc.getDetails({placeId:x.placeId,fields:['geometry','formatted_address','name']},(p,status)=>{if(status===google.maps.places.PlacesServiceStatus.OK&&p.geometry?.location)resolve({label:p.formatted_address||p.name||x.label,lat:p.geometry.location.lat(),lng:p.geometry.location.lng()});else resolve(null)})})}return null}
async function geocodeText(v){v=String(v||'').trim();if(v.length<3)return null;await initSearchProvider();if(S.provider==='google'&&window.google?.maps?.Geocoder){try{return await new Promise(resolve=>new google.maps.Geocoder().geocode({address:v,componentRestrictions:{country:'IN'}},(rows,status)=>{const r=rows?.[0],l=r?.geometry?.location;resolve(status==='OK'&&l?{label:r.formatted_address||v,lat:l.lat(),lng:l.lng()}:null)}))}catch(e){}}const a=await searchLocations(v);return a[0]?resolvePlace(a[0]):null}
async function openCabMapPinPicker(kind,typed){
 const pickup=S.p&&Number.isFinite(+S.p.lat)&&Number.isFinite(+S.p.lng)?S.p:null;
 if(!pickup)return say('Set your pickup first, then select the destination on the map.');
 document.getElementById('cab6PinPicker')?.remove();
 const overlay=document.createElement('div');overlay.id='cab6PinPicker';
 overlay.style.cssText='position:fixed;inset:0;z-index:999999;background:#101b30c9;display:flex;align-items:center;justify-content:center;padding:12px';
 overlay.innerHTML='<div style="width:min(100%,560px);background:#fff;border-radius:20px;padding:14px;color:#172033;box-shadow:0 20px 60px #0005"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px"><strong style="font-size:16px">📍 Select destination on map</strong><button type="button" id="cab6PinClose" style="border:0;background:#eef1f7;padding:9px 12px;border-radius:10px">✕</button></div><p style="font-size:12px;margin:0 0 10px;color:#536175">Tap the exact destination near your pickup. Zoom or move the map if needed.</p><div id="cab6PinMap" style="height:min(57vh,390px);border-radius:13px;overflow:hidden;background:#e9f1fa"></div><div id="cab6PinChoice" style="font-size:12px;margin:11px 0">Move the pin to the destination.</div><button type="button" id="cab6PinConfirm" style="width:100%;border:0;border-radius:12px;padding:13px;background:#234ee5;color:#fff;font-weight:800">Use this destination</button></div>';
 document.body.appendChild(overlay);
 const close=()=>{try{pinMap?.remove()}catch(e){}overlay.remove()};
 let pinMap=null,point={lat:+pickup.lat,lng:+pickup.lng};
 overlay.querySelector('#cab6PinClose').onclick=close;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 try{
  const L=await initLeaflet();if(!overlay.isConnected)return;
  pinMap=L.map('cab6PinMap',{zoomControl:true}).setView([point.lat,point.lng],15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(pinMap);
  const marker=L.marker([point.lat,point.lng],{draggable:true}).addTo(pinMap);
  const update=p=>{
   point={lat:p.lat,lng:p.lng};marker.setLatLng([point.lat,point.lng]);
   overlay.querySelector('#cab6PinChoice').textContent='Selected: '+point.lat.toFixed(5)+', '+point.lng.toFixed(5)
  };
  pinMap.on('click',e=>update(e.latlng));marker.on('dragend',()=>update(marker.getLatLng()));
  setTimeout(()=>pinMap?.invalidateSize(),90);
  overlay.querySelector('#cab6PinConfirm').onclick=async()=>{
   const button=overlay.querySelector('#cab6PinConfirm');button.disabled=true;button.textContent='Saving selected destination…';
   const label=await Promise.race([reverseGoogle(point.lat,point.lng).catch(()=>''),new Promise(resolve=>setTimeout(()=>resolve(''),3000))])||'Map pin ('+point.lat.toFixed(5)+', '+point.lng.toFixed(5)+'), Jharkhand';
   S[kind]={lat:point.lat,lng:point.lng,label};
   const inp=$(kind==='d'?'cab6D':'cab6P');if(inp)inp.value=label;
   $(kind==='d'?'cab6DS':'cab6PS')?.classList.remove('show');
   close();
  }
 }catch(e){
  console.warn('Cab map pin picker unavailable',e);
  overlay.querySelector('#cab6PinChoice').textContent='Map could not load. Please try again or enter a nearby landmark.';
  overlay.querySelector('#cab6PinConfirm').disabled=true
 }
}
function bindSearch(i,b,k){
 const inp=$(i),box=$(b);let timer=0,seq=0;
 inp.oninput=()=>{
  clearTimeout(timer);S[k]=null;
  const term=inp.value.trim(),n=++seq;
  if(term.length<2){box.classList.remove('show');box.innerHTML='';return}
  if(k==='d'){
   box.innerHTML='<div role="status" style="padding:10px 12px;color:#536175;font-size:12px">Finding destinations near your pickup…</div><button type="button" data-map-pin="1" style="font-weight:850;color:#1749bf;background:#f0f5ff">📍 Destination not listed? Pin it on the map</button>';
   box.classList.add('show');
   box.querySelector('[data-map-pin]').onclick=()=>openCabMapPinPicker(k,term)
  }
  timer=setTimeout(async()=>{
   const rows=await searchLocations(term);if(n!==seq)return;
   const buttons=rows.map((x,j)=>'<button type="button" data-i="'+j+'"><b>'+esc(String(x.label||'Location').split(',')[0])+'</b><small>'+esc(String(x.label||'').split(',').slice(1,3).join(','))+'</small></button>').join('');
   const fallback=k==='d'?'<button type="button" data-map-pin="1" style="font-weight:850;color:#1749bf;background:#f0f5ff">📍 Destination not listed? Pin it on the map</button>':'';
   box.innerHTML=(buttons||'<div role="status" style="padding:13px;color:#64748b;font-size:12px">No matching Indian location found. Try a landmark or select on map.</div>')+fallback;
   box.classList.add('show');
   qa('button[data-i]',box).forEach(btn=>btn.onclick=async()=>{
    const p=await resolvePlace(rows[+btn.dataset.i]);
    if(!p)return say('Could not resolve this location.');
    S[k]=p;inp.value=p.label;box.classList.remove('show');
    if(k==='p'){loadNearbyPlaces(p.lat,p.lng).catch(e=>console.warn('Nearby lookup failed',e));renderEntryMap()}
   });
   const pin=box.querySelector('[data-map-pin]');if(pin)pin.onclick=()=>openCabMapPinPicker(k,term)
  },240)
 };
 inp.onblur=()=>setTimeout(()=>box.classList.remove('show'),180)
}
function realisticRoadMinutes(km,providerMin){
 const k=Math.max(0,Number(km)||0),raw=Math.max(1,Number(providerMin)||1);
 // DBest ETA sanity floor: provider ETA is respected when higher, but never allow
 // implausibly fast road time. Speed bands reflect normal Indian road conditions.
 const avgKmph=k<=10?27:k<=30?32:k<=80?40:48;
 const floor=Math.max(2,Math.ceil((k/avgKmph)*60));
 return Math.max(Math.round(raw),floor)
}
async function routeOSRM(){const pts=[S.p,...(S.stops||[]),S.d].filter(Boolean),coords=pts.map(x=>`${x.lng},${x.lat}`).join(';');const u=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;const r=await fetch(u,{cache:'no-store'}),j=await r.json(),x=j.routes?.[0];if(!x)throw new Error('No route');const km=x.distance/1000,providerMin=Math.max(1,Math.round(x.duration/60));return{km,min:realisticRoadMinutes(km,providerMin),providerMin,geo:x.geometry?.coordinates||[]}}
async function continueRide(){
 if(S.tripType==='carpool'){S.schedule='later';if(!S.scheduledAt)return say('Please select Car Pool date and time.');if(!S.carpoolName||S.carpoolMobile.length!==10)return say('Please enter passenger name and 10-digit mobile.');if(S.carpoolVehicle==='Sedan'&&S.carpoolSeats>3)return say('Sedan Car Pool supports up to 3 passenger seats.');}
 if(S.schedule==='later'&&!S.scheduledAt)return say('Please select schedule date and time.');if(S.rider==='other'&&(!S.riderName||S.riderMobile.length!==10))return say('Please enter rider name and 10-digit mobile.');
 const b=$('cab6Go');if(b){b.disabled=true;b.textContent='Checking route…'}
 try{if(!S.p)S.p=await geocodeText($('cab6P')?.value);if(S.mode!=='rental'&&!S.d)S.d=await geocodeText($('cab6D')?.value);if(S.mode!=='rental'){const stopTexts=qa('.cab6StopInput').map(x=>String(x.value||'').trim()).filter(Boolean).slice(0,3);S.stops=[];for(const t of stopTexts){const p=await geocodeText(t);if(!p)return say('Please enter a valid stop location.');S.stops.push(p)}}if(!S.p||S.mode!=='rental'&&!S.d)return say(S.mode==='rental'?'Please enter a valid pickup location.':'Please enter valid pickup and destination.');if(S.mode==='rental'){S.route={km:S.rentalKm,min:S.rentalHours*60,geo:[]};return vehicles()}S.route=await routeOSRM();saveRecent(S.d?.label||$('cab6D')?.value);if(S.tripType==='carpool')return createCarpoolRequest();vehicles()}catch(e){console.warn('Cab route error',e);say('Unable to calculate the route. Please try again.')}finally{if(b){b.disabled=false;b.textContent=S.tripType==='carpool'?'Find / Create Pool':'Search Cabs'}}
}
async function carpoolApi(action,extra={}){
 const base=String(cfg().supabaseUrl||'').replace(/\/$/,'');
 const key=String(cfg().supabasePublishableKey||'');
 if(!base||!key)throw new Error('service_unavailable');
 const res=await fetch(base+'/functions/v1/carpool-live',{method:'POST',cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
 const d=await res.json().catch(()=>({}));if(!res.ok)throw new Error(d.error||'carpool_request_failed');return d
}
function poolStatusScreen(d,mobile){
 const pool=d.pool||{},req=d.request||{},job=d.job||{},driver=d.driver||{},poolStatus=d.poolStatus||pool.status||'Forming';
 const perSeat=Number(d.perSeatFare??req.seat_fare??pool.per_seat_fare??0);
 const seats=Number(d.seatsRequested??req.seats_requested??S.carpoolSeats??1);
 const total=Number(d.totalAmount??(perSeat*seats));
 const held=Number(d.heldSeats??pool.held_seats??seats),confirmed=Number(d.confirmedSeats??pool.confirmed_seats??0);
 const totalSeats=Number(d.totalSeats??pool.total_seats??(String(d.vehicleType||pool.vehicle_type)==='SUV'?5:3));
 const minReady=Number(d.minimumConfirmedSeats??(String(d.vehicleType||pool.vehicle_type)==='SUV'?3:2));
 const id=String(d.id||req.id||S.carpoolRequestId||''),vehicle=String(d.vehicleType||pool.vehicle_type||S.carpoolVehicle||'');
 const scheduled=d.scheduledAt||pool.scheduled_at||req.scheduled_at||S.scheduledAt,dt=new Date(scheduled),time=Number.isFinite(dt.getTime())?dt.toLocaleString():String(scheduled||'');
 const paid=String(req.payment_status||d.paymentStatus||'')==='Paid'||d.carpoolPaymentVerified===true;
 const ready=['Ready','Assigned','In Progress','Completed'].includes(String(poolStatus));
 const assigned=!!driver?.name||String(poolStatus)==='Assigned'||String(poolStatus)==='In Progress';
 const pin=d.startPin||'';
 const jobStatus=job?.status||'';
 screen(`<div class="cab6PoolSuccess"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div><div style="display:inline-block;padding:5px 8px;border-radius:999px;background:#eef4ff;color:#1f5cf3;font-size:9px;font-weight:900">CAR POOL</div><h2 style="margin-top:8px">${assigned?'Vaahak Assigned':ready?'Pool Ready':'Pool Forming'}</h2></div><span style="padding:6px 9px;border-radius:999px;background:${ready?'#e9f9ef':'#fff6df'};color:${ready?'#17633f':'#8a5b00'};font-size:9px;font-weight:900">${esc(String(poolStatus).toUpperCase())}</span></div><div class="cab6PoolId">${esc(id)}</div><div class="cab6RouteRow"><small>Route</small><b>${esc(S.p?.label||req.pickup||pool.pickup||'')} → ${esc(S.d?.label||req.dropoff||pool.dropoff||'')}</b></div><div class="cab6RouteRow"><small>Schedule</small><b>${esc(time)}</b></div><div class="cab6Meta" style="margin-top:10px"><div><small>Vehicle</small><b>${esc(vehicle)}</b></div><div><small>Seats held</small><b>${held} / ${totalSeats}</b></div><div><small>Paid seats</small><b>${confirmed}</b></div><div><small>Ready from</small><b>${minReady} seats</b></div></div><div class="cab6Fare"><div><small style="color:#858da0;font-size:9px">Per-seat fare</small><strong>₹${perSeat}</strong></div><div style="text-align:right"><small style="color:#858da0;font-size:9px">Your total</small><div style="font-size:20px;font-weight:950;color:#172960">₹${total}</div></div></div>${paid?'<div class="cab6RouteRow"><small>Payment</small><b style="color:#17633f">✓ Razorpay Verified</b></div>':''}${driver?.name?`<div class="cab6RouteRow"><small>Vaahak</small><b>${esc(driver.name)} • ${esc(driver.vehicle||vehicle)}${driver.vehicleNo?' • '+esc(driver.vehicleNo):''}</b></div>`:''}${pin?`<div style="margin:12px 0;padding:13px;border-radius:16px;background:#f2f6ff;text-align:center"><small style="display:block;color:#667085">POOL START PIN</small><b style="font-size:28px;letter-spacing:6px;color:#174da8">${esc(pin)}</b></div>`:''}${jobStatus?`<div class="cab6RouteRow"><small>Ride status</small><b>${esc(jobStatus)}</b></div>`:''}<p style="font-size:10px;color:#68758b;line-height:1.5">${paid?(ready?'Your paid seat is confirmed. The shared Vaahak job is being handled as one pooled ride.':'Your seat is paid and confirmed. DBest is waiting for enough paid seats to make this pool operational.'):'Paying confirms and reserves your seat. Unpaid seat holds are not counted for Vaahak dispatch.'}</p>${paid?'<button type="button" id="cab6PoolRefresh" class="cab6Book">Refresh Pool Status</button>':'<button type="button" id="cab6PoolPay" class="cab6Book">Pay & Confirm Seat • ₹'+total+'</button><button type="button" id="cab6PoolCancel" class="btn soft wide" style="margin-top:8px">Cancel Request</button>'}</div>`,'DBEST_CAB_SELECTED_UI.open()');
 if($('cab6PoolPay'))$('cab6PoolPay').onclick=()=>payCarpoolSeat(id,mobile,total,req.name||S.carpoolName||'DBest Passenger');
 if($('cab6PoolRefresh'))$('cab6PoolRefresh').onclick=()=>refreshCarpool(id,mobile);
 if($('cab6PoolCancel'))$('cab6PoolCancel').onclick=()=>cancelCarpool(id,mobile)
}
async function carpoolJson(url,payload){
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||j.message||('HTTP '+r.status));return j
}
async function payCarpoolSeat(id,mobile,total,name){
 const btn=$('cab6PoolPay');if(btn){btn.disabled=true;btn.textContent='Opening Razorpay…'}
 try{
  const order=await carpoolJson('/api/razorpay/create-order',{kind:'carpool_seat',dbestRef:id,mobile,section:'Cab',sub:'Car Pool'});
  if(Number(order.amount)!==Math.round(Number(total)*100))throw new Error('Secure Car Pool amount mismatch');
  if(!window.Razorpay)await loadScript('https://checkout.razorpay.com/v1/checkout.js','cab6-razorpay');
  await new Promise((resolve,reject)=>{
   let settled=false;const done=(fn,v)=>{if(settled)return;settled=true;fn(v)};
   const rz=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency||'INR',name:'DBest',description:'DBest Car Pool Seat',order_id:order.orderId,prefill:{name:name||'',contact:mobile||''},notes:{dbest_ref:id},handler:async response=>{try{const verified=await carpoolJson('/api/razorpay/verify-payment',{...response,dbestRef:id,kind:'carpool_seat'});if(!verified?.verified)throw new Error('Payment verification failed');done(resolve,verified)}catch(e){done(reject,e)}},modal:{ondismiss:()=>done(reject,new Error('Payment cancelled'))}});
   rz.on('payment.failed',r=>done(reject,new Error(r?.error?.description||'Payment failed')));rz.open()
  });
  say('Car Pool seat payment verified.');await refreshCarpool(id,mobile)
 }catch(e){say(String(e?.message||'Unable to complete Car Pool payment.'))}
 finally{if(btn){btn.disabled=false;btn.textContent='Pay & Confirm Seat • ₹'+total}}
}
async function createCarpoolRequest(){
 const b=$('cab6Go');if(b){b.disabled=true;b.textContent='Finding pool…'}
 try{
  const d=await carpoolApi('create',{name:S.carpoolName,mobile:S.carpoolMobile,pickup:S.p?.label||'',dropoff:S.d?.label||'',pickupLat:S.p?.lat,pickupLng:S.p?.lng,dropLat:S.d?.lat,dropLng:S.d?.lng,distanceKm:S.route?.km||0,scheduledAt:S.scheduledAt,seatsRequested:S.carpoolSeats,vehiclePref:S.carpoolVehicle});
  S.carpoolRequestId=d.id||'';try{localStorage.setItem('dbest_carpool_last',JSON.stringify({id:d.id,mobile:S.carpoolMobile}))}catch(_){}
  poolStatusScreen(d,S.carpoolMobile);
 }catch(e){console.warn('Car Pool request failed',e);const m=String(e.message||'');say(m==='recent_request_already_exists'?'A recent Car Pool request already exists for this mobile.':m==='schedule_must_be_future'?'Choose a time at least 10 minutes from now.':m==='seat_limit_for_vehicle'?'Sedan supports up to 3 pooled passenger seats.':'Unable to create Car Pool request. Please retry.')}
 finally{if(b){b.disabled=false;b.textContent='Find / Create Pool'}}
}
async function confirmCarpool(id,mobile){
 try{const d=await carpoolApi('confirm',{id,mobile});d.confirmed=true;poolStatusScreen(d,mobile);say('Your Car Pool seat is confirmed.')}catch(e){const m=String(e.message||'');say(m==='confirmation_expired'?'Seat hold expired. Please create a new Car Pool request.':'Unable to confirm seat. Please retry.')}
}
async function refreshCarpool(id,mobile){
 try{const d=await carpoolApi('status',{id,mobile});poolStatusScreen(d,mobile)}catch(e){say('Unable to refresh Car Pool status.')}
}
async function cancelCarpool(id,mobile){
 try{await carpoolApi('decline',{id,mobile});try{localStorage.removeItem('dbest_carpool_last')}catch(_){}say('Car Pool request cancelled.');open()}catch(e){say(String(e?.message||'')==='paid_request_refund_required'?'Paid Car Pool cancellation requires a refund workflow. Please contact DBest support.':'Unable to cancel Car Pool request.')}
}
function ownerRideConfig(){
 let stored=null;
 try{stored=JSON.parse(localStorage.getItem('d2_ride_config')||'null')}catch(e){}
 // Prefer the application's active Owner configuration when it is available.
 try{if(typeof rideConfig!=='undefined'&&rideConfig&&Array.isArray(rideConfig.vehicles))return rideConfig}catch(e){}
 return stored&&Array.isArray(stored.vehicles)?stored:null;
}
function roundRules(){
 const r=ownerRideConfig()?.roundTripRules||{};
 const positive=(n,f)=>Number.isFinite(Number(n))&&Number(n)>=0?Number(n):f;
 return{sedan:{perKm:positive(r.sedan?.perKm,15),nightHalt:positive(r.sedan?.nightHalt,1000)},
  suv:{perKm:positive(r.suv?.perKm,18),nightHalt:positive(r.suv?.nightHalt,1500)}};
}
function visibleVehicles(){
 const c=ownerRideConfig();
 const active=Array.isArray(c?.vehicles)&&c.vehicles.length
  ?VEH.filter(v=>c.vehicles.some(x=>x.id===v.id)):VEH;
 return S.mode==='rental'||S.tripType!=='roundtrip'?active:active.filter(v=>v.id==='sedan'||v.id==='suv');
}
function totalKm(){const k=S.route?.km||S.rentalKm;return S.mode!=='rental'&&S.tripType==='roundtrip'?k*2:k}
function totalMin(){if(S.mode==='rental')return S.rentalHours*60;const oneWay=realisticRoadMinutes(Number(S.route?.km||0),Number(S.route?.min||1));return S.tripType==='roundtrip'?oneWay*2:oneWay}
function fare(v){
 const k=Math.max(0,Number(S.route?.km||S.rentalKm)||0);
 if(S.mode!=='rental'&&S.tripType==='roundtrip'){
  const rr=roundRules()[v.id];if(!rr)return 0;
  return Math.round((k*2)*rr.perKm+(S.nightHalt?rr.nightHalt:0));
 }
 const c=ownerRideConfig(),item=c?.vehicles?.find(x=>x.id===v.id);
 if(item){
  const val=(x,f)=>Number.isFinite(Number(x))&&Number(x)>=0?Number(x):f;
  const base=val(item.base,v.base),perKm=val(item.perKm,v.km),minimum=val(item.minFare,v.min);
  const surge=val(c.surge,1),fee=val(c.platformFee,PLATFORM_FEE),tax=val(c.taxPercent,0);
  return Math.round((Math.max(minimum,base+perKm*k)*surge+fee)*(1+tax/100));
 }
 return Math.round(Math.max(v.min,v.base+v.km*k)+PLATFORM_FEE);
}
function pickupEta(v){const m={bike:4,auto:5,sedan:6,suv:7};return m[v.id]||6}
function vehCard(v){const rr=S.tripType==='roundtrip'?roundRules()[v.id]:null;return `<button type="button" class="cab6Veh ${S.selected===v.id?'on':''}" data-v="${v.id}"><span class="photo"><img src="${IMG[v.id]}" alt="${esc(v.name)}" loading="eager"></span><b>${esc(v.name)}${S.tripType==='roundtrip'?'<span style="display:block;font-size:7px;color:#315efb;margin-top:2px">ROUND TRIP</span>':''}</b><small>${v.seats} seat${v.seats>1?'s':''}${rr?' • ₹'+rr.perKm+'/km':''}</small><small style="color:#315efb;font-weight:900;margin-top:2px">~${pickupEta(v)} min away</small><strong>₹${fare(v)}</strong></button>`}
function mapBlock(title,id='cab6Map'){return `<div class="cab6MapFrame"><div id="${id}" class="cab6Map"></div><div class="cab6MapShade"></div><div class="cab6RoutePill">${esc(title)}</div></div>`}
async function renderRealMap(id){
 const el=$(id);if(!el)return;
 try{const L=await initLeaflet();destroyMap();S.map=L.map(el,{zoomControl:true,attributionControl:true,preferCanvas:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(S.map);
 if(S.mode==='rental'){S.map.setView([S.p.lat,S.p.lng],14);L.circleMarker([S.p.lat,S.p.lng],{radius:8,weight:4,color:'#fff',fillColor:'#56dfea',fillOpacity:1}).addTo(S.map);return}
 const pts=(S.route?.geo||[]).map(c=>[c[1],c[0]]);if(pts.length){S.layer=L.polyline(pts,{weight:5,opacity:1,color:'#55ddea',lineCap:'round'}).addTo(S.map);S.map.fitBounds(S.layer.getBounds(),{padding:[42,42]})}else S.map.setView([(S.p.lat+S.d.lat)/2,(S.p.lng+S.d.lng)/2],13);
 L.circleMarker([S.p.lat,S.p.lng],{radius:8,weight:4,color:'#fff',fillColor:'#56dfea',fillOpacity:1}).addTo(S.map);(S.stops||[]).forEach((p,i)=>L.circleMarker([p.lat,p.lng],{radius:7,weight:3,color:'#fff',fillColor:'#f6a623',fillOpacity:1}).bindTooltip('Stop '+(i+1)).addTo(S.map));L.circleMarker([S.d.lat,S.d.lng],{radius:8,weight:4,color:'#fff',fillColor:'#56dfea',fillOpacity:1}).addTo(S.map);setTimeout(()=>S.map?.invalidateSize?.(),120)
 }catch(e){console.warn('Map render failed',e);el.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#171d49,#292f70)"><b>Route ready</b></div>'}
}
function vehicles(){
 const list=visibleVehicles();if(!list.some(v=>v.id===S.selected))S.selected=list[0]?.id||'sedan';const k=totalKm(),m=totalMin(),title=`${S.p?.label||'Pickup'} → ${S.mode==='rental'?'Hourly Rental':S.d?.label||'Destination'}${S.tripType==='roundtrip'?' → Return':''}`;
 screen(`${mapBlock(title)}<div class="cab6Sheet"><div class="cab6SheetHead"><b>Choose a ride</b><small>${S.tripType==='roundtrip'?'Same vehicle • Return included • Tolls extra':'Upfront fare'}</small></div><div class="cab6Meta"><div><small>${S.tripType==='roundtrip'?'Total round-trip distance':'Road distance'}</small><b>${k.toFixed(1)} km</b></div><div><small>${S.tripType==='roundtrip'?'Total driving time':'Travel time'}</small><b>~${m} min</b></div></div><div class="cab6Vehicles">${list.map(vehCard).join('')}</div><button type="button" id="cab6Book" class="cab6Book">Continue with ${esc(list.find(v=>v.id===S.selected)?.name||'Ride')}</button></div>`,'DBEST_CAB_SELECTED_UI.open()');
 qa('[data-v]').forEach(b=>b.onclick=()=>{S.selected=b.dataset.v;qa('[data-v]').forEach(x=>x.classList.toggle('on',x===b));$('cab6Book').textContent='Continue with '+(list.find(v=>v.id===S.selected)?.name||'Ride')});$('cab6Book').onclick=()=>confirmRide(S.selected);setTimeout(()=>renderRealMap('cab6Map'),40)
}
function confirmRide(id){
 const v=VEH.find(x=>x.id===id);if(!v)return;
 const c=ownerRideConfig(),paymentOptions=[];
 if(c?.cash!==false)paymentOptions.push(['cash','Cash']);
 if(c?.upiDriver!==false)paymentOptions.push(['upi-driver','UPI to Vaahak']);
 let payuReady=false;
 try{payuReady=typeof payuSettings!=='undefined'&&payuSettings?.enabled===true}catch(e){}
 if(c?.payu!==false&&payuReady)paymentOptions.push(['payu','Pay securely online']);
 const paymentHtml=paymentOptions.length?paymentOptions.map((o,i)=>'<label><input type="radio" name="cab6pay" value="'+o[0]+'" '+(i===0?'checked':'')+'> '+o[1]+'</label>').join(''):'<span style="font-size:12px;color:#9c3340">No payment option is enabled. Please contact support.</span>';
 const amt=fare(v),title=S.mode==='rental'?`${S.rentalHours} Hours / ${S.rentalKm} km`:`${S.p?.label||'Pickup'} → ${S.d?.label||'Destination'}${S.tripType==='roundtrip'?' → '+(S.p?.label||'Pickup'):''}`;
 screen(`<div class="cab6ConfirmMap">${mapBlock(title)}</div><div class="cab6Confirm"><div class="cab6VehicleHero"><div class="pic"><img src="${IMG[v.id]}" alt="${esc(v.name)}"></div><div><b style="font-size:16px">${esc(v.name)}</b><div style="font-size:9px;color:#7d8597">${v.seats} seats • ~${totalMin()} min</div></div></div><div class="cab6RouteRow"><small>Pickup</small><b>${esc(S.p?.label||'')}</b></div>${S.mode!=='rental'&&(S.stops||[]).length?`<div class="cab6RouteRow"><small>Stops</small><b>${S.stops.map((s,i)=>`${i+1}. ${esc(s?.label||'')}`).join(' • ')}</b></div>`:''}<div class="cab6RouteRow"><small>${S.mode==='rental'?'Package':'Destination'}</small><b>${esc(S.mode==='rental'?`${S.rentalHours} Hours / ${S.rentalKm} km`:S.d?.label||'')}</b></div><div class="cab6Fare"><div><small style="color:#858da0;font-size:9px">Estimated fare</small><strong>₹${amt}</strong></div><div style="text-align:right;color:#7c8498;font-size:8px">${totalKm().toFixed(1)} km<br>~${totalMin()} min</div></div><div class="cab6Pay">${paymentHtml}</div><button type="button" id="cab6ConfirmBook" class="cab6Book" ${paymentOptions.length?"":"disabled"}>Book ${esc(v.name)}</button></div>`,'DBEST_CAB_SELECTED_UI.vehicles()');
 $('cab6ConfirmBook').onclick=()=>book(id);setTimeout(()=>renderRealMap('cab6Map'),40)
}
function book(id){const pay=q('input[name="cab6pay"]:checked')?.value||'cash';try{if(typeof window.bookRide==='function'){window.rideDraft=window.rideDraft||{};const round=S.mode!=='rental'&&S.tripType==='roundtrip';Object.assign(window.rideDraft,{quotedFare:fare(VEH.find(x=>x.id===id)||{base:0,km:0,min:0}),pickup:S.p?.label||'',pickupCoords:(S.p&&Number.isFinite(S.p.lat)&&Number.isFinite(S.p.lng))?{lat:S.p.lat,lng:S.p.lng,label:S.p.label||''}:null,stops:(S.stops||[]).map(x=>x?.label||'').filter(Boolean),stopCoords:(S.stops||[]).filter(x=>Number.isFinite(x?.lat)&&Number.isFinite(x?.lng)).map(x=>({lat:x.lat,lng:x.lng,label:x.label||''})),drop:S.mode==='rental'?`${S.rentalHours} Hours / ${S.rentalKm} km`:S.d?.label||'',dropCoords:(S.mode!=='rental'&&S.d&&Number.isFinite(S.d.lat)&&Number.isFinite(S.d.lng))?{lat:S.d.lat,lng:S.d.lng,label:S.d.label||''}:null,distance:round?totalKm():S.route.km,roundTripDistance:round?totalKm():null,estimatedMinutes:round?totalMin():S.route.min,selected:id,schedule:S.schedule,scheduledAt:S.scheduledAt,rider:S.rider,riderName:S.riderName,riderMobile:S.riderMobile,mode:S.mode,bookingType:S.mode==='rental'?'Rental':(round?'Round Trip':'Ride'),tripType:round?'roundtrip':'oneway',roundTrip:round,sameVehicle:round,returnPickup:round?(S.d?.label||''):null,returnDrop:round?(S.p?.label||''):null,nightHalt:round&&S.nightHalt,tollsExtra:round,rentalHours:S.rentalHours,rentalKm:S.rentalKm});const f=document.createElement('form');f.innerHTML=`<input name="payment" value="${esc(pay)}">`;return window.bookRide({preventDefault(){},target:f},id)}}catch(e){console.warn('Booking handoff failed',e)}say('Ride details are ready. Please retry booking.')}
const api={version:VERSION,open,vehicles,confirm:confirmRide};
window.DBEST_CAB_SELECTED_UI=api;window.DBEST_CAB_GOOGLE=api;window.DBEST_CAB_MAPPLS_RENTAL=api;window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V6';window.openRidePlatform=open;css();
})();