(function(){
"use strict";
const CONFIG=window.JANSATHI_STAGE_CONFIG||{};
const ONLINE=!!(CONFIG.url&&CONFIG.publishableKey);
const API=String(CONFIG.url||"").replace(/\/$/,"");
const KEY=String(CONFIG.publishableKey||"");
const AUTH_STORAGE="dbest-jansathi-stage-session";
const DEMO_STORAGE="dbest-jansathi-stage-demo";

const byId=id=>document.getElementById(id);
const baseData=[{"kind":"news","id":"demo-news-ckp-1","city":"Chakradharpur","public_area":"Imaginary community hall","headline":"[DEMO] Community art workshop announced","body":"FICTIONAL EXAMPLE: A model neighbourhood plans a drawing and craft workshop for families. This is sample content only; no real event is announced.","category":"community","emoji":"🎨","synthetic":true},{"kind":"news","id":"demo-news-ckp-2","city":"Chakradharpur","public_area":"Illustrative school grounds","headline":"[DEMO] Students prepare a science exhibition","body":"FICTIONAL EXAMPLE: A sample school showcases simple science models, recycling ideas and local innovation during an imaginary exhibition. Not an actual school announcement.","category":"education","emoji":"🔬","synthetic":true},{"kind":"news","id":"demo-news-ckp-3","city":"Chakradharpur","public_area":"Sample public sports field","headline":"[DEMO] Friendly neighbourhood sports meet","body":"FICTIONAL EXAMPLE: A make-believe sports day includes badminton, volleyball and children's activities. No event is scheduled.","category":"sports","emoji":"🏅","synthetic":true},{"kind":"civic","id":"demo-issue-ckp-1","city":"Chakradharpur","public_area":"Imaginary market road","headline":"[DEMO] Streetlight not working in sample lane","body":"FICTIONAL ISSUE: An imaginary streetlight needs inspection. No complaint was filed.","category":"streetlight","status":"dbest_received","emoji":"💡","synthetic":true},{"kind":"civic","id":"demo-issue-ckp-2","city":"Chakradharpur","public_area":"Illustrative bus stop area","headline":"[DEMO] Sample pothole near bus stop","body":"FICTIONAL ISSUE: An example pothole is described solely for interface testing. No authority was contacted.","category":"road","status":"dbest_received","emoji":"🛣️","synthetic":true},{"kind":"news","id":"demo-news-chaibasa-1","city":"Chaibasa","public_area":"Example civic reading room","headline":"[DEMO] Community book-exchange gathering","body":"FICTIONAL EXAMPLE: Neighbours in a mock locality exchange books and share reading suggestions. This is not an actual announcement.","category":"education","emoji":"📚","synthetic":true},{"kind":"news","id":"demo-news-chaibasa-2","city":"Chaibasa","public_area":"Illustrative community garden","headline":"[DEMO] Tree-planting awareness activity","body":"FICTIONAL EXAMPLE: A demonstration group discusses the benefits of planting native trees in a model garden.","category":"community","emoji":"🌿","synthetic":true},{"kind":"civic","id":"demo-issue-chaibasa-1","city":"Chaibasa","public_area":"Imaginary ward street","headline":"[DEMO] Example blocked drainage channel","body":"FICTIONAL ISSUE: A hypothetical drain needs cleaning. This did not happen at a real address.","category":"drainage","status":"dbest_received","emoji":"🚰","synthetic":true},{"kind":"news","id":"demo-news-jsr-1","city":"Jamshedpur","public_area":"Sample public recreation area","headline":"[DEMO] Weekend fitness and cycling session","body":"FICTIONAL EXAMPLE: An imaginary neighbourhood conducts a cycling-safety and wellness discussion. No real session is advertised.","category":"health","emoji":"🚲","synthetic":true},{"kind":"news","id":"demo-news-jsr-2","city":"Jamshedpur","public_area":"Imaginary youth club","headline":"[DEMO] Youth skill-sharing meetup","body":"FICTIONAL EXAMPLE: A sample community invites volunteers to share basic computer and communication skills.","category":"education","emoji":"💻","synthetic":true},{"kind":"civic","id":"demo-issue-jsr-1","city":"Jamshedpur","public_area":"Example park approach","headline":"[DEMO] Garbage collection request in sample lane","body":"FICTIONAL ISSUE: An imaginary street requires garbage pickup. No service request has been registered.","category":"garbage","status":"dbest_received","emoji":"🗑️","synthetic":true},{"kind":"news","id":"demo-news-ranchi-1","city":"Ranchi","public_area":"Illustrative cultural centre","headline":"[DEMO] Local crafts exhibition showcase","body":"FICTIONAL EXAMPLE: Mock artisans exhibit handmade products and demonstrate traditional crafts at an imaginary event.","category":"community","emoji":"🧵","synthetic":true},{"kind":"news","id":"demo-news-ranchi-2","city":"Ranchi","public_area":"Example public learning hub","headline":"[DEMO] Digital literacy awareness session","body":"FICTIONAL EXAMPLE: An imaginary neighbourhood organizes introductory mobile safety and internet literacy activities.","category":"education","emoji":"📱","synthetic":true},{"kind":"civic","id":"demo-issue-ranchi-1","city":"Ranchi","public_area":"Imaginary park entrance","headline":"[DEMO] Example footpath needs repairs","body":"FICTIONAL ISSUE: A pretend uneven footpath is shown to illustrate issue tracking; no complaint exists.","category":"road","status":"dbest_received","emoji":"🚶","synthetic":true} ];
baseData.push({kind:"news",id:"demo-national-feature",city:"Example City",town:"Example City",block:"",village:"",district:"Imaginary District",state:"Jharkhand",public_area:"Illustrative national showcase",headline:"[DEMO] National-level community innovation showcase",body:"FICTIONAL EXAMPLE: This demonstrates how an Owner-selected story could be displayed nationally. Nothing has been published or verified.",category:"community",emoji:"🇮🇳",synthetic:true,national_featured:true});
let local=[];try{local=JSON.parse(localStorage.getItem(DEMO_STORAGE)||"[]")}catch(e){}
let session=null;try{session=JSON.parse(sessionStorage.getItem(AUTH_STORAGE)||"null")}catch(e){}
let paidNewsEligible=false;
let registeredSupportLocality=null;
let mySupportIds=new Set();
baseData.filter(x=>x.kind==="civic").forEach((s,i)=>{s.support_count=[12,7,9,15,6][i%5];});
function storeSession(value){
 session=value;
 if(value){sessionStorage.setItem(AUTH_STORAGE,JSON.stringify(value));}
 else {sessionStorage.removeItem(AUTH_STORAGE);paidNewsEligible=false;registeredSupportLocality=null;mySupportIds.clear();}
 renderAuth();refreshAccessUI();
}
function renderAuth(){
 if(!ONLINE)return;
 byId("sessionLabel").textContent=session&&session.access_token?"Pilot account signed in; your publishing rights are checked from the database.":"Sign in with a pilot account to submit a verified civic report. Main DBest membership handoff is not connected.";
 byId("accountDrawerTitle").textContent=session&&session.access_token?"✓ Signed in to pilot":"🔐 Member access";
 byId("accountDrawerHint").textContent=session&&session.access_token?"View account and sign out":"Sign in to report, follow or support";
 byId("myReportsPanel").hidden=!(session&&session.access_token);
}
function refreshAccessUI(){
 const label=byId("memberAccessStatus");
 if(ONLINE && paidNewsEligible && session){label.textContent="Verified active ₹299+ member — news publishing enabled";label.className="pill";}
 else if(session){label.textContent="Paid news publishing locked — trusted DBest membership verification pending";label.className="pill warn";}
 else{label.textContent="Reading open to everyone · news publishing requires ₹299+ verified membership";label.className="pill warn";}
 if(byId("modal").classList.contains("show")){
   byId("formAccessNote").textContent=reportKind==="news"?
     paidNewsEligible && session?"Verified paid member: your submission will undergo JanSathi safety screening.":"Preview only — publishing news requires verified active DBest membership of ₹299 or above. Choosing a tier here does not unlock access.":
     session?"Your account must have a verified email or phone. Unpaid users may submit 2 civic issues per rolling 7 days; eligible paid members up to 5 per 24 hours.":"Preview only — sign in with an email-verified pilot account to report a civic issue.";
   byId("send").disabled=ONLINE && (!session||(reportKind==="news"&&!paidNewsEligible));
 }
}
async function refreshEligibility(){
 paidNewsEligible=false;refreshAccessUI();
 if(!ONLINE||!session)return;
 try{
  const rows=await api("/rest/v1/jansathi_member_entitlements?select=tier,membership_status,kyc_verified,source_verified_at,membership_expires_at&limit=1",{auth:true});
  const x=rows[0];
  paidNewsEligible=Boolean(x&&["promoter","prime","leader"].includes(x.tier)&&x.membership_status==="active"&&x.kyc_verified===true&&Date.parse(x.source_verified_at)>Date.now()-86400000&&(!x.membership_expires_at||Date.parse(x.membership_expires_at)>Date.now()));
  if(x){byId("membershipDetail").textContent="Membership record: "+x.tier+" · "+x.membership_status+(paidNewsEligible?" · verified":" · verification not active");}
  else{byId("membershipDetail").textContent="No paid membership entitlement is linked to this pilot account. Only a trusted DBest server will be able to link it.";}
 }catch(err){byId("membershipDetail").textContent="Could not confirm paid membership: "+err.message+". Publishing stays locked.";}
 refreshAccessUI();
}
async function refreshTokenIfNeeded(){
 if(!session||!session.access_token)throw Error("Please sign in to the isolated JanSathi pilot first.");
 if(session.expires_at && session.expires_at>Math.floor(Date.now()/1000)+90)return;
 if(!session.refresh_token){storeSession(null);throw Error("Your login expired. Please sign in again.");}
 const res=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
 const token=await res.json();
 if(!res.ok||!token.access_token){storeSession(null);throw Error("Your session expired. Please sign in again.");}
 storeSession({access_token:token.access_token,refresh_token:token.refresh_token,expires_at:Math.floor(Date.now()/1000)+(token.expires_in||3600)});
}
let activeCity="Chakradharpur",activeKind="all",reportKind="civic",currentStories=[],includeSamples=true;
const GEO_STORAGE="dbest-jansathi-view-location";
const placePresets={
 Chakradharpur:{town:"Chakradharpur",block:"Chakradharpur",district:"West Singhbhum",state:"Jharkhand"},
 Chaibasa:{town:"Chaibasa",block:"Chaibasa",district:"West Singhbhum",state:"Jharkhand"},
 Jamshedpur:{town:"Jamshedpur",block:"",district:"East Singhbhum",state:"Jharkhand"},
 Ranchi:{town:"Ranchi",block:"",district:"Ranchi",state:"Jharkhand"}
};
let geo={scope:"town",town:"Chakradharpur",block:"Chakradharpur",village:"",district:"West Singhbhum",state:"Jharkhand"};
try{const v=JSON.parse(localStorage.getItem(GEO_STORAGE)||"null");if(v&&typeof v==="object"&&v.state&&v.district&&["town","village","block","district","state"].includes(v.scope))geo=Object.assign(geo,v);}catch(e){}
let ownerCanFeature=false;
function applyGeoFields(){
 byId("geoScope").value=geo.scope;byId("geoState").value=geo.state;byId("geoDistrict").value=geo.district;
 byId("geoBlock").value=geo.block;byId("geoTown").value=geo.town;byId("geoVillage").value=geo.village;
 byId("geoContext").textContent="Viewing "+geo.scope+": "+(geo[geo.scope]||"(enter name)")+
 " · "+geo.district+", "+geo.state+" · plus Owner-featured national posts.";
 const townChoice=Array.from(byId("city").options).some(x=>x.value===geo.town);
 byId("city").value=townChoice?geo.town:"";
 activeCity=geo.town;
}
function readGeoFields(){
 geo={scope:byId("geoScope").value,state:cleanText(byId("geoState").value),
 district:cleanText(byId("geoDistrict").value),block:cleanText(byId("geoBlock").value),
 town:cleanText(byId("geoTown").value),village:cleanText(byId("geoVillage").value)};
 if(geo.state.length<2 || ((geo.scope!=="state")&&geo.district.length<2) ||
    (["town","village","block"].includes(geo.scope)&&geo[geo.scope].length<2))throw Error("Fill the state, district and selected locality level.");
 applyGeoFields();
}
function storyLocality(s){
 const preset=placePresets[s.city]||{};
 return {state:s.state||preset.state||"",district:s.district||preset.district||"",
 block:s.block||preset.block||"",town:s.town||preset.town||s.city||"",village:s.village||""};
}
function placeMatch(s){
 if(s.national_featured)return true;
 const loc=storyLocality(s),eq=(a,b)=>String(a||"").trim().toLocaleLowerCase()===String(b||"").trim().toLocaleLowerCase();
 if(!eq(loc.state,geo.state))return false;
 if(geo.scope==="state")return true;
 if(!eq(loc.district,geo.district))return false;
 if(geo.scope==="district")return true;
 if(geo.scope==="village")return geo.village.length>1 && eq(loc.village,geo.village) && (!geo.block || eq(loc.block,geo.block));
 return geo[geo.scope].length>1 && eq(loc[geo.scope],geo[geo.scope]);
}
function geoParams(){return {p_level:geo.scope,p_state:geo.state,p_district:geo.district,p_block:geo.block,
 p_town:geo.town,p_village:geo.village,p_limit:100};}
async function loadOwnerIssueSeverity(){
 if(!ownerCanFeature)return;
 const list=byId("ownerSeverityList");list.replaceChildren(mk("p","muted","Loading current issue schedules…"));
 try{
  const rows=await api("/rest/v1/rpc/jansathi_owner_issue_followup_schedule",
   {method:"POST",auth:true,body:JSON.stringify({p_limit:100})});
  list.replaceChildren();
  if(!rows.length){list.appendChild(mk("p","muted","No real issues to review. Fictional demonstration issues cannot be reclassified."));return;}
  rows.forEach(s=>{
   const row=mk("div","myreport");
   row.append(mk("b","",s.issue_title),mk("small","muted",s.issue_status+" · "+s.citizen_update_count+" citizen updates"),
    mk("span","status",s.severity.toUpperCase()+" · "+cadenceText(s.cadence_hours)+" · Next: "+localDate(s.next_eligible_at)));
   const chooser=mk("select","select");
   ["urgent","high","moderate","low"].forEach(level=>{const option=mk("option","",level);option.value=level;chooser.append(option);});
   chooser.value=s.severity;
   const change=mk("button","btn soft","Apply severity");
   change.onclick=async()=>{
    if(chooser.value===s.severity){toast("No severity change selected.");return;}
    const reason=window.prompt("Reason for changing issue severity (minimum 5 characters):");
    if(reason===null)return;
    if(cleanText(reason).length<5){toast("Please enter a meaningful audit reason.");return;}
    if(!window.confirm("Change the follow-up cadence to "+cadenceText(cadenceHours(chooser.value))+"?"))return;
    change.disabled=true;
    try{
     await api("/rest/v1/rpc/jansathi_owner_set_civic_followup_severity",
      {method:"POST",auth:true,body:JSON.stringify({p_report_id:s.report_id,p_severity:chooser.value,p_reason:cleanText(reason)})});
     toast("Issue cadence updated with Owner audit.");await Promise.all([loadOwnerIssueSeverity(),refreshMine()]);
    }catch(err){toast("Severity change rejected: "+err.message);change.disabled=false;}
   };
   row.append(chooser,change);list.append(row);
  });
 }catch(err){list.replaceChildren(mk("p","muted","Owner severity review unavailable: "+err.message));}
}
function cadenceHours(severity){return {urgent:48,high:168,moderate:720,low:2160}[severity]||720;}
function cadenceText(hours){return {48:"48 hours",168:"7 days",720:"30 days",2160:"90 days"}[hours]||hours+" hours";}
function localDate(iso){return new Date(iso).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"});}
byId("ownerSeverityRefresh").onclick=loadOwnerIssueSeverity;

async function ownerLoadRadius(){
 if(!ownerCanFeature)return;
 try{
  const list=await api("/rest/v1/rpc/jansathi_support_radii",{method:"POST",auth:true,body:"{}"});
  const r=list&&list[0];
  if(!r)throw Error("No configured distances.");
  byId("ownerUrbanKm").value=r.urban_km;byId("ownerRuralKm").value=r.rural_km;
  byId("ownerRadiusNote").textContent="Current urban "+r.urban_km+" km · rural "+r.rural_km+" km.";
 }catch(e){byId("ownerRadiusNote").textContent="Unable to check rules: "+e.message;}
}
byId("ownerRadiusRefresh").onclick=ownerLoadRadius;
byId("ownerRadiusSave").onclick=async()=>{
 if(!ownerCanFeature)return;
 const urban=Number(byId("ownerUrbanKm").value),rural=Number(byId("ownerRuralKm").value);
 if(!Number.isInteger(urban)||urban<1||urban>15||!Number.isInteger(rural)||rural<1||rural>30){toast("Urban: 1–15 km, Rural: 1–30 km.");return;}
 const reason=window.prompt("Reason for changing support distances (5–500 characters):");
 if(reason===null)return;
 if(cleanText(reason).length<5||cleanText(reason).length>500){toast("Please provide a valid Owner audit reason.");return;}
 if(!window.confirm("Change nearby support rules to urban "+urban+" km, rural "+rural+" km?"))return;
 const button=byId("ownerRadiusSave");button.disabled=true;
 try{
  await api("/rest/v1/rpc/jansathi_owner_set_support_radii",{method:"POST",auth:true,body:JSON.stringify({p_urban_km:urban,p_rural_km:rural,p_reason:cleanText(reason)})});
  toast("Radius settings updated with Owner audit.");await ownerLoadRadius();
 }catch(e){toast("Radius change rejected: "+e.message);}
 finally{button.disabled=false;}
};
byId("ownerGeoRefresh").onclick=ownerReviewSites;
async function ownerReviewSites(){
 if(!ownerCanFeature)return;
 const list=byId("ownerGeoList");list.replaceChildren(mk("p","muted","Loading published public issue sites…"));
 try{
  const reports=await api("/rest/v1/rpc/jansathi_owner_geo_review",{method:"POST",auth:true,body:"{}"});
  list.replaceChildren();
  if(!Array.isArray(reports)||!reports.length){
   list.append(mk("p","muted","No real published civic issues to review. Fictional samples cannot be verified."));return;
  }
  for(const x of reports){
   const card=mk("div","myreport");
   card.append(mk("b","",x.headline||"Public issue"),
    mk("small","muted",[x.town,x.district,x.state].filter(Boolean).join(", ")),
    mk("small","muted","Citizen-suggested, UNVERIFIED PIN "+(x.issue_pincode||"none")+" · latitude "+(x.submitted_issue_latitude??"none")+" · longitude "+(x.submitted_issue_longitude??"none")),
    mk("small",x.geo_approved?"status":"muted",x.geo_approved?"Owner site previously verified":"Public issue site NOT independently verified"));
   const button=mk("button","btn soft",x.geo_approved?"Reverify public site":"Verify public issue site");
   button.onclick=async()=>{
    const pin=window.prompt("Enter independently verified PUBLIC ISSUE SITE PIN (do not copy unverified user data):");
    if(pin===null)return;
    if(!/^[1-9][0-9]{5}$/.test(cleanText(pin))){toast("Six-digit PIN is required.");return;}
    const rawLat=window.prompt("Independently verified public issue latitude (6 to 38):");
    if(rawLat===null)return;
    const rawLon=window.prompt("Independently verified public issue longitude (68 to 98):");
    if(rawLon===null)return;
    const lat=Number(rawLat),lon=Number(rawLon);
    if(!cleanText(rawLat)||!cleanText(rawLon)||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<6||lat>38||lon<68||lon>98){
     toast("Check the independently verified public-site coordinates.");return;
    }
    const reason=window.prompt("Specify independent verification evidence/reason (10–500 characters):");
    if(reason===null)return;
    if(cleanText(reason).length<10||cleanText(reason).length>500){toast("Provide verification evidence and an audit reason.");return;}
    if(!window.confirm("I independently verified the PUBLIC ISSUE SITE, not the reporter's residence. Approve this PIN and coordinate?"))return;
    button.disabled=true;
    try{
     await api("/rest/v1/rpc/jansathi_owner_approve_issue_geo",{method:"POST",auth:true,body:JSON.stringify({p_report_id:x.report_id,p_pincode:cleanText(pin),p_lat:lat,p_lon:lon,p_reason:cleanText(reason)})});
     toast("Site verified. Owner action audited.");await Promise.all([ownerReviewSites(),refreshSupportState()]);
    }catch(e){toast("Site approval rejected: "+e.message);button.disabled=false;}
   };
   card.append(button);list.append(card);
  }
 }catch(e){list.replaceChildren(mk("p","muted","Owner geo review unavailable: "+e.message));}
}

async function refreshOwnerAccess(){
 ownerCanFeature=false;byId("ownerNationalPanel").hidden=true;byId("ownerSeverityPanel").hidden=true;byId("ownerGeoPanel").hidden=true;
 if(!ONLINE||!session)return;
 try{
  ownerCanFeature=(await api("/rest/v1/rpc/jansathi_can_manage_national",{method:"POST",auth:true,body:"{}"}))===true;
  byId("ownerNationalPanel").hidden=!ownerCanFeature;byId("ownerSeverityPanel").hidden=!ownerCanFeature;byId("ownerGeoPanel").hidden=!ownerCanFeature;
  if(ownerCanFeature)await Promise.all([loadOwnerCandidates(),loadOwnerIssueSeverity(),ownerLoadRadius(),ownerReviewSites()]);
 }catch(e){ownerCanFeature=false;byId("ownerNationalPanel").hidden=true;byId("ownerSeverityPanel").hidden=true;byId("ownerGeoPanel").hidden=true;}
}
async function loadOwnerCandidates(){
 if(!ownerCanFeature)return;
 const list=byId("ownerNationalList");list.replaceChildren(mk("p","muted","Loading published submissions…"));
 try{
  const posts=await api("/rest/v1/rpc/jansathi_owner_review_feed",{method:"POST",auth:true,body:JSON.stringify({p_limit:100})});
  list.replaceChildren();
  if(!posts.length){list.appendChild(mk("p","muted","No published news or civic reports. Fictional sample posts cannot be promoted."));return;}
  posts.forEach(item=>{
    const line=mk("div","myreport");
    line.append(mk("b","",item.kind.toUpperCase()+" · "+item.headline),
                mk("small","muted",item.town+" · "+item.district+" · "+item.state));
    line.append(mk("span",item.national_featured?"nationalTag":"muted",item.national_featured?"🇮🇳 NATIONALLY FEATURED":"Local / regional reach"));
    const b=mk("button","btn soft",item.national_featured?"Withdraw from National":"Publish Nationwide");
    b.onclick=async()=>{
     const publish=!item.national_featured;
     const reason=window.prompt((publish?"Reason for publishing nationwide":"Reason for withdrawing national reach")+" (minimum 5 characters):");
     if(reason===null)return;
     if(cleanText(reason).length<5){toast("An audit reason of at least 5 characters is required.");return;}
     if(!window.confirm((publish?"Publish this post nationwide?":"Remove its nationwide visibility?")+" Only real published records can be changed."))return;
     b.disabled=true;
     try{
      await api("/rest/v1/rpc/jansathi_set_national_featured",{method:"POST",auth:true,
       body:JSON.stringify({p_kind:item.kind,p_content_id:item.id,p_featured:publish,p_reason:cleanText(reason)})});
      toast(publish?"Published nationwide by verified Project Owner.":"Nationwide visibility withdrawn.");
      await Promise.all([loadOwnerCandidates(),refresh()]);
     }catch(e){toast("Owner action rejected: "+e.message);b.disabled=false;}
    };
    line.appendChild(b);list.appendChild(line);
  });
 }catch(e){list.replaceChildren(mk("p","muted","Owner review unavailable: "+e.message));}
}
byId("ownerRefresh").onclick=loadOwnerCandidates;
byId("applyGeo").onclick=async()=>{try{readGeoFields();await refresh();}catch(e){toast(e.message);}};
byId("saveGeo").onclick=async()=>{try{readGeoFields();localStorage.setItem(GEO_STORAGE,JSON.stringify(geo));await refresh();toast("Area saved on this device only. Your main DBest profile is not changed.");}catch(e){toast(e.message);}};
applyGeoFields();

byId("mode").textContent=ONLINE?"ISOLATED DATABASE MODE":"DEMO ONLY · BROWSER DATA";
byId("systemStatus").textContent=ONLINE?"Connected to the isolated DBest JanSathi Pilot Free database. Test environment ONLY; no government submissions or live DBest logins.":"No Supabase configured. All reports are local to this browser only.";
if(ONLINE){byId("identity").hidden=false;renderAuth();refreshAccessUI();}else{byId("identity").hidden=true;byId("membershipDetail").textContent="Visual demo mode — no membership verification is connected.";refreshAccessUI();}
function toast(txt){const n=byId("toast");n.textContent=txt;n.classList.add("on");clearTimeout(window._tip);window._tip=setTimeout(()=>n.classList.remove("on"),4000);}
function mk(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;}
function cleanText(t){return String(t||"").trim();}
function safeIssue(t){return !/(?:\b(?:rape|murder|fraud|suicide|assault|riot|scam|terror|corrupt)\b|हत्या|आरोप|मौत|घोटाला|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?[0-9][0-9 -]{8,}[0-9])/i.test(t);}
function headers(auth){const h={"apikey":KEY,"Content-Type":"application/json"};if(auth){if(!session||!session.access_token)throw Error("Sign in using the isolated pilot project before submitting");h.Authorization="Bearer "+session.access_token;}return h;}
async function api(path,opts={}){
if(opts.auth)await refreshTokenIfNeeded(); const request=Object.assign({method:"GET",headers:headers(!!opts.auth)},opts);
if(opts.auth){request.headers=Object.assign({},request.headers,{Authorization:"Bearer "+session.access_token});}
delete request.auth;const res=await fetch(API+path,request);let parsed={};let raw=await res.text();try{parsed=raw?JSON.parse(raw):{}}catch(e){parsed={message:raw.slice(0,150)}}if(!res.ok)throw Error(parsed.msg||parsed.error_description||parsed.message||parsed.error||("Request failed ("+res.status+")"));return parsed;
}

function supportMatch(s){return distanceEligibleIds.has(s.id);}
let residenceVerified=false;
let distanceEligibleIds=new Set();
async function refreshSupportState(){
 registeredSupportLocality=null;mySupportIds.clear();residenceVerified=false;distanceEligibleIds.clear();
 if(!ONLINE||!session){updateSupportLocalityStatus();renderCards();return;}
 try{
  const [supports,residence,allowed]=await Promise.all([
    api("/rest/v1/jansathi_issue_supports?select=report_id&limit=1000",{auth:true}),
    api("/rest/v1/rpc/jansathi_my_residence_status",{method:"POST",auth:true,body:"{}"}),
    api("/rest/v1/rpc/jansathi_my_supportable_issues",{method:"POST",auth:true,body:JSON.stringify({p_limit:100})})
  ]);
  mySupportIds=new Set(supports.map(x=>x.report_id));
  residenceVerified=Boolean(residence&&residence.length&&residence[0].verified===true);
  distanceEligibleIds=new Set(allowed.map(x=>x.report_id));
 }catch(e){byId("supportLocationNote").textContent="Verification unavailable: "+e.message;}
 updateSupportLocalityStatus();renderCards();
}
function updateSupportLocalityStatus(){
 const label=byId("supportLocationNote");
 label.textContent=!ONLINE?"Fictional preview only.":!session?
 "Read freely; sign in to check support eligibility.":residenceVerified?
 "DBest-verified residential area linked. Only nearby independently verified issues are eligible.":
 "Trusted DBest residential verification not connected. Real support votes are locked; selecting a locality here is not proof of residence.";
}
byId("registerSupportLocality").onclick=()=>{
 toast("This selector saves only a viewing area. A trusted DBest home location must be linked before support voting is unlocked.");
};
async function supportIssue(story){
 if(story.synthetic){toast("Fictional example: "+(story.support_count||0)+" sample endorsements, no vote cast.");return;}
 if(!ONLINE||!session){toast("Sign in to check support eligibility.");return;}
 const supported=mySupportIds.has(story.id);
 if(!supported&&!residenceVerified){toast("Vote locked until trusted DBest residence verification is connected.");return;}
 if(!supported&&!supportMatch(story)){toast("Verified residence is outside this issue's eligible distance.");return;}
 try{
  if(supported){
   await api("/rest/v1/jansathi_issue_supports?report_id=eq."+encodeURIComponent(story.id),
    {method:"DELETE",auth:true,headers:Object.assign(headers(true),{"Prefer":"return=minimal"})});
   toast("Support withdrawn.");
  }else{
   await api("/rest/v1/jansathi_issue_supports",
    {method:"POST",auth:true,headers:Object.assign(headers(true),{"Prefer":"return=minimal"}),body:JSON.stringify({report_id:story.id})});
   toast("Verified local support recorded.");
  }
  await Promise.all([refreshSupportState(),refresh()]);
 }catch(e){toast("Support not accepted: "+e.message);}
}

// Photographs depict real-world subjects; ALL associated JanSathi demo stories are invented.
// These files are from openly licensed Wikimedia Commons pages. They are not evidence of
// any issue or news event in the displayed locality. Keep credit + license visible.
const DEMO_PHOTOS=Object.freeze({
 "demo-issue-ckp-1":{
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Street_light_off.jpg/500px-Street_light_off.jpg",
  source:"https://commons.wikimedia.org/wiki/File:Street_light_off.jpg",
  artist:"Himanshum14",license:"CC BY-SA 4.0",
  licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  alt:"Actual photograph of a streetlight, shown as an illustrative civic infrastructure image"
 },
 "demo-issue-ckp-2":{
  image:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Potholes_in_Bengaluru_road.jpg/500px-Potholes_in_Bengaluru_road.jpg",
  source:"https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg",
  artist:"Mallikarjunasj",license:"CC0 1.0",
  licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
  alt:"Real photograph of a damaged Bengaluru road with a pothole, used only as an example"
 },
 "demo-issue-jsr-1":{
  image:"https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg/330px-India_-_Bombay_-_31_-_garbage_dump_%282799575380%29.jpg",
  source:"https://commons.wikimedia.org/wiki/File:India_-_Bombay_-_31_-_garbage_dump_(2799575380).jpg",
  artist:"McKay Savage",license:"CC BY 2.0",
  licenseUrl:"https://creativecommons.org/licenses/by/2.0/",
  alt:"Real photograph of a waste dump in Mumbai, not a verified Jamshedpur complaint"
 },
 "demo-news-ckp-2":{
  image:"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Science_Exhibition_at_School.jpg/960px-Science_Exhibition_at_School.jpg",
  source:"https://commons.wikimedia.org/wiki/File:Science_Exhibition_at_School.jpg",
  artist:"Abhi 32253",license:"CC BY-SA 4.0",
  licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  alt:"Real photograph of a school science exhibition, not news of a Chakradharpur event"
 },
 "demo-news-chaibasa-2":{
  image:"https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Children_planting_in_Chalakudy_River_bank.JPG/330px-Children_planting_in_Chalakudy_River_bank.JPG",
  source:"https://commons.wikimedia.org/wiki/File:Children_planting_in_Chalakudy_River_bank.JPG",
  artist:"Zabna",license:"CC BY-SA 4.0",
  licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
  alt:"Real photograph of tree planting in Kerala, not a verified Chaibasa news event"
 }
});

function card(story){
const node=mk("article","story");
const photo=story.synthetic?DEMO_PHOTOS[story.id]:null;
if(photo){
 const media=mk("figure","samplePhoto");
 const img=mk("img","samplePhotoImg");
 img.src=photo.image;img.alt=photo.alt;img.loading="lazy";img.decoding="async";
 img.width=520;img.height=320;img.referrerPolicy="no-referrer";
 img.addEventListener("error",()=>{media.classList.add("photoFallback");img.hidden=true;media.insertBefore(mk("div","photo",story.emoji||"📰"),media.firstChild);},{once:true});
 const caption=mk("figcaption","photoCredit");
 caption.appendChild(mk("strong","","ILLUSTRATIVE PHOTO · NOT THIS INCIDENT"));
 const source=mk("a","","Photo: "+photo.artist+" · "+photo.license);
 source.href=photo.source;source.target="_blank";source.rel="noopener noreferrer";
 source.title="Original Wikimedia Commons photograph and license details";
 caption.appendChild(source);
 media.append(img,caption);node.appendChild(media);
}else{
 const icon=mk("div","photo",story.emoji|| (story.kind==="civic"?"🛣️":"📰"));
 node.appendChild(icon);
}
const body=mk("div","body");
const cat=mk("span","tag "+(story.kind==="civic"?"issue":"news"),story.kind==="civic"?"CIVIC PROBLEM":"CITIZEN-REPORTED NEWS");
body.appendChild(cat);
if(story.synthetic)body.appendChild(mk("span","sampleBadge","SAMPLE DATA · FICTIONAL · NOT A REAL REPORT"));
if(story.national_featured)body.appendChild(mk("span","nationalTag","🇮🇳 "+(story.synthetic?"DEMO · ":"")+"OWNER FEATURED NATIONWIDE"));
body.appendChild(mk("h3","",story.headline||story.title||"Community update"));
const summaryText=story.synthetic?String(story.body||"Fictional demonstration only."):(story.kind==="civic"?"Public issue reported to JanSathi. Not an official government acknowledgement.":String(story.body||story.description||"Community-reported information, unverified by DBest."));
body.appendChild(mk("p","storyExcerpt",summaryText));
if(summaryText.length>115){const more=mk("button","expandStory","Read details");more.type="button";more.setAttribute("aria-expanded","false");more.onclick=()=>{const expanded=node.classList.toggle("storyExpanded");more.textContent=expanded?"Show less":"Read details";more.setAttribute("aria-expanded",String(expanded));};body.appendChild(more);}
body.appendChild(mk("div","muted","📍 "+story.public_area+" · "+story.city));
if(story.kind==="civic")body.appendChild(mk("span","status",story.synthetic?"SIMULATED status: "+(story.status||"dbest_received").replace(/_/g," "):"DBest status: "+(story.status||"dbest_received").replace(/_/g," ")));
const actions=mk("div","actions");
if(story.kind==="civic"){
 const voted=mySupportIds.has(story.id);
 const support=mk("button","mini supportIssueBtn",story.synthetic?
  "👍 Support Issue · "+(story.support_count||0)+" (DEMO)":
  (voted?"✓ Supported · ":"👍 Support Issue · ")+(story.support_count||0));
 support.setAttribute("aria-label",story.synthetic?"Fictional issue support example":voted?"Withdraw support for this issue":"Support this local issue");
 support.onclick=()=>supportIssue(story);
 actions.appendChild(support);
 const b=mk("button","mini","🔔 Follow issue");b.onclick=()=>follow(story.id);actions.appendChild(b);
}
const flag=mk("button","mini outline","⚑ Flag");flag.onclick=()=>flagPost(story);actions.appendChild(flag);body.appendChild(actions);node.appendChild(body);
return node;
}
function renderCards(){
const selected=(includeSamples?baseData:[]).concat(currentStories).filter(s=>placeMatch(s)&&(activeKind==="all"||activeKind===s.kind));
byId("feedCounter").textContent=selected.length+" posts for "+geo.scope+": "+(geo[geo.scope]||geo.state)+(includeSamples?" (fictional examples included)":" (database posts only)");
byId("feed").replaceChildren();
if(!selected.length){byId("feed").appendChild(mk("div","empty","No "+(ONLINE?"published":"sample")+" updates for these filters."));return;}
selected.forEach(s=>byId("feed").appendChild(card(s)));
}
async function refresh(){
try{
if(ONLINE){
const records=await api("/rest/v1/rpc/jansathi_visible_feed",{method:"POST",body:JSON.stringify(geoParams())});
currentStories=records.map(x=>({...x,emoji:x.kind==="civic"?"🛣️":"📰"}));byId("feedAlert").hidden=true;
}else{
currentStories=local.filter(x=>x.visibility!=="held").map(x=>Object.assign({},x));}
renderCards();
}catch(e){currentStories=[];byId("feedAlert").textContent="Live database unavailable: "+e.message+" — fictional examples are still available.";byId("feedAlert").hidden=false;renderCards();}
}
async function submitReport(e){
e.preventDefault();const form=e.target;const fd=new FormData(form);
const data={title:cleanText(fd.get("title")),city:cleanText(fd.get("city")),public_area:cleanText(fd.get("area")),town:cleanText(fd.get("city")),village:cleanText(fd.get("village")),block:cleanText(fd.get("block")),district:cleanText(fd.get("district")),state:cleanText(fd.get("state"))};
if(reportKind==="civic"){
 const pin=cleanText(fd.get("issue_pincode")),lat=cleanText(fd.get("issue_latitude")),lon=cleanText(fd.get("issue_longitude"));
 if(pin&&!/^[1-9][0-9]{5}$/.test(pin)){toast("Enter a six-digit issue PIN, or leave blank.");return;}
 if(Boolean(lat)!==Boolean(lon)){toast("Both public issue latitude and longitude must be supplied together.");return;}
 if(lat&&(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))){toast("Invalid issue coordinates.");return;}
 if(pin)data.issue_pincode=pin;if(lat){data.submitted_issue_latitude=Number(lat);data.submitted_issue_longitude=Number(lon);}
}
if(data.district.length<2||data.state.length<2||data.town.length<2){toast("State, district and town are required for accurate geographic visibility.");return;}
const content=cleanText(fd.get("body"));
if(data.title.length<8||content.length<15||data.public_area.length<3){toast("Please provide a meaningful title, public landmark, and details.");return;}
const values=reportKind==="civic"?
{...data,description:content,category:String(fd.get("category"))}:
{...data,body:content,category:String(fd.get("category"))};
try{
byId("send").disabled=true;
if(ONLINE){
if(!session)throw Error("Sign in to the isolated JanSathi Pilot before submitting.");
if(reportKind==="news"&&!paidNewsEligible)throw Error("Verified active DBest Promoter/Prime/Leader membership (₹299+) is required to publish news.");
const table=reportKind==="civic"?"jansathi_civic_reports":"jansathi_news_submissions";
await api("/rest/v1/"+table,{method:"POST",auth:true,headers:Object.assign(headers(true),{"Prefer":"return=representation"}),body:JSON.stringify(values)});
toast(reportKind==="civic"?"Report saved by JanSathi. NO government submission occurred.":"News saved. Routine news can publish automatically; sensitive posts are held for review.");
}else{
let unsafe=!safeIssue(data.title+" "+content+" "+data.public_area);
const item={id:"LOCAL-"+Date.now(),kind:reportKind==="civic"?"civic":"news",city:data.city,public_area:data.public_area,headline:data.title,body:content,description:content,emoji:reportKind==="civic"?"🛣️":"📰",status:"dbest_received",visibility:unsafe?"held":"published"};
local.unshift(item);try{localStorage.setItem(DEMO_STORAGE,JSON.stringify(local.slice(0,40)))}catch(e){}
toast(unsafe?"Saved privately in demo for moderation review.":"Saved in this browser only. This is not public publication or official delivery.");
}
form.reset();byId("modal").classList.remove("show");geo=Object.assign({},geo,{town:data.town,block:data.block,village:data.village,district:data.district,state:data.state});applyGeoFields();await refresh();if(ONLINE)await refreshMine();
}catch(err){toast("Submission not completed: "+err.message)}finally{refreshAccessUI();}
}
async function refreshMine(){
 const panel=byId("myReportsList");panel.replaceChildren();
 if(!ONLINE||!session)return;
 try{
  const [reports,news,schedules,history]=await Promise.all([
   api("/rest/v1/jansathi_civic_reports?select=id,title,status,city,created_at&order=created_at.desc&limit=40",{auth:true}),
   api("/rest/v1/jansathi_news_submissions?select=id,title,status,city,created_at&order=created_at.desc&limit=40",{auth:true}),
   api("/rest/v1/rpc/jansathi_my_civic_followup_schedule",{method:"POST",auth:true,body:"{}"}),
   api("/rest/v1/jansathi_civic_followups?select=id,report_id,body,observed_status,moderation_status,submitted_at&order=submitted_at.desc&limit=120",{auth:true})
  ]);
  const scheduleMap=new Map(schedules.map(s=>[s.report_id,s]));
  let own=[...reports.map(v=>({...v,kind:"Civic"})),...news.map(v=>({...v,kind:"News"}))].sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(!own.length){panel.appendChild(mk("p","muted","You have not submitted any civic reports or news yet."));return;}
  own.forEach(v=>{
   const row=mk("div","myreport");
   row.append(mk("b","",v.kind+" · "+v.title),
              mk("span","status","JanSathi: "+v.status.replace(/_/g," ")),
              mk("small","muted",v.city+" · "+localDate(v.created_at)));
   if(v.kind==="Civic"){
    const schedule=scheduleMap.get(v.id);
    if(schedule){
      const closed=["resolved","rejected"].includes(v.status);
      const canSubmit=!closed&&Date.now()>=Date.parse(schedule.next_eligible_at);
      row.append(mk("div","followupStatus","Severity: "+schedule.severity.toUpperCase()+" · Follow-up every "+
        cadenceText(schedule.cadence_hours)+" · "+schedule.citizen_update_count+" citizen update(s)"));
      row.append(mk("div","muted",closed?
        "This issue is closed or rejected: citizen updates disabled.":
        canSubmit?"✓ Update eligible now":("Next citizen update: "+localDate(schedule.next_eligible_at))));
      const previous=history.filter(h=>h.report_id===v.id);
      if(previous.length){
       const container=mk("div","followupHistory");container.append(mk("b","","Previous citizen updates"));
       previous.slice(0,8).forEach(h=>{
        const line=mk("div","followupPast");
        line.append(mk("small","muted",localDate(h.submitted_at)+" · "+h.observed_status.replace(/_/g," ")+" · "+h.moderation_status),
                    mk("span","",h.body));
        container.append(line);
       });
       row.append(container);
      }
      if(canSubmit){
       const form=mk("form","followupForm");
       form.append(mk("label","","What is the issue's current condition?"));
       const condition=mk("select","select");condition.required=true;
       [["still_unresolved","Still unresolved"],["improving","Improving"],["getting_worse","Getting worse"],["appears_fixed","Appears fixed (unverified)"]].forEach(pair=>{
        const o=mk("option","",pair[1]);o.value=pair[0];condition.append(o);
       });
       const label=mk("label","","Your latest factual observation (20–1000 characters)");
       const note=mk("textarea","");note.minLength=20;note.maxLength=1000;note.required=true;
       note.placeholder="Describe what changed and when you observed it. Avoid names, phone numbers or accusations.";
       const btn=mk("button","btn","Submit citizen update");btn.type="submit";
       form.append(condition,label,note,btn);
       form.onsubmit=async e=>{
        e.preventDefault();
        const detail=cleanText(note.value);
        if(detail.length<20){toast("Write at least 20 characters about the issue.");return;}
        btn.disabled=true;
        try{
          await api("/rest/v1/rpc/jansathi_submit_civic_followup",
           {method:"POST",auth:true,body:JSON.stringify({p_report_id:v.id,p_body:detail,p_observed_status:condition.value})});
          toast("Citizen follow-up saved privately for review. Government issue status was not changed.");
          await refreshMine();
        }catch(err){toast("Update not accepted: "+err.message);btn.disabled=false;}
       };
       row.append(form);
      }
    }else{
     row.append(mk("p","muted","Follow-up schedule is not available for this issue."));
    }
   }
   panel.append(row);
  });
 }catch(e){panel.appendChild(mk("p","muted","Could not load your private follow-up schedules: "+e.message));}
}
byId("refreshMine").onclick=()=>refreshMine();
async function follow(reportId){
if(String(reportId).startsWith("demo-")){toast("This issue is FICTIONAL. Following it would create a notification only for a real report.");return;}
if(!ONLINE){toast("Following is demonstrated only; no shared notifications yet.");return;}
try{await api("/rest/v1/jansathi_follows",{method:"POST",auth:true,headers:Object.assign(headers(true),{"Prefer":"return=minimal"}),body:JSON.stringify({report_id:reportId})});toast("You are following this public issue.");}
catch(e){toast("Could not follow: "+e.message);}
}
async function flagPost(story){
if(story.synthetic){toast("Fictional sample content cannot be flagged. Real posts have the Flag option.");return;}
if(!ONLINE){toast("Demo flag recorded locally for illustration only.");return;}
const reason=prompt("Briefly explain why this post needs review (minimum 5 characters):");
if(!reason)return;if(cleanText(reason).length<5){toast("Please enter at least five characters.");return;}
try{await api("/rest/v1/jansathi_abuse_flags",{method:"POST",auth:true,body:JSON.stringify({content_kind:story.kind==="news"?"news":"civic",content_id:story.id,reason:cleanText(reason)})});toast("Flag sent for editorial review.");}
catch(e){toast("Could not flag post: "+e.message);}
}
document.querySelectorAll("[data-kind]").forEach(b=>b.addEventListener("click",()=>{activeKind=b.dataset.kind;document.querySelectorAll("[data-kind]").forEach(x=>x.classList.toggle("active",x===b));renderCards()}));
byId("city").addEventListener("change",async e=>{const p=placePresets[e.target.value];if(p){geo=Object.assign({},geo,p,{scope:"town",village:""});applyGeoFields();await refresh();}});
byId("includeSamples").addEventListener("change",e=>{includeSamples=e.target.checked;renderCards();});
byId("fillExample").onclick=()=>{
const example=reportKind==="civic"?{title:"[DEMO] Example damaged community path",body:"FICTIONAL ISSUE: A pretend public pathway near a sample school gate needs repair. No actual complaint will be filed by filling this form.",area:"Imaginary school approach",category:"road"}:{title:"[DEMO] Sample community reading event",body:"FICTIONAL EXAMPLE: Members of a pretend neighbourhood gather to exchange books and discuss local stories. This event is not real.",area:"Example community hall",category:"community"};
byId("title").value=example.title;byId("body").value=example.body;byId("area").value=example.area;byId("category").value=example.category;toast("Synthetic example filled. It has NOT been submitted.");};
document.querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>{reportKind=b.dataset.report;if(ONLINE&&!session){
  const drawer=byId("loginDrawer");drawer.open=true;
  drawer.scrollIntoView({behavior:"smooth",block:"center"});
  toast("Sign in to the JanSathi test account first. Live DBest single sign-on is not connected yet.");return;
 }
 if(ONLINE&&reportKind==="news"&&!paidNewsEligible){
  toast("News publishing requires an active DBest ₹299+ plan and approved KYC, verified by the server.");return;
 }byId("modalTitle").textContent=reportKind==="civic"?"Report a civic problem":"Post local news or event";const categories=reportKind==="civic"?["road","drainage","streetlight","garbage","water","other"]:["community","health","education","sports","festival","traffic","other"];byId("category").replaceChildren();categories.forEach(x=>{let o=mk("option","",x);o.value=x;byId("category").appendChild(o)});byId("reportCity").value=geo.town;byId("reportTown").value=geo.town;byId("reportState").value=geo.state;byId("reportDistrict").value=geo.district;byId("reportBlock").value=geo.block;byId("reportVillage").value=geo.village;byId("modal").classList.add("show");refreshAccessUI()}));
