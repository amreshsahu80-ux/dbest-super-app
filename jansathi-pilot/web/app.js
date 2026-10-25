(function(){
"use strict";
const CONFIG=window.JANSATHI_STAGE_CONFIG||{};
const ONLINE=!!(CONFIG.url&&CONFIG.publishableKey);
const API=String(CONFIG.url||"").replace(/\/$/,"");
const KEY=String(CONFIG.publishableKey||"");
const AUTH_STORAGE="dbest-jansathi-stage-session";
const DEMO_STORAGE="dbest-jansathi-stage-demo";

const byId=id=>document.getElementById(id);
const baseData=[
{kind:"civic",id:"demo-1",city:"Chakradharpur",public_area:"Illustrative market road",headline:"Example damaged public road",category:"road",status:"dbest_received",emoji:"🛣️",date:"Example"},
{kind:"news",id:"demo-2",city:"Chakradharpur",public_area:"Illustrative public hall",headline:"Example community health event",body:"Fictional local announcement, not a real scheduled event.",category:"health",emoji:"❤️",date:"Example"},
{kind:"civic",id:"demo-3",city:"Chaibasa",public_area:"Illustrative ward",headline:"Example drainage complaint",category:"drainage",status:"dbest_received",emoji:"🕳️",date:"Example"},
{kind:"news",id:"demo-4",city:"Jamshedpur",public_area:"Example public ground",headline:"Example neighbourhood sports meet",body:"Fictional community event.",category:"sports",emoji:"🏅",date:"Example"},
{kind:"news",id:"demo-5",city:"Ranchi",public_area:"Example community hall",headline:"Example book discussion",body:"Fictional community news.",category:"community",emoji:"📚",date:"Example"}
];
let local=[];try{local=JSON.parse(localStorage.getItem(DEMO_STORAGE)||"[]")}catch(e){}
let session=null;try{session=JSON.parse(sessionStorage.getItem(AUTH_STORAGE)||"null")}catch(e){}
function storeSession(value){session=value; if(value){sessionStorage.setItem(AUTH_STORAGE,JSON.stringify(value));}else{sessionStorage.removeItem(AUTH_STORAGE);}renderAuth();}
function renderAuth(){if(!ONLINE)return;byId("sessionLabel").textContent=session&&session.access_token?"Test account signed in. You may submit and view your reports.":"Sign in using an isolated test account. This does not use your DBest login.";byId("myReportsPanel").hidden=!(session&&session.access_token);}
async function refreshTokenIfNeeded(){
 if(!session||!session.access_token)throw Error("Please sign in to the isolated JanSathi pilot first.");
 if(session.expires_at && session.expires_at>Math.floor(Date.now()/1000)+90)return;
 if(!session.refresh_token){storeSession(null);throw Error("Your login expired. Please sign in again.");}
 const res=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
 const token=await res.json();
 if(!res.ok||!token.access_token){storeSession(null);throw Error("Your session expired. Please sign in again.");}
 storeSession({access_token:token.access_token,refresh_token:token.refresh_token,expires_at:Math.floor(Date.now()/1000)+(token.expires_in||3600)});
}
let activeCity="Chakradharpur",activeKind="all",reportKind="civic",currentStories=[];
byId("mode").textContent=ONLINE?"ISOLATED DATABASE MODE":"DEMO ONLY · BROWSER DATA";
byId("systemStatus").textContent=ONLINE?"Connected to the isolated DBest JanSathi Pilot Free database. Test environment ONLY; no government submissions or live DBest logins.":"No Supabase configured. All reports are local to this browser only.";
if(ONLINE){byId("identity").hidden=false;renderAuth();}else{byId("identity").hidden=true;}
function toast(txt){const n=byId("toast");n.textContent=txt;n.classList.add("on");clearTimeout(window._tip);window._tip=setTimeout(()=>n.classList.remove("on"),4000);}
function mk(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;}
function cleanText(t){return String(t||"").trim();}
function safeIssue(t){return !/(?:\b(?:rape|murder|fraud|suicide|assault|riot|scam|terror|corrupt)\b|हत्या|आरोप|मौत|घोटाला|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?[0-9][0-9 -]{8,}[0-9])/i.test(t);}
function headers(auth){const h={"apikey":KEY,"Content-Type":"application/json"};if(auth){if(!session||!session.access_token)throw Error("Sign in using the isolated pilot project before submitting");h.Authorization="Bearer "+session.access_token;}return h;}
async function api(path,opts={}){
if(opts.auth)await refreshTokenIfNeeded(); const request=Object.assign({method:"GET",headers:headers(!!opts.auth)},opts);
delete request.auth;const res=await fetch(API+path,request);let parsed={};let raw=await res.text();try{parsed=raw?JSON.parse(raw):{}}catch(e){parsed={message:raw.slice(0,150)}}if(!res.ok)throw Error(parsed.msg||parsed.error_description||parsed.message||parsed.error||("Request failed ("+res.status+")"));return parsed;
}
function card(story){
const node=mk("article","story");
const icon=mk("div","photo",story.emoji|| (story.kind==="civic"?"🛣️":"📰"));
node.appendChild(icon);
const body=mk("div","body");
const cat=mk("span","tag "+(story.kind==="civic"?"issue":"news"),story.kind==="civic"?"CIVIC PROBLEM":"CITIZEN-REPORTED NEWS");
body.appendChild(cat);
body.appendChild(mk("h3","",story.headline||story.title||"Community update"));
body.appendChild(mk("p","",story.kind==="civic"?"Public issue reported to JanSathi. Not an official government acknowledgement.":String(story.body||story.description||"Community-reported information, unverified by DBest.")));
body.appendChild(mk("div","muted","📍 "+story.public_area+" · "+story.city));
if(story.kind==="civic")body.appendChild(mk("span","status","DBest status: "+(story.status||"dbest_received").replace(/_/g," ")));
const actions=mk("div","actions");
if(story.kind==="civic"){const b=mk("button","mini","🔔 Follow issue");b.onclick=()=>follow(story.id);actions.appendChild(b);}
const flag=mk("button","mini outline","⚑ Flag");flag.onclick=()=>flagPost(story);actions.appendChild(flag);body.appendChild(actions);node.appendChild(body);
return node;
}
function renderCards(){
const selected=currentStories.filter(s=>s.city===activeCity&&(activeKind==="all"||activeKind===s.kind));
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
currentStories=baseData.concat(local.filter(x=>x.visibility!=="held")).map(x=>Object.assign({},x));}
renderCards();
}catch(e){byId("feed").replaceChildren(mk("div","empty","Cannot read the isolated database: "+e.message));}
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
}catch(err){toast("Submission not completed: "+err.message)}finally{byId("send").disabled=false;}
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
if(!ONLINE){toast("Following is demonstrated only; no shared notifications yet.");return;}
try{await api("/rest/v1/jansathi_follows",{method:"POST",auth:true,headers:Object.assign(headers(true),{"Prefer":"return=minimal"}),body:JSON.stringify({report_id:reportId})});toast("You are following this public issue.");}
catch(e){toast("Could not follow: "+e.message);}
}
async function flagPost(story){
if(!ONLINE){toast("Demo flag recorded locally for illustration only.");return;}
const reason=prompt("Briefly explain why this post needs review (minimum 5 characters):");
if(!reason)return;if(cleanText(reason).length<5){toast("Please enter at least five characters.");return;}
try{await api("/rest/v1/jansathi_abuse_flags",{method:"POST",auth:true,body:JSON.stringify({content_kind:story.kind==="news"?"news":"civic",content_id:story.id,reason:cleanText(reason)})});toast("Flag sent for editorial review.");}
catch(e){toast("Could not flag post: "+e.message);}
}
document.querySelectorAll("[data-kind]").forEach(b=>b.addEventListener("click",()=>{activeKind=b.dataset.kind;document.querySelectorAll("[data-kind]").forEach(x=>x.classList.toggle("active",x===b));renderCards()}));
byId("city").addEventListener("change",e=>{activeCity=e.target.value;renderCards()});
document.querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>{reportKind=b.dataset.report;byId("modalTitle").textContent=reportKind==="civic"?"Report a civic problem":"Post local news or event";const categories=reportKind==="civic"?["road","drainage","streetlight","garbage","water","other"]:["community","health","education","sports","festival","traffic","other"];byId("category").replaceChildren();categories.forEach(x=>{let o=mk("option","",x);o.value=x;byId("category").appendChild(o)});byId("reportCity").value=activeCity;byId("modal").classList.add("show")}));
byId("close").onclick=()=>byId("modal").classList.remove("show");byId("modal").addEventListener("click",e=>{if(e.target.id==="modal")byId("modal").classList.remove("show")});document.addEventListener("keydown",e=>{if(e.key==="Escape")byId("modal").classList.remove("show")});
byId("reportForm").addEventListener("submit",submitReport);
byId("refresh").onclick=refresh;
byId("signup").onclick=async()=>{
 const email=cleanText(byId("email").value),password=byId("password").value;
 if(!email.includes("@")||password.length<10){toast("Enter a valid email and a password of at least 10 characters.");return;}
 try{
  const data=await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});
  if(data.access_token){storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Test account created and signed in.");await refreshMine();}
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
  toast("Signed in to JanSathi Pilot.");await refreshMine();
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
 try{const data=await api("/auth/v1/verify",{method:"POST",body:JSON.stringify({email,token,type:"email"})});if(!data.access_token)throw Error("No session token returned");storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)});toast("Signed in to JanSathi Pilot");await refreshMine();}
 catch(e){toast("Verification failed: "+e.message)}
};
byId("logout").onclick=async()=>{
 if(session?.access_token){try{await api("/auth/v1/logout",{method:"POST",auth:true});}catch(e){}}
 storeSession(null);byId("myReportsList").replaceChildren();toast("Signed out.");
};
if(ONLINE&&session)refreshMine();
refresh();
})();