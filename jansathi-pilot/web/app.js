(function(){
"use strict";
const CONFIG=window.JANSATHI_STAGE_CONFIG||{};
const ONLINE=!!(CONFIG.url&&CONFIG.publishableKey);
const API=String(CONFIG.url||"").replace(/\/$/,"");
const KEY=String(CONFIG.publishableKey||"");
const AUTH_STORAGE="dbest-jansathi-stage-session";
const DEMO_STORAGE="dbest-jansathi-stage-demo";

const byId=id=>document.getElementById(id);
const baseData=[{"kind":"news","id":"demo-news-ckp-1","city":"Chakradharpur","public_area":"Imaginary community hall","headline":"[DEMO] Community art workshop announced","body":"FICTIONAL EXAMPLE: A model neighbourhood plans a drawing and craft workshop for families. This is sample content only; no real event is announced.","category":"community","emoji":"🎨","synthetic":true},{"kind":"news","id":"demo-news-ckp-2","city":"Chakradharpur","public_area":"Illustrative school grounds","headline":"[DEMO] Students prepare a science exhibition","body":"FICTIONAL EXAMPLE: A sample school showcases simple science models, recycling ideas and local innovation during an imaginary exhibition. Not an actual school announcement.","category":"education","emoji":"🔬","synthetic":true},{"kind":"news","id":"demo-news-ckp-3","city":"Chakradharpur","public_area":"Sample public sports field","headline":"[DEMO] Friendly neighbourhood sports meet","body":"FICTIONAL EXAMPLE: A make-believe sports day includes badminton, volleyball and children's activities. No event is scheduled.","category":"sports","emoji":"🏅","synthetic":true},{"kind":"civic","id":"demo-issue-ckp-1","city":"Chakradharpur","public_area":"Imaginary market road","headline":"[DEMO] Streetlight not working in sample lane","body":"FICTIONAL ISSUE: An imaginary streetlight needs inspection. No complaint was filed.","category":"streetlight","status":"dbest_received","emoji":"💡","synthetic":true},{"kind":"civic","id":"demo-issue-ckp-2","city":"Chakradharpur","public_area":"Illustrative bus stop area","headline":"[DEMO] Sample pothole near bus stop","body":"FICTIONAL ISSUE: An example pothole is described solely for interface testing. No authority was contacted.","category":"road","status":"dbest_received","emoji":"🛣️","synthetic":true},{"kind":"news","id":"demo-news-chaibasa-1","city":"Chaibasa","public_area":"Example civic reading room","headline":"[DEMO] Community book-exchange gathering","body":"FICTIONAL EXAMPLE: Neighbours in a mock locality exchange books and share reading suggestions. This is not an actual announcement.","category":"education","emoji":"📚","synthetic":true},{"kind":"news","id":"demo-news-chaibasa-2","city":"Chaibasa","public_area":"Illustrative community garden","headline":"[DEMO] Tree-planting awareness activity","body":"FICTIONAL EXAMPLE: A demonstration group discusses the benefits of planting native trees in a model garden.","category":"community","emoji":"🌿","synthetic":true},{"kind":"civic","id":"demo-issue-chaibasa-1","city":"Chaibasa","public_area":"Imaginary ward street","headline":"[DEMO] Example blocked drainage channel","body":"FICTIONAL ISSUE: A hypothetical drain needs cleaning. This did not happen at a real address.","category":"drainage","status":"dbest_received","emoji":"🚰","synthetic":true},{"kind":"news","id":"demo-news-jsr-1","city":"Jamshedpur","public_area":"Sample public recreation area","headline":"[DEMO] Weekend fitness and cycling session","body":"FICTIONAL EXAMPLE: An imaginary neighbourhood conducts a cycling-safety and wellness discussion. No real session is advertised.","category":"health","emoji":"🚲","synthetic":true},{"kind":"news","id":"demo-news-jsr-2","city":"Jamshedpur","public_area":"Imaginary youth club","headline":"[DEMO] Youth skill-sharing meetup","body":"FICTIONAL EXAMPLE: A sample community invites volunteers to share basic computer and communication skills.","category":"education","emoji":"💻","synthetic":true},{"kind":"civic","id":"demo-issue-jsr-1","city":"Jamshedpur","public_area":"Example park approach","headline":"[DEMO] Garbage collection request in sample lane","body":"FICTIONAL ISSUE: An imaginary street requires garbage pickup. No service request has been registered.","category":"garbage","status":"dbest_received","emoji":"🗑️","synthetic":true},{"kind":"news","id":"demo-news-ranchi-1","city":"Ranchi","public_area":"Illustrative cultural centre","headline":"[DEMO] Local crafts exhibition showcase","body":"FICTIONAL EXAMPLE: Mock artisans exhibit handmade products and demonstrate traditional crafts at an imaginary event.","category":"community","emoji":"🧵","synthetic":true},{"kind":"news","id":"demo-news-ranchi-2","city":"Ranchi","public_area":"Example public learning hub","headline":"[DEMO] Digital literacy awareness session","body":"FICTIONAL EXAMPLE: An imaginary neighbourhood organizes introductory mobile safety and internet literacy activities.","category":"education","emoji":"📱","synthetic":true},{"kind":"civic","id":"demo-issue-ranchi-1","city":"Ranchi","public_area":"Imaginary park entrance","headline":"[DEMO] Example footpath needs repairs","body":"FICTIONAL ISSUE: A pretend uneven footpath is shown to illustrate issue tracking; no complaint exists.","category":"road","status":"dbest_received","emoji":"🚶","synthetic":true}];
let local=[];try{local=JSON.parse(localStorage.getItem(DEMO_STORAGE)||"[]")}catch(e){}
let session=null;try{session=JSON.parse(sessionStorage.getItem(AUTH_STORAGE)||"null")}catch(e){}
let paidNewsEligible=false;
function storeSession(value){
 session=value;
 if(value){sessionStorage.setItem(AUTH_STORAGE,JSON.stringify(value));}
 else {sessionStorage.removeItem(AUTH_STORAGE);paidNewsEligible=false;}
 renderAuth();refreshAccessUI();
}
function renderAuth(){
 if(!ONLINE)return;
 byId("sessionLabel").textContent=session&&session.access_token?"Pilot account signed in; your publishing rights are checked from the database.":"Sign in with a pilot account to submit a verified civic report. Main DBest membership handoff is not connected.";
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
function card(story){
const node=mk("article","story");
const icon=mk("div","photo",story.emoji|| (story.kind==="civic"?"🛣️":"📰"));
node.appendChild(icon);
const body=mk("div","body");
const cat=mk("span","tag "+(story.kind==="civic"?"issue":"news"),story.kind==="civic"?"CIVIC PROBLEM":"CITIZEN-REPORTED NEWS");
body.appendChild(cat);
if(story.synthetic)body.appendChild(mk("span","sampleBadge","SAMPLE DATA · FICTIONAL · NOT A REAL REPORT"));
body.appendChild(mk("h3","",story.headline||story.title||"Community update"));
body.appendChild(mk("p","",story.synthetic?String(story.body||"Fictional demonstration only."):(story.kind==="civic"?"Public issue reported to JanSathi. Not an official government acknowledgement.":String(story.body||story.description||"Community-reported information, unverified by DBest."))));
body.appendChild(mk("div","muted","📍 "+story.public_area+" · "+story.city));
if(story.kind==="civic")body.appendChild(mk("span","status",story.synthetic?"SIMULATED status: "+(story.status||"dbest_received").replace(/_/g," "):"DBest status: "+(story.status||"dbest_received").replace(/_/g," ")));
const actions=mk("div","actions");
if(story.kind==="civic"){const b=mk("button","mini","🔔 Follow issue");b.onclick=()=>follow(story.id);actions.appendChild(b);}
const flag=mk("button","mini outline","⚑ Flag");flag.onclick=()=>flagPost(story);actions.appendChild(flag);body.appendChild(actions);node.appendChild(body);
return node;
}
function renderCards(){
const selected=(includeSamples?baseData:[]).concat(currentStories).filter(s=>s.city===activeCity&&(activeKind==="all"||activeKind===s.kind));
byId("feedCounter").textContent=selected.length+" posts for "+activeCity+(includeSamples?" (including fictional examples)":" (database posts only)");
byId("feed").replaceChildren();
if(!selected.length){byId("feed").appendChild(mk("div","empty","No "+(ONLINE?"published":"sample")+" updates for these filters."));return;}
selected.forEach(s=>byId("feed").appendChild(card(s)));
}
async function refresh(){
try{
if(ONLINE){
const [civic,news]=await Promise.all([
api("/rest/v1/jansathi_civic_feed?select=id,category,headline,city,public_area,status,created_at&order=created_at.desc&limit=100"),
api("/rest/v1/jansathi_news_feed?select=id,category,headline,body,city,public_area,created_at&order=created_at.desc&limit=100")
]);
currentStories=[...civic.map(x=>({...x,kind:"civic",emoji:"🛣️"})),...news.map(x=>({...x,kind:"news",emoji:"📰"}))].sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||""));
}else{
currentStories=local.filter(x=>x.visibility!=="held").map(x=>Object.assign({},x));}
renderCards();
}catch(e){currentStories=[];byId("feedAlert").textContent="Live database unavailable: "+e.message+" — fictional examples are still available.";byId("feedAlert").hidden=false;renderCards();}
}
async function submitReport(e){
e.preventDefault();const form=e.target;const fd=new FormData(form);
const data={title:cleanText(fd.get("title")),city:cleanText(fd.get("city")),public_area:cleanText(fd.get("area"))};
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
form.reset();byId("modal").classList.remove("show");activeCity=data.city;byId("city").value=activeCity;await refresh();if(ONLINE)await refreshMine();
}catch(err){toast("Submission not completed: "+err.message)}finally{refreshAccessUI();}
}
async function refreshMine(){
 const panel=byId("myReportsList");panel.replaceChildren();
 if(!ONLINE || !session){return;}
 try {
  const [reports,news]=await Promise.all([
   api("/rest/v1/jansathi_civic_reports?select=id,title,status,city,public_area,created_at&order=created_at.desc&limit=40",{auth:true}),
   api("/rest/v1/jansathi_news_submissions?select=id,title,status,city,created_at&order=created_at.desc&limit=40",{auth:true})
  ]);
  let own=[...reports.map(x=>({...x,kind:"Civic"})),...news.map(x=>({...x,kind:"News"}))].sort((a,b)=>b.created_at.localeCompare(a.created_at));
  if(!own.length){panel.appendChild(mk("p","muted","Your account has no submissions yet."));return;}
  own.forEach(v=>{
   const row=mk("div","myreport");
   row.append(mk("b","",v.kind+" · "+v.title),mk("span","status","JanSathi: "+v.status.replace(/_/g," ")),mk("small","muted",v.city+" · "+new Date(v.created_at).toLocaleDateString()));
   panel.appendChild(row);
  });
 }catch(e){panel.appendChild(mk("p","muted","Unable to load private reports: "+e.message));}
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
byId("city").addEventListener("change",e=>{activeCity=e.target.value;renderCards()});
byId("includeSamples").addEventListener("change",e=>{includeSamples=e.target.checked;renderCards();});
byId("fillExample").onclick=()=>{
const example=reportKind==="civic"?{title:"[DEMO] Example damaged community path",body:"FICTIONAL ISSUE: A pretend public pathway near a sample school gate needs repair. No actual complaint will be filed by filling this form.",area:"Imaginary school approach",category:"road"}:{title:"[DEMO] Sample community reading event",body:"FICTIONAL EXAMPLE: Members of a pretend neighbourhood gather to exchange books and discuss local stories. This event is not real.",area:"Example community hall",category:"community"};
byId("title").value=example.title;byId("body").value=example.body;byId("area").value=example.area;byId("category").value=example.category;toast("Synthetic example filled. It has NOT been submitted.");};
document.querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>{reportKind=b.dataset.report;byId("modalTitle").textContent=reportKind==="civic"?"Report a civic problem":"Post local news or event";const categories=reportKind==="civic"?["road","drainage","streetlight","garbage","water","other"]:["community","health","education","sports","festival","traffic","other"];byId("category").replaceChildren();categories.forEach(x=>{let o=mk("option","",x);o.value=x;byId("category").appendChild(o)});byId("reportCity").value=activeCity;byId("modal").classList.add("show");refreshAccessUI()}));
byId("close").onclick=()=>byId("modal").classList.remove("show");byId("modal").addEventListener("click",e=>{if(e.target.id==="modal")byId("modal").classList.remove("show")});document.addEventListener("keydown",e=>{if(e.key==="Escape")byId("modal").classList.remove("show")});
byId("reportForm").addEventListener("submit",submitReport);
byId("refresh").onclick=refresh;
byId("signup").onclick=async()=>{
 const email=cleanText(byId("email").value),password=byId("password").value;
 if(!email.includes("@")||password.length<10){toast("Enter a valid email and a password of at least 10 characters.");return;}
 try{
  const data=await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});
  if(data.access_token){storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Test account created and signed in. Membership status will be checked.");await Promise.all([refreshMine(),refreshEligibility()]);}
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
  toast("Signed in to JanSathi Pilot.");await Promise.all([refreshMine(),refreshEligibility()]);
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
 try{const data=await api("/auth/v1/verify",{method:"POST",body:JSON.stringify({email,token,type:"email"})});if(!data.access_token)throw Error("No session token returned");storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Signed in to JanSathi Pilot");await Promise.all([refreshMine(),refreshEligibility()]);}
 catch(e){toast("Verification failed: "+e.message)}
};
byId("logout").onclick=async()=>{
 if(session?.access_token){try{await api("/auth/v1/logout",{method:"POST",auth:true});}catch(e){}}
 storeSession(null);byId("myReportsList").replaceChildren();byId("membershipDetail").textContent="Sign in to check membership status.";toast("Signed out.");
};
if(ONLINE&&session)Promise.all([refreshMine(),refreshEligibility()]);
refresh();
})();