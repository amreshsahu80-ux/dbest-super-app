(function(){
'use strict';
const VERSION='20260920-user-flow-i18n-render-v3';
if(window.DBEST_USER_FLOW_I18N?.version===VERSION)return;

function norm(v){
  v=String(v||'').trim().toLowerCase();
  if(v==='od')return'or';
  return ['en','hi','bn','or','te','ta'].includes(v)?v:'en';
}
function lang(){return norm(localStorage.getItem('d2_lang')||new URLSearchParams(location.search).get('lang')||'en')}

const D={
hi:{
'Back':'वापस','Home':'होम','Open this service →':'यह सेवा खोलें →','DBest Partner Deeplink':'DBest पार्टनर लिंक',
'Flights Hotels Packages':'फ्लाइट, होटल और पैकेज','Flights and complete travel assistance':'फ्लाइट और संपूर्ण यात्रा सहायता',
'Flight Booking':'फ्लाइट बुकिंग','Flight + Hotel':'फ्लाइट + होटल','Visa Assistance':'वीज़ा सहायता',
'Hotels n Packages':'होटल और पैकेज','Hotels, holidays and curated tour packages':'होटल, छुट्टियाँ और चुनिंदा टूर पैकेज',
'Hotel Booking':'होटल बुकिंग','Tour Package':'टूर पैकेज','Custom Itinerary':'कस्टम यात्रा योजना',
'Car Bookings':'कैब बुकिंग','Local, outstation and airport cabs':'लोकल, आउटस्टेशन और एयरपोर्ट कैब',
'DBest Ride':'DBest राइड','Pickup':'पिकअप','Destination':'गंतव्य','When':'कब','Now':'अभी','Schedule Later':'बाद के लिए तय करें',
'Use GPS':'GPS उपयोग करें','Live Pickup Location':'लाइव पिकअप स्थान','Pickup help':'पिकअप सहायता','Refresh Live Location':'लाइव लोकेशन रीफ्रेश करें',
'Find Rides →':'राइड खोजें →','Choose a Ride':'राइड चुनें','Trip Summary':'यात्रा सारांश','Estimated Fare':'अनुमानित किराया',
'Payment':'भुगतान','Cash':'नकद','UPI to Driver':'ड्राइवर को UPI','Confirm Ride':'राइड की पुष्टि करें',
'Ride Status':'राइड स्थिति','Driver Assigned':'ड्राइवर नियुक्त','Driver Arriving':'ड्राइवर आ रहा है','Trip Started':'यात्रा शुरू',
'Trip Completed':'यात्रा पूरी','Cancel Ride':'राइड रद्द करें','Call Driver':'ड्राइवर को कॉल करें','Track Ride':'राइड ट्रैक करें',
'Application Details':'आवेदन विवरण','Required Documents':'आवश्यक दस्तावेज़','DBest Service / Processing Fee':'DBest सेवा / प्रोसेसिंग शुल्क',
'Review Application & Continue to Payment →':'आवेदन जाँचें और भुगतान के लिए आगे बढ़ें →','Full Name':'पूरा नाम','Mobile':'मोबाइल','Email ID':'ईमेल आईडी',
'From':'कहाँ से','To':'कहाँ तक','Departure Date':'प्रस्थान तिथि','Return Date':'वापसी तिथि','Adults':'वयस्क','Children':'बच्चे','Infants':'शिशु',
'Cabin':'केबिन','Preferred Airline':'पसंदीदा एयरलाइन','Check-in':'चेक-इन','Check-out':'चेक-आउट','Rooms':'कमरे','Hotel Category':'होटल श्रेणी',
'Meal Plan':'मील प्लान','Start Date':'शुरू होने की तिथि','Transport':'परिवहन','Budget':'बजट','Starting City':'शुरुआती शहर','Travel Dates':'यात्रा तिथियाँ',
'Pickup Location':'पिकअप स्थान','Drop Location':'ड्रॉप स्थान','Travel Date':'यात्रा तिथि','Pickup Time':'पिकअप समय','Trip Type':'यात्रा प्रकार','Vehicle Type':'वाहन प्रकार',
'Passengers':'यात्री','Special Instructions':'विशेष निर्देश','One Way':'एक तरफ','Round Trip':'राउंड ट्रिप','Airport':'एयरपोर्ट','Flight Number':'फ्लाइट नंबर',
'Terminal':'टर्मिनल','Pickup Date':'पिकअप तिथि','Pickup / Drop Address':'पिकअप / ड्रॉप पता','Luggage Details':'सामान का विवरण',
'Local Cab Booking':'लोकल कैब बुकिंग','Outstation Cab':'आउटस्टेशन कैब','Airport Transfer':'एयरपोर्ट ट्रांसफर'
},
bn:{
'Back':'ফিরে যান','Home':'হোম','Open this service →':'এই পরিষেবা খুলুন →','Flights Hotels Packages':'ফ্লাইট, হোটেল ও প্যাকেজ',
'Flights and complete travel assistance':'ফ্লাইট ও সম্পূর্ণ ভ্রমণ সহায়তা','Flight Booking':'ফ্লাইট বুকিং','Flight + Hotel':'ফ্লাইট + হোটেল','Visa Assistance':'ভিসা সহায়তা',
'Hotels n Packages':'হোটেল ও প্যাকেজ','Hotel Booking':'হোটেল বুকিং','Tour Package':'ট্যুর প্যাকেজ','Custom Itinerary':'কাস্টম ভ্রমণ পরিকল্পনা',
'Car Bookings':'ক্যাব বুকিং','Pickup':'পিকআপ','Destination':'গন্তব্য','When':'কখন','Now':'এখন','Schedule Later':'পরে সময় নির্ধারণ',
'Use GPS':'GPS ব্যবহার করুন','Live Pickup Location':'লাইভ পিকআপ লোকেশন','Find Rides →':'রাইড খুঁজুন →','Choose a Ride':'রাইড বেছে নিন',
'Trip Summary':'ট্রিপ সারাংশ','Estimated Fare':'আনুমানিক ভাড়া','Payment':'পেমেন্ট','Cash':'নগদ','Confirm Ride':'রাইড নিশ্চিত করুন',
'Application Details':'আবেদনের বিবরণ','Required Documents':'প্রয়োজনীয় নথি','Full Name':'পুরো নাম','Mobile':'মোবাইল','Email ID':'ইমেল',
'From':'কোথা থেকে','To':'কোথায়','Departure Date':'যাত্রার তারিখ','Return Date':'ফেরার তারিখ','Adults':'প্রাপ্তবয়স্ক','Children':'শিশু',
'Pickup Location':'পিকআপ লোকেশন','Drop Location':'ড্রপ লোকেশন','Travel Date':'ভ্রমণের তারিখ','Pickup Time':'পিকআপ সময়','Vehicle Type':'গাড়ির ধরন','Passengers':'যাত্রী',
'Local Cab Booking':'লোকাল ক্যাব বুকিং','Outstation Cab':'আউটস্টেশন ক্যাব','Airport Transfer':'এয়ারপোর্ট ট্রান্সফার'
},
or:{
'Back':'ପଛକୁ','Home':'ହୋମ','Open this service →':'ଏହି ସେବା ଖୋଲନ୍ତୁ →','Flights Hotels Packages':'ଫ୍ଲାଇଟ୍, ହୋଟେଲ୍ ଓ ପ୍ୟାକେଜ୍',
'Flight Booking':'ଫ୍ଲାଇଟ୍ ବୁକିଂ','Flight + Hotel':'ଫ୍ଲାଇଟ୍ + ହୋଟେଲ୍','Visa Assistance':'ଭିସା ସହାୟତା','Hotels n Packages':'ହୋଟେଲ୍ ଓ ପ୍ୟାକେଜ୍',
'Hotel Booking':'ହୋଟେଲ୍ ବୁକିଂ','Tour Package':'ଟୁର୍ ପ୍ୟାକେଜ୍','Custom Itinerary':'କଷ୍ଟମ୍ ଯାତ୍ରା ଯୋଜନା',
'Car Bookings':'କ୍ୟାବ୍ ବୁକିଂ','Pickup':'ପିକଅପ୍','Destination':'ଗନ୍ତବ୍ୟ','When':'କେବେ','Now':'ଏବେ','Schedule Later':'ପରେ ସମୟ ଧାର୍ଯ୍ୟ କରନ୍ତୁ',
'Use GPS':'GPS ବ୍ୟବହାର କରନ୍ତୁ','Live Pickup Location':'ଲାଇଭ୍ ପିକଅପ୍ ସ୍ଥାନ','Find Rides →':'ରାଇଡ୍ ଖୋଜନ୍ତୁ →','Choose a Ride':'ରାଇଡ୍ ବାଛନ୍ତୁ',
'Trip Summary':'ଯାତ୍ରା ସାରାଂଶ','Estimated Fare':'ଆନୁମାନିକ ଭଡ଼ା','Payment':'ପେମେଣ୍ଟ','Cash':'ନଗଦ','Confirm Ride':'ରାଇଡ୍ ନିଶ୍ଚିତ କରନ୍ତୁ',
'Application Details':'ଆବେଦନ ବିବରଣୀ','Required Documents':'ଆବଶ୍ୟକ ଦଲିଲ','Full Name':'ପୂର୍ଣ୍ଣ ନାମ','Mobile':'ମୋବାଇଲ୍','Email ID':'ଇମେଲ୍',
'From':'କେଉଁଠାରୁ','To':'କେଉଁଠାକୁ','Departure Date':'ପ୍ରସ୍ଥାନ ତାରିଖ','Return Date':'ଫେରା ତାରିଖ','Adults':'ବୟସ୍କ','Children':'ଶିଶୁ',
'Pickup Location':'ପିକଅପ୍ ସ୍ଥାନ','Drop Location':'ଡ୍ରପ୍ ସ୍ଥାନ','Travel Date':'ଯାତ୍ରା ତାରିଖ','Pickup Time':'ପିକଅପ୍ ସମୟ','Passengers':'ଯାତ୍ରୀ'
},
te:{
'Back':'వెనుకకు','Home':'హోమ్','Open this service →':'ఈ సేవను తెరవండి →','Flights Hotels Packages':'ఫ్లైట్స్, హోటల్స్ & ప్యాకేజీలు',
'Flight Booking':'ఫ్లైట్ బుకింగ్','Flight + Hotel':'ఫ్లైట్ + హోటల్','Visa Assistance':'వీసా సహాయం','Hotels n Packages':'హోటల్స్ & ప్యాకేజీలు',
'Hotel Booking':'హోటల్ బుకింగ్','Tour Package':'టూర్ ప్యాకేజ్','Custom Itinerary':'కస్టమ్ ప్రయాణ ప్రణాళిక',
'Car Bookings':'క్యాబ్ బుకింగ్','Pickup':'పికప్','Destination':'గమ్యం','When':'ఎప్పుడు','Now':'ఇప్పుడు','Schedule Later':'తర్వాత షెడ్యూల్ చేయండి',
'Use GPS':'GPS ఉపయోగించండి','Live Pickup Location':'లైవ్ పికప్ స్థానం','Find Rides →':'రైడ్‌లు వెతకండి →','Choose a Ride':'రైడ్ ఎంచుకోండి',
'Trip Summary':'ట్రిప్ సారాంశం','Estimated Fare':'అంచనా ఛార్జీ','Payment':'చెల్లింపు','Cash':'నగదు','Confirm Ride':'రైడ్ నిర్ధారించండి',
'Application Details':'దరఖాస్తు వివరాలు','Required Documents':'అవసరమైన పత్రాలు','Full Name':'పూర్తి పేరు','Mobile':'మొబైల్','Email ID':'ఇమెయిల్',
'From':'నుండి','To':'వరకు','Departure Date':'బయలుదేరే తేదీ','Return Date':'తిరుగు తేదీ','Adults':'పెద్దలు','Children':'పిల్లలు',
'Pickup Location':'పికప్ స్థానం','Drop Location':'డ్రాప్ స్థానం','Travel Date':'ప్రయాణ తేదీ','Pickup Time':'పికప్ సమయం','Passengers':'ప్రయాణికులు'
},
ta:{
'Back':'பின்னால்','Home':'முகப்பு','Open this service →':'இந்த சேவையைத் திறக்கவும் →','Flights Hotels Packages':'விமானம், ஹோட்டல் & பேக்கேஜ்கள்',
'Flight Booking':'விமான புக்கிங்','Flight + Hotel':'விமானம் + ஹோட்டல்','Visa Assistance':'விசா உதவி','Hotels n Packages':'ஹோட்டல்கள் & பேக்கேஜ்கள்',
'Hotel Booking':'ஹோட்டல் புக்கிங்','Tour Package':'டூர் பேக்கேஜ்','Custom Itinerary':'தனிப்பயன் பயணத் திட்டம்',
'Car Bookings':'கேப் புக்கிங்','Pickup':'பிக்அப்','Destination':'இலக்கு','When':'எப்போது','Now':'இப்போது','Schedule Later':'பின்னர் திட்டமிடவும்',
'Use GPS':'GPS பயன்படுத்தவும்','Live Pickup Location':'நேரடி பிக்அப் இடம்','Find Rides →':'ரைடுகளை தேடவும் →','Choose a Ride':'ரைடு தேர்வு',
'Trip Summary':'பயண சுருக்கம்','Estimated Fare':'மதிப்பிடப்பட்ட கட்டணம்','Payment':'கட்டணம்','Cash':'பணம்','Confirm Ride':'ரைடு உறுதிசெய்யவும்',
'Application Details':'விண்ணப்ப விவரங்கள்','Required Documents':'தேவையான ஆவணங்கள்','Full Name':'முழு பெயர்','Mobile':'மொபைல்','Email ID':'மின்னஞ்சல்',
'From':'இருந்து','To':'வரை','Departure Date':'புறப்படும் தேதி','Return Date':'திரும்பும் தேதி','Adults':'பெரியவர்கள்','Children':'குழந்தைகள்',
'Pickup Location':'பிக்அப் இடம்','Drop Location':'டிராப் இடம்','Travel Date':'பயண தேதி','Pickup Time':'பிக்அப் நேரம்','Passengers':'பயணிகள்'
}
};

function map(){return D[lang()]||{}}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function translateTextNode(n){
  if(!n||n.nodeType!==3||!n.parentElement)return;
  const p=n.parentElement;
  if(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','OPTION'].includes(p.tagName))return;
  const raw=n.nodeValue||'',x=clean(raw);if(!x)return;
  const d=map(),v=d[x];if(!v)return;
  const pre=raw.match(/^\s*/)?.[0]||'',post=raw.match(/\s*$/)?.[0]||'';
  n.nodeValue=pre+v+post;
}
function translateRoot(root){
  if(!root||lang()==='en')return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode())translateTextNode(n);
  const pmap={
    hi:{'Enter pickup location':'पिकअप स्थान दर्ज करें','Where to?':'कहाँ जाना है?'},
    bn:{'Enter pickup location':'পিকআপ লোকেশন লিখুন','Where to?':'কোথায় যাবেন?'},
    or:{'Enter pickup location':'ପିକଅପ୍ ସ୍ଥାନ ଦିଅନ୍ତୁ','Where to?':'କେଉଁଠି ଯିବେ?'},
    te:{'Enter pickup location':'పికప్ స్థానం నమోదు చేయండి','Where to?':'ఎక్కడికి?'},
    ta:{'Enter pickup location':'பிக்அப் இடத்தை உள்ளிடவும்','Where to?':'எங்கு செல்ல வேண்டும்?'}
  }[lang()]||{};
  root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(el=>{const p=String(el.placeholder||'').trim();if(pmap[p])el.placeholder=pmap[p]});
}

function ensureFlights(){
  const root=document.querySelector('#m .sectionOverlay');
  if(!root)return;
  const title=String(root.querySelector('.sectionTitle b,.sectionHero b')?.textContent||'').toLowerCase();
  const all=String(root.textContent||'').toLowerCase();
  if(!(/flight/.test(title)||/फ्लाइट|ফ্লাইট|ଫ୍ଲାଇଟ୍|ఫ్లైట్|விமான/.test(all)))return;
  let subs=root.querySelector('.subs');
  if(!subs){
    const content=root.querySelector('.sectionContent');if(!content)return;
    subs=document.createElement('div');subs.className='subs';content.appendChild(subs);
  }
  const defs=[['Flight Booking',0],['Flight + Hotel',1],['Visa Assistance',2]];
  const signature=[...subs.querySelectorAll('button.sub')].map(b=>String(b.getAttribute('onclick')||'')).join('|');
  const correct=defs.every(([,i])=>signature.includes("openContentForm('flights',"+i+")"))&&subs.querySelectorAll('button.sub').length===3;
  if(!correct){
    subs.innerHTML=defs.map(([label,i])=>'<button class="sub" onclick="openContentForm(\'flights\','+i+')"><b>'+label+'</b><small>Open this service →</small></button>').join('');
  }
  subs.style.setProperty('display','grid','important');
  subs.style.setProperty('visibility','visible','important');
  subs.style.setProperty('opacity','1','important');
  subs.querySelectorAll('button.sub').forEach(b=>{b.style.setProperty('display','block','important');b.style.setProperty('visibility','visible','important');b.style.setProperty('opacity','1','important')});
}
function postRender(){
  const root=document.querySelector('#m .sectionOverlay,#m .overlay');
  if(root){
    ensureFlights();
    translateRoot(root);
    try{window.DBEST_I18N?.apply?.()}catch(_){}
    try{window.DBEST_USER_I18N?.apply?.()}catch(_){}
  }
}
function wrap(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__dbestI18nWrapped)return false;
  const w=function(){const out=fn.apply(this,arguments);setTimeout(postRender,0);setTimeout(postRender,60);return out};
  w.__dbestI18nWrapped=true;window[name]=w;return true;
}
function install(){
  ['sectionScreen','openService','openRidePlatform','openContentForm','paymentReview','rideStatusScreen','txDetailsView'].forEach(wrap);
  postRender();
}
let tries=0,t=setInterval(()=>{tries++;install();if(tries>40)clearInterval(t)},100);
new MutationObserver(()=>setTimeout(postRender,0)).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='lang')setTimeout(postRender,20)},true);
setTimeout(install,0);
window.DBEST_USER_FLOW_I18N={version:VERSION,install,apply:postRender};
})();