byId("close").onclick=()=>byId("modal").classList.remove("show");byId("modal").addEventListener("click",e=>{if(e.target.id==="modal")byId("modal").classList.remove("show")});document.addEventListener("keydown",e=>{if(e.key==="Escape")byId("modal").classList.remove("show")});
byId("reportForm").addEventListener("submit",submitReport);
byId("refresh").onclick=refresh;
byId("signup").onclick=async()=>{
 const email=cleanText(byId("email").value),password=byId("password").value;
 if(!email.includes("@")||password.length<10){toast("Enter a valid email and a password of at least 10 characters.");return;}
 try{
  const data=await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});
  if(data.access_token){storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Test account created and signed in. Membership status will be checked.");await Promise.all([refreshMine(),refreshEligibility(),refreshOwnerAccess(),refreshSupportState()]);}
  else toast("Check your email for the Supabase confirmation link, then return and use Sign in.");
 }catch(e){toast("Sign-up failed: "+e.message)}
};
byId("login").onclick=async()=>{
 const email=cleanText(byId("email").value),password=byId("password").value;
 if(!email.includes("@")||!password){toast("Enter your test-account email and password.");return;}
 try{
  const data=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
  if(!data.access_token)throw Error("No access token received");
  storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});
  toast("Signed in to JanSathi Pilot.");await Promise.all([refreshMine(),refreshEligibility(),refreshOwnerAccess(),refreshSupportState()]);
 }catch(e){toast("Sign-in failed: "+e.message)}
};
byId("sendCode").onclick=async()=>{
 const email=cleanText(byId("email").value);if(!email.includes("@")){toast("Enter a valid email address.");return;}
 try{await api("/auth/v1/otp",{method:"POST",body:JSON.stringify({email,create_user:true})});toast("Check your email. Depending on Supabase settings, you may receive a magic link rather than a six-digit code.");}
 catch(e){toast("Email request failed: "+e.message)}
};
byId("verify").onclick=async()=>{
 let email=cleanText(byId("email").value),token=cleanText(byId("code").value);
 if(!token){toast("Enter the email OTP only if your email contained a numerical code.");return;}
 try{const data=await api("/auth/v1/verify",{method:"POST",body:JSON.stringify({email,token,type:"email"})});if(!data.access_token)throw Error("No session token returned");storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Signed in to JanSathi Pilot");await Promise.all([refreshMine(),refreshEligibility(),refreshOwnerAccess(),refreshSupportState()]);}
 catch(e){toast("Verification failed: "+e.message)}
};
byId("logout").onclick=async()=>{
 if(session?.access_token){try{await api("/auth/v1/logout",{method:"POST",auth:true});}catch(e){}}
 storeSession(null);updateSupportLocalityStatus();renderCards();ownerCanFeature=false;byId("ownerNationalPanel").hidden=true;byId("ownerSeverityPanel").hidden=true;byId("ownerGeoPanel").hidden=true;byId("myReportsList").replaceChildren();byId("membershipDetail").textContent="Sign in to check membership status.";toast("Signed out.");
};
if(ONLINE&&session)Promise.all([refreshMine(),refreshEligibility(),refreshOwnerAccess(),refreshSupportState()]);
else updateSupportLocalityStatus();
refresh();
})();