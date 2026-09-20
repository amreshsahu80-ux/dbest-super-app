(function(){
'use strict';
const VERSION='20260920-travel-cab-safe-i18n-v1';
if(window.DBEST_TRAVEL_CAB_SAFE_I18N?.version===VERSION)return;
function norm(v){v=String(v||'').toLowerCase();if(['hi','hindi'].includes(v))return'hi';if(['bn','bengali','bangla'].includes(v))return'bn';if(['or','od','odia','oriya'].includes(v))return'or';if(['te','telugu'].includes(v))return'te';if(['ta','tamil'].includes(v))return'ta';return'en'}
const lang=norm(localStorage.getItem('d2_lang')||new URLSearchParams(location.search).get('lang')||'en');
const T={
hi:{'Open this service →':'यह सेवा खोलें →','Flights Hotels Packages':'फ्लाइट, होटल और पैकेज','Flights and complete travel assistance':'फ्लाइट और संपूर्ण यात्रा सहायता','Flight Booking':'फ्लाइट बुकिंग','Flight + Hotel':'फ्लाइट + होटल','Visa Assistance':'वीज़ा सहायता','Hotels n Packages':'होटल और पैकेज','Hotels, holidays and curated tour packages':'होटल, छुट्टियाँ और चुनिंदा टूर पैकेज','Hotel Booking':'होटल बुकिंग','Tour Package':'टूर पैकेज','Custom Itinerary':'कस्टम यात्रा योजना','Where are you going?':'आप कहाँ जा रहे हैं?','Pickup':'पिकअप','Destination':'गंतव्य','When':'कब','Pickup help':'पिकअप सहायता','Refresh Live Location':'लाइव लोकेशन रीफ्रेश करें','Live Pickup Location':'लाइव पिकअप स्थान','Use GPS':'GPS उपयोग करें','Find Rides →':'राइड खोजें →','Choose a Ride':'राइड चुनें','Trip Summary':'यात्रा सारांश','Estimated Fare':'अनुमानित किराया','Payment':'भुगतान','Cash':'नकद','Confirm Ride':'राइड की पुष्टि करें','Back':'वापस','Home':'होम'},
bn:{'Open this service →':'এই পরিষেবা খুলুন →','Flights Hotels Packages':'ফ্লাইট, হোটেল ও প্যাকেজ','Flights and complete travel assistance':'ফ্লাইট ও সম্পূর্ণ ভ্রমণ সহায়তা','Flight Booking':'ফ্লাইট বুকিং','Flight + Hotel':'ফ্লাইট + হোটেল','Visa Assistance':'ভিসা সহায়তা','Hotels n Packages':'হোটেল ও প্যাকেজ','Hotel Booking':'হোটেল বুকিং','Tour Package':'ট্যুর প্যাকেজ','Custom Itinerary':'কাস্টম ভ্রমণ পরিকল্পনা','Where are you going?':'আপনি কোথায় যাচ্ছেন?','Pickup':'পিকআপ','Destination':'গন্তব্য','When':'কখন','Pickup help':'পিকআপ সহায়তা','Live Pickup Location':'লাইভ পিকআপ লোকেশন','Use GPS':'GPS ব্যবহার করুন','Find Rides →':'রাইড খুঁজুন →','Choose a Ride':'রাইড বেছে নিন','Trip Summary':'ট্রিপ সারাংশ','Estimated Fare':'আনুমানিক ভাড়া','Payment':'পেমেন্ট','Cash':'নগদ','Back':'ফিরে যান','Home':'হোম'},
or:{'Open this service →':'ଏହି ସେବା ଖୋଲନ୍ତୁ →','Flights Hotels Packages':'ଫ୍ଲାଇଟ୍, ହୋଟେଲ୍ ଓ ପ୍ୟାକେଜ୍','Flight Booking':'ଫ୍ଲାଇଟ୍ ବୁକିଂ','Flight + Hotel':'ଫ୍ଲାଇଟ୍ + ହୋଟେଲ୍','Visa Assistance':'ଭିସା ସହାୟତା','Hotels n Packages':'ହୋଟେଲ୍ ଓ ପ୍ୟାକେଜ୍','Hotel Booking':'ହୋଟେଲ୍ ବୁକିଂ','Tour Package':'ଟୁର୍ ପ୍ୟାକେଜ୍','Custom Itinerary':'କଷ୍ଟମ୍ ଯାତ୍ରା ଯୋଜନା','Where are you going?':'ଆପଣ କେଉଁଠି ଯାଉଛନ୍ତି?','Pickup':'ପିକଅପ୍','Destination':'ଗନ୍ତବ୍ୟ','When':'କେବେ','Live Pickup Location':'ଲାଇଭ୍ ପିକଅପ୍ ସ୍ଥାନ','Use GPS':'GPS ବ୍ୟବହାର କରନ୍ତୁ','Find Rides →':'ରାଇଡ୍ ଖୋଜନ୍ତୁ →','Choose a Ride':'ରାଇଡ୍ ବାଛନ୍ତୁ','Back':'ପଛକୁ','Home':'ହୋମ'},
te:{'Open this service →':'ఈ సేవను తెరవండి →','Flights Hotels Packages':'ఫ్లైట్స్, హోటల్స్ & ప్యాకేజీలు','Flight Booking':'ఫ్లైట్ బుకింగ్','Flight + Hotel':'ఫ్లైట్ + హోటల్','Visa Assistance':'వీసా సహాయం','Hotels n Packages':'హోటల్స్ & ప్యాకేజీలు','Hotel Booking':'హోటల్ బుకింగ్','Tour Package':'టూర్ ప్యాకేజ్','Custom Itinerary':'కస్టమ్ ప్రయాణ ప్రణాళిక','Where are you going?':'మీరు ఎక్కడికి వెళ్తున్నారు?','Pickup':'పికప్','Destination':'గమ్యం','When':'ఎప్పుడు','Live Pickup Location':'లైవ్ పికప్ స్థానం','Use GPS':'GPS ఉపయోగించండి','Find Rides →':'రైడ్‌లు వెతకండి →','Choose a Ride':'రైడ్ ఎంచుకోండి','Back':'వెనుకకు','Home':'హోమ్'},
ta:{'Open this service →':'இந்த சேவையைத் திறக்கவும் →','Flights Hotels Packages':'விமானம், ஹோட்டல் & பேக்கேஜ்கள்','Flight Booking':'விமான புக்கிங்','Flight + Hotel':'விமானம் + ஹோட்டல்','Visa Assistance':'விசா உதவி','Hotels n Packages':'ஹோட்டல்கள் & பேக்கேஜ்கள்','Hotel Booking':'ஹோட்டல் புக்கிங்','Tour Package':'டூர் பேக்கேஜ்','Custom Itinerary':'தனிப்பயன் பயணத் திட்டம்','Where are you going?':'நீங்கள் எங்கு செல்கிறீர்கள்?','Pickup':'பிக்அப்','Destination':'இலக்கு','When':'எப்போது','Live Pickup Location':'நேரடி பிக்அப் இடம்','Use GPS':'GPS பயன்படுத்தவும்','Find Rides →':'ரைடுகளை தேடவும் →','Choose a Ride':'ரைடு தேர்வு','Back':'பின்னால்','Home':'முகப்பு'}
};
function trText(root){
 if(lang==='en'||!root)return;
 const d=T[lang]||{};
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){
   if(!n.parentElement||['SCRIPT','STYLE','OPTION','TEXTAREA'].includes(n.parentElement.tagName))continue;
   const raw=n.nodeValue||'',x=raw.replace(/\s+/g,' ').trim();
   if(d[x])n.nodeValue=raw.replace(x,d[x]);
 }
 root.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach(el=>{
   const p=String(el.placeholder||'').trim();
   const map={hi:{'Enter pickup location':'पिकअप स्थान दर्ज करें','Where to?':'कहाँ जाना है?'},bn:{'Enter pickup location':'পিকআপ লোকেশন লিখুন','Where to?':'কোথায় যাবেন?'},or:{'Enter pickup location':'ପିକଅପ୍ ସ୍ଥାନ ଦିଅନ୍ତୁ','Where to?':'କେଉଁଠି ଯିବେ?'},te:{'Enter pickup location':'పికప్ స్థానం నమోదు చేయండి','Where to?':'ఎక్కడికి?'},ta:{'Enter pickup location':'பிக்அப் இடத்தை உள்ளிடவும்','Where to?':'எங்கு செல்ல வேண்டும்?'}}[lang]||{};
   if(map[p])el.placeholder=map[p];
 });
}
function apply(){
 const root=document.querySelector('#m .sectionOverlay,#m .overlay');
 if(root)trText(root);
}
const mo=new MutationObserver(()=>setTimeout(apply,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});apply()},{once:true});
else{mo.observe(document.body,{childList:true,subtree:true});apply()}
window.DBEST_TRAVEL_CAB_SAFE_I18N={version:VERSION,apply};
})();