(function(){
'use strict';
const VERSION='1.0.0';
const JOB_ID='jobs';
const HYPER=[
  {key:'maid',title:'Maid / House Help',icon:'🧹',requestLabel:'Work Required',requestOptions:['One-time House Cleaning','Regular House Help','Utensils / Cleaning','Cooking Assistance','Deep Cleaning Help','Elderly / Home Assistance','Other']},
  {key:'electrician',title:'Electrician',icon:'⚡',requestLabel:'Electrical Work',requestOptions:['Power / MCB Issue','Switch / Socket Repair','Fan / Light Repair','New Wiring','Appliance Connection','Installation Work','Other']},
  {key:'plumber',title:'Plumber',icon:'🔧',requestLabel:'Plumbing Work',requestOptions:['Water Leakage','Tap / Shower Repair','Toilet Repair','Drain Blockage','Pipe Fitting','Water Tank / Motor Line','Installation Work','Other']},
  {key:'refrigerator',title:'Refrigerator Mechanic',icon:'🧊',requestLabel:'Refrigerator Issue',requestOptions:['Not Cooling','Excess Ice / Frost','Water Leakage','Compressor / Noise Issue','Gas / Cooling Check','Door / Thermostat Issue','General Service','Other']},
  {key:'ac',title:'AC Mechanic',icon:'❄️',requestLabel:'AC Service Required',requestOptions:['AC General Service','Not Cooling','Installation','Uninstallation','Water Leakage','Gas / Cooling Check','Noise / Electrical Issue','Other']}
];
const REQUIRED=[...HYPER.map(x=>x.title),'Job Search','Job Application'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notify(m){try{typeof toast==='function'?toast(m):console.log(m)}catch(e){console.log(m)}}
function member(){try{return typeof me==='function'?(me()||{}):{}}catch(e){return{}}}
function mergeRequired(existing){const a=Array.isArray(existing)?existing:[];const extras=a.filter(x=>!REQUIRED.some(r=>String(r).toLowerCase()===String(x).toLowerCase())&&!['Job Search','Job Application'].includes(String(x)));return [...REQUIRED,...extras]}
function applyStructure(){
  try{
    if(typeof services!=='undefined'&&Array.isArray(services)){
      const s=services.find(x=>x&&x[0]===JOB_ID);
      if(s){s[1]='Home Jobs & Local Services';s[4]='Hyperlocal home services, local professionals, jobs and hiring assistance';s[5]=mergeRequired(s[5])}
    }
    if(typeof serviceControl!=='undefined'&&serviceControl){
      const c=serviceControl[JOB_ID]||{};
      serviceControl[JOB_ID]={...c,title:c.title&&c.title!=='Home Jobs'?c.title:'Home Jobs & Local Services',description:c.description&&c.description!=='Jobs, applications and local hiring'?c.description:'Hyperlocal home services, local professionals, jobs and hiring assistance',subsections:mergeRequired(c.subsections),visible:c.visible!==false};
    }
  }catch(e){console.warn('DBest hyperlocal structure',e)}
}
function commonFields(){const u=member();return `
  <div class="sf"><label>Full Name *</label><input name="name" value="${esc(u.name||'')}" required></div>
  <div class="sf"><label>Mobile *</label><input name="mobile" type="tel" value="${esc(u.mobile||'')}" required></div>
  <div class="sf"><label>Email ID</label><input name="email" type="email" value="${esc(u.email||'')}"></div>
  <div class="sf full"><label>Service Address / Landmark *</label><textarea name="address" rows="3" required placeholder="House / Flat, Road, Landmark, Area"></textarea></div>
  <div class="sf"><label>City *</label><input name="city" required></div>
  <div class="sf"><label>PIN Code *</label><input name="pincode" inputmode="numeric" required></div>
  <div class="sf"><label>Preferred Date *</label><input name="preferredDate" type="date" required></div>
  <div class="sf"><label>Preferred Time Slot *</label><select name="preferredSlot" required><option value="">Select</option><option>8 AM – 11 AM</option><option>11 AM – 2 PM</option><option>2 PM – 5 PM</option><option>5 PM – 8 PM</option><option>As Soon As Possible</option></select></div>
  <div class="sf"><label>Urgency</label><select name="urgency"><option>Normal</option><option>Today</option><option>Urgent / Emergency</option></select></div>`}
function serviceExtra(def){
  if(def.key==='maid')return `<div class="sf"><label>Frequency</label><select name="frequency"><option>One Time</option><option>Daily</option><option>Alternate Days</option><option>Weekly</option><option>Monthly</option></select></div><div class="sf"><label>Approx. Hours / Day</label><input name="hours" placeholder="e.g. 2 hours"></div>`;
  if(def.key==='refrigerator')return `<div class="sf"><label>Brand</label><input name="brand" placeholder="e.g. LG / Samsung / Whirlpool"></div><div class="sf"><label>Model / Capacity</label><input name="model" placeholder="Optional"></div>`;
  if(def.key==='ac')return `<div class="sf"><label>AC Type</label><select name="acType"><option>Split AC</option><option>Window AC</option><option>Cassette / Commercial</option><option>Other</option></select></div><div class="sf"><label>Brand / Tonnage</label><input name="brand" placeholder="e.g. 1.5 Ton LG"></div>`;
  return '';
}
function openHyper(index){
  applyStructure();const def=HYPER[index];if(!def)return;
  try{if(typeof requireMember==='function'&&!requireMember())return}catch(e){}
  if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return notify('Service screen is not ready. Please retry.');
  const options=def.requestOptions.map(x=>`<option>${esc(x)}</option>`).join('');
  sectionScreen(`${sectionTopBar(`${def.icon} ${esc(def.title)}`,'Hyperlocal Home Service',`openService('${JOB_ID}')`)}
    <div class="sectionContent serviceFormPage">
      <div class="sectionHero"><b>${def.icon} ${esc(def.title)}</b><small>Request a nearby service professional. DBest Operations will review the request and confirm assignment, visit timing and applicable service/visit charge before work starts.</small></div>
      <div class="notice"><b>No upfront service charge is collected at this request stage.</b> Your DBest Transaction ID will be generated immediately for tracking.</div>
      <form class="serviceFormCard" onsubmit="DBEST_HYPERLOCAL_HOME.submit(event,${index})">
        <div class="serviceFormGrid">
          <div class="formSectionTitle">Customer & Location</div>
          ${commonFields()}
          <div class="sf full"><button type="button" class="mini" onclick="DBEST_HYPERLOCAL_HOME.captureLocation(${index})">📍 Use Current GPS Location</button><small id="dbestHyperGps_${index}" style="display:block;margin-top:6px;color:var(--m)">Optional — helps DBest identify the nearest service professional.</small><input type="hidden" name="lat"><input type="hidden" name="lng"><input type="hidden" name="accuracy"></div>
          <div class="formSectionTitle">Service Requirement</div>
          <div class="sf"><label>${esc(def.requestLabel)} *</label><select name="requestType" required><option value="">Select</option>${options}</select></div>
          ${serviceExtra(def)}
          <div class="sf full"><label>Problem / Work Details *</label><textarea name="details" rows="4" required placeholder="Please describe the work, issue, quantity/rooms/appliance condition, or any special requirement."></textarea></div>
          <div class="sf full"><button class="btn" style="width:100%">Submit Service Request →</button></div>
        </div>
      </form>
    </div>`);
}
async function submit(e,index){
  e.preventDefault();const def=HYPER[index];if(!def)return;
  try{if(typeof requireMember==='function'&&!requireMember())return}catch(e2){}
  const f=new FormData(e.target),data={};for(const [k,v] of f.entries())data[k]=String(v||'').trim();
  const lat=Number(data.lat),lng=Number(data.lng),accuracy=Number(data.accuracy);const loc=Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng?{lat,lng,accuracy:Number.isFinite(accuracy)?accuracy:null}:null;
  let tx;
  try{
    if(typeof addTx!=='function')throw new Error('transaction_engine_unavailable');
    tx=addTx(session.id,'Home Jobs & Local Services',def.title,0,'Service Request Submitted / Assignment Pending','',{
      source:'DBest Hyperlocal Home Services',flow:'hyperlocal_home_service',serviceKey:def.key,paymentStage:'No Upfront Payment',application:{name:data.name,mobile:data.mobile,email:data.email,address:data.address,city:data.city,pincode:data.pincode,preferredDate:data.preferredDate,preferredSlot:data.preferredSlot,urgency:data.urgency,requestType:data.requestType,frequency:data.frequency||'',hours:data.hours||'',brand:data.brand||'',model:data.model||'',acType:data.acType||'',details:data.details},liveLocation:loc,details:`${def.title} hyperlocal service request submitted`});
    tx.paymentStage='No Upfront Payment';tx.status='Service Request Submitted / Assignment Pending';if(typeof save==='function')save();
    try{await window.DBEST_SERVICE_REQUEST_LIVE?.sendRequest?.(tx,false)}catch(syncErr){console.warn('Hyperlocal service request sync',syncErr)}
  }catch(err){console.error('DBest hyperlocal submit',err);return notify('Service request could not be created. Please retry.')}
  if(typeof sectionScreen==='function'&&typeof sectionTopBar==='function')sectionScreen(`${sectionTopBar('✅ Request Submitted',tx.id,`openService('${JOB_ID}')`)}<div class="sectionContent"><div class="paymentSuccessBox"><div class="successIcon">✅</div><h2>${esc(def.title)} Request Received</h2><p>Your request has been recorded for local assignment.</p><div class="refGrid"><div class="refCell"><small>DBest Transaction ID</small><b>${esc(tx.id)}</b></div><div class="refCell"><small>Status</small><b>Assignment Pending</b></div><div class="refCell"><small>Preferred Visit</small><b>${esc(data.preferredDate)} • ${esc(data.preferredSlot)}</b></div><div class="refCell"><small>Payment</small><b>No Upfront Payment</b></div></div><div class="notice">DBest Operations will confirm the assigned professional, timing and applicable visit/service charge before work begins.</div><button class="btn" onclick="backHome()">Back to Home</button></div></div>`);
}
function captureLocation(index){
  if(!navigator.geolocation)return notify('Location is not supported on this device.');
  const s=document.getElementById('dbestHyperGps_'+index);if(s)s.textContent='Fetching current GPS location…';
  navigator.geolocation.getCurrentPosition(p=>{const form=s?.closest('form')||document.querySelector('form.serviceFormCard');if(form){form.elements.lat.value=p.coords.latitude;form.elements.lng.value=p.coords.longitude;form.elements.accuracy.value=p.coords.accuracy||''}if(s)s.textContent=`✓ GPS captured • ±${Math.round(p.coords.accuracy||0)} m`;notify('Current location captured.')},()=>{if(s)s.textContent='Location permission was not granted. You can continue with the typed address.'},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
let originalOpen=null,originalSchema=null,syncWrapped=false;
function install(){
  applyStructure();
  if(!originalOpen&&typeof window.openContentForm==='function'){originalOpen=window.openContentForm;window.openContentForm=function(id,i){applyStructure();if(String(id)===JOB_ID&&Number(i)>=0&&Number(i)<HYPER.length)return openHyper(Number(i));return originalOpen.apply(this,arguments)}}
  if(!originalSchema&&typeof window.serviceSchema==='function'){
    originalSchema=window.serviceSchema;
    window.serviceSchema=function(id,i){if(String(id)===JOB_ID){const n=Number(i);if(n>=0&&n<HYPER.length){const d=HYPER[n];return {title:d.title,fee:0,fields:[],files:[]}}if(n===HYPER.length)return originalSchema(JOB_ID,0);if(n===HYPER.length+1)return originalSchema(JOB_ID,1)}return originalSchema.apply(this,arguments)};
  }
  if(!syncWrapped&&typeof window.syncOwnerMasterConfig==='function'){
    const old=window.syncOwnerMasterConfig;window.syncOwnerMasterConfig=async function(){const r=await old.apply(this,arguments);applyStructure();return r};syncWrapped=true;
  }
}
[0,120,350,800,1600,3200,6000].forEach(ms=>setTimeout(install,ms));
window.DBEST_HYPERLOCAL_HOME={version:VERSION,services:HYPER.map(x=>x.title),open:openHyper,submit,captureLocation,refresh:applyStructure};
})();