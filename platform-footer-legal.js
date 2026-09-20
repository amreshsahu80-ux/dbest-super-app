(function(){
'use strict';
const VERSION='1.4.0';
const COMPANY='Sarwashresth Services OPC Pvt Ltd';
const ADDRESS='Bata Road, Chakradharpur, Jharkhand - 833102';
const SUPPORT_PHONE='+917250132677';
const SUPPORT_PHONE_DISPLAY='+91 72501 32677';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function closeModal(){document.getElementById('dbestPlatformInfoModal')?.remove()}
function modal(title,html){closeModal();const d=document.createElement('div');d.id='dbestPlatformInfoModal';d.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(7,18,38,.62);display:flex;align-items:center;justify-content:center;padding:18px';d.innerHTML=`<div style="width:min(760px,100%);max-height:86vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.28);font-family:system-ui,Arial;color:#14233c"><div style="position:sticky;top:0;background:#fff;border-bottom:1px solid #e7edf7;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;z-index:2"><div><div style="font-size:20px;font-weight:900">${esc(title)}</div><div style="font-size:12px;color:#6b778b">DBest Super App</div></div><button data-dbest-info-close style="border:0;background:#eef3fb;width:38px;height:38px;border-radius:12px;font-size:20px;cursor:pointer">×</button></div><div style="padding:18px;line-height:1.65;font-size:14px">${html}</div></div>`;d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-dbest-info-close]'))closeModal()});document.body.appendChild(d)}
function currentLang(){
  const v=String(localStorage.getItem('d2_lang')||new URLSearchParams(location.search).get('lang')||'en').toLowerCase();
  if(v==='od')return'or'; return ['en','hi','bn','or','te','ta'].includes(v)?v:'en';
}
const I18N={
en:{
 aboutTitle:'About Us',contactTitle:'Contact Us',termsTitle:'Terms & Conditions',aboutBtn:'About Us',contactBtn:'Contact Us',termsBtn:'Terms & Conditions',
 aboutLead:'One platform for everyday services, commerce, travel, financial-service access and partner opportunities.',
 aboutP1:'DBest is a multi-service platform operated by Sarwashresth Services OPC Pvt Ltd. The platform is designed to bring customers, members, vendors, service partners and delivery partners into a single digital ecosystem.',
 aboutP2:'Depending on availability and eligibility, DBest may provide or facilitate access to marketplace purchases, grocery delivery, travel, insurance-related services, mutual fund and financial-service journeys, cab/ride services, government application assistance, digital services and other partner-led offerings.',
 aboutP3:'DBest also supports member networks, internal transaction tracking and rule-based payout visibility so eligible users can track their own business and permitted downline activity from one place.',
 office:'DBest Office',help:'Need help?',helpP:'For booking, transaction, membership, payout, vendor, Vaahak or service-related assistance, contact DBest:',call:'Contact Support',wa:'WhatsApp Support',support:'Support',complaints:'Complaints',fast:'For faster support:',fastP:'Keep your DBest Internal Transaction ID / Order ID ready whenever your query relates to a payment, order or service transaction.',
 updated:'Last updated: 23 August 2026',
 intro:'By accessing or using the DBest Super App, you agree to use the platform lawfully and in accordance with these Terms & Conditions and any service-specific rules shown during a transaction.',
 h1:'1. Platform role',p1:'DBest may provide certain services directly and may also act as a technology, facilitation, referral or marketplace platform connecting users with third-party vendors, insurers, financial-service providers, travel suppliers, delivery partners, transport partners and other service providers.',
 h2:'2. Accounts and user information',p2:'You are responsible for providing accurate registration, KYC, contact, payment and service information. You must keep login credentials and OTPs confidential and must not misuse another person’s account.',
 h3:'3. Orders, bookings and payments',p3:'Prices, taxes, convenience fees, delivery charges, partner charges, cancellation terms and payment methods may vary by service. The amount and applicable conditions displayed before confirmation form part of the transaction terms. Successful transactions may receive a DBest Internal Transaction ID for tracking and reconciliation.',
 h4:'4. Marketplace and delivery',p4:'Marketplace fulfilment depends on vendor acceptance, product availability, delivery-partner availability and the delivery rules applicable at checkout. Delivery charges and free-delivery eligibility are calculated according to active platform rules.',
 h5:'5. Membership, referrals and payouts',p5:'Membership, referral income and level-wise payouts are subject to active DBest payout rules, member eligibility, verified transaction status, successful settlement and applicable compliance requirements. Pending, cancelled, reversed, fraudulent or non-qualifying transactions may carry no payout.',
 h6:'6. Third-party services',p6:'Where a service is supplied by a third party, that provider’s own terms, eligibility criteria, underwriting rules, cancellation/refund rules, availability and regulatory requirements may also apply.',
 h7:'7. Cancellations, refunds and disputes',p7:'Cancellation and refund eligibility depends on the relevant service, supplier and payment status. Users should raise transaction-related queries with the corresponding DBest Internal Transaction ID, Order ID or booking reference.',
 h8:'8. Acceptable use',p8:'Users must not submit false information, manipulate payouts, create fraudulent transactions, misuse promotions, interfere with platform security, impersonate others or use the platform for unlawful activity.',
 h9:'9. Availability and changes',p9:'DBest may add, modify, suspend or discontinue features, pricing, payout rules, delivery rules or partner integrations when necessary. Material transaction-specific terms are shown at the relevant point of use.',
 h10:'10. Liability',p10:'To the extent permitted by law, DBest is not responsible for losses caused by events outside its reasonable control or by failures, delays or decisions of independent third-party service providers. Nothing in these terms limits rights that cannot legally be excluded.',
 h11:'11. Governing law',p11:'These terms are governed by the laws of India. Subject to applicable consumer-protection and other mandatory laws, disputes shall be handled under the jurisdiction applicable to the company’s registered/operational location in Jharkhand.',contact:'Contact'
},
hi:{
 aboutTitle:'हमारे बारे में',contactTitle:'संपर्क करें',termsTitle:'नियम एवं शर्तें',aboutBtn:'हमारे बारे में',contactBtn:'संपर्क करें',termsBtn:'नियम एवं शर्तें',
 aboutLead:'रोज़मर्रा की सेवाएँ, खरीदारी, यात्रा, वित्तीय सेवाओं तक पहुँच और पार्टनर अवसर — एक ही प्लेटफ़ॉर्म पर।',
 aboutP1:'DBest, Sarwashresth Services OPC Pvt Ltd द्वारा संचालित एक मल्टी-सर्विस प्लेटफ़ॉर्म है। इसका उद्देश्य ग्राहकों, सदस्यों, विक्रेताओं, सेवा भागीदारों और डिलीवरी भागीदारों को एक डिजिटल इकोसिस्टम में जोड़ना है।',
 aboutP2:'उपलब्धता और पात्रता के अनुसार DBest मार्केटप्लेस खरीदारी, किराना डिलीवरी, यात्रा, बीमा-संबंधित सेवाएँ, म्यूचुअल फंड और वित्तीय सेवाएँ, कैब/राइड, सरकारी आवेदन सहायता, डिजिटल सेवाएँ और अन्य पार्टनर सेवाएँ उपलब्ध करा या सुगम बना सकता है।',
 aboutP3:'DBest सदस्य नेटवर्क, आंतरिक ट्रांज़ैक्शन ट्रैकिंग और नियम-आधारित payout visibility भी देता है, ताकि पात्र उपयोगकर्ता अपना व्यवसाय और अनुमत डाउनलाइन गतिविधि देख सकें।',
 office:'DBest कार्यालय',help:'मदद चाहिए?',helpP:'बुकिंग, ट्रांज़ैक्शन, सदस्यता, payout, vendor, Vaahak या सेवा संबंधी सहायता के लिए DBest से संपर्क करें:',call:'सहायता नंबर',wa:'WhatsApp सहायता',support:'सपोर्ट',complaints:'शिकायत',fast:'तेज़ सहायता के लिए:',fastP:'भुगतान, ऑर्डर या सेवा से जुड़ी किसी भी समस्या के लिए अपना DBest Internal Transaction ID / Order ID तैयार रखें।',
 updated:'अंतिम अपडेट: 23 अगस्त 2026',
 intro:'DBest Super App का उपयोग करके आप इस प्लेटफ़ॉर्म का कानूनसम्मत उपयोग करने तथा इन नियम एवं शर्तों और ट्रांज़ैक्शन के समय दिखाए गए सेवा-विशिष्ट नियमों का पालन करने के लिए सहमत होते हैं।',
 h1:'1. प्लेटफ़ॉर्म की भूमिका',p1:'DBest कुछ सेवाएँ सीधे दे सकता है तथा तकनीकी, सुविधा, रेफ़रल या मार्केटप्लेस प्लेटफ़ॉर्म के रूप में उपयोगकर्ताओं को तृतीय-पक्ष vendors, insurers, financial-service providers, travel suppliers, delivery partners और अन्य service providers से जोड़ सकता है।',
 h2:'2. खाता और उपयोगकर्ता जानकारी',p2:'सही registration, KYC, contact, payment और service information देना आपकी जिम्मेदारी है। Login credentials और OTP गोपनीय रखें और किसी अन्य व्यक्ति के खाते का दुरुपयोग न करें।',
 h3:'3. ऑर्डर, बुकिंग और भुगतान',p3:'कीमत, टैक्स, convenience fee, delivery charge, partner charge, cancellation terms और payment methods सेवा के अनुसार बदल सकते हैं। पुष्टि से पहले दिखाई गई राशि और शर्तें उस ट्रांज़ैक्शन का हिस्सा होंगी। सफल ट्रांज़ैक्शन को tracking और reconciliation के लिए DBest Internal Transaction ID मिल सकता है।',
 h4:'4. मार्केटप्लेस और डिलीवरी',p4:'Fulfilment vendor acceptance, product availability, delivery-partner availability और checkout के समय लागू नियमों पर निर्भर करता है। Delivery charges और free-delivery eligibility सक्रिय platform rules के अनुसार तय होती है।',
 h5:'5. सदस्यता, रेफ़रल और payout',p5:'Membership, referral income और level-wise payouts सक्रिय DBest payout rules, सदस्य पात्रता, verified transaction status, successful settlement और लागू compliance requirements पर निर्भर हैं। Pending, cancelled, reversed, fraudulent या non-qualifying transactions पर payout नहीं हो सकता।',
 h6:'6. तृतीय-पक्ष सेवाएँ',p6:'जहाँ सेवा किसी third party द्वारा दी जाती है, वहाँ उस provider की eligibility, underwriting, cancellation/refund, availability और regulatory requirements भी लागू हो सकती हैं।',
 h7:'7. रद्दीकरण, रिफंड और विवाद',p7:'Cancellation और refund eligibility संबंधित service, supplier और payment status पर निर्भर करती है। किसी भी ट्रांज़ैक्शन संबंधी query में DBest Internal Transaction ID, Order ID या booking reference दें।',
 h8:'8. स्वीकार्य उपयोग',p8:'गलत जानकारी देना, payout में हेरफेर, fraudulent transactions, promotions का दुरुपयोग, platform security में हस्तक्षेप, impersonation या unlawful activity प्रतिबंधित है।',
 h9:'9. उपलब्धता और बदलाव',p9:'DBest आवश्यकता अनुसार features, pricing, payout rules, delivery rules या partner integrations में बदलाव, स्थगन या समाप्ति कर सकता है। महत्वपूर्ण transaction-specific terms उपयोग के संबंधित चरण पर दिखाई जाएँगी।',
 h10:'10. दायित्व',p10:'कानून द्वारा अनुमत सीमा तक, DBest उन नुकसानों के लिए जिम्मेदार नहीं है जो उसके उचित नियंत्रण से बाहर की घटनाओं या स्वतंत्र third-party providers की विफलता, देरी या निर्णय से हों। वैधानिक अधिकार अप्रभावित रहेंगे।',
 h11:'11. लागू कानून',p11:'ये नियम भारत के कानूनों द्वारा शासित हैं। लागू consumer-protection और अन्य अनिवार्य कानूनों के अधीन, विवादों पर Jharkhand में कंपनी के registered/operational location के अनुसार jurisdiction लागू होगा।',contact:'संपर्क'
},
bn:{
 aboutTitle:'আমাদের সম্পর্কে',contactTitle:'যোগাযোগ করুন',termsTitle:'শর্তাবলী',aboutBtn:'আমাদের সম্পর্কে',contactBtn:'যোগাযোগ করুন',termsBtn:'শর্তাবলী',
 aboutLead:'দৈনন্দিন পরিষেবা, কেনাকাটা, ভ্রমণ, আর্থিক পরিষেবা এবং পার্টনার সুযোগ—এক প্ল্যাটফর্মে।',
 aboutP1:'DBest হলো Sarwashresth Services OPC Pvt Ltd পরিচালিত একটি বহু-পরিষেবা প্ল্যাটফর্ম, যা গ্রাহক, সদস্য, বিক্রেতা, পরিষেবা পার্টনার ও ডেলিভারি পার্টনারদের একটি ডিজিটাল ইকোসিস্টেমে যুক্ত করে।',
 aboutP2:'উপলভ্যতা ও যোগ্যতা অনুযায়ী DBest মার্কেটপ্লেস, গ্রোসারি ডেলিভারি, ভ্রমণ, বীমা-সম্পর্কিত পরিষেবা, মিউচুয়াল ফান্ড ও আর্থিক পরিষেবা, ক্যাব/রাইড, সরকারি আবেদন সহায়তা এবং অন্যান্য পার্টনার পরিষেবা দিতে বা সহজ করতে পারে।',
 aboutP3:'DBest সদস্য নেটওয়ার্ক, অভ্যন্তরীণ ট্রানজ্যাকশন ট্র্যাকিং এবং নিয়মভিত্তিক payout visibility-ও সমর্থন করে।',
 office:'DBest অফিস',help:'সহায়তা প্রয়োজন?',helpP:'বুকিং, ট্রানজ্যাকশন, সদস্যতা, payout, vendor, Vaahak বা পরিষেবা সহায়তার জন্য DBest-এ যোগাযোগ করুন:',call:'সাপোর্ট নম্বর',wa:'WhatsApp সাপোর্ট',support:'সাপোর্ট',complaints:'অভিযোগ',fast:'দ্রুত সহায়তার জন্য:',fastP:'পেমেন্ট, অর্ডার বা পরিষেবা সংক্রান্ত প্রশ্নে আপনার DBest Internal Transaction ID / Order ID প্রস্তুত রাখুন।',
 updated:'সর্বশেষ আপডেট: 23 আগস্ট 2026',intro:'DBest Super App ব্যবহার করে আপনি আইনসম্মতভাবে প্ল্যাটফর্ম ব্যবহার করতে এবং এই শর্তাবলী ও লেনদেনের সময় দেখানো পরিষেবা-নির্দিষ্ট নিয়ম মানতে সম্মত হন।',
 h1:'1. প্ল্যাটফর্মের ভূমিকা',p1:'DBest কিছু পরিষেবা সরাসরি দিতে পারে এবং প্রযুক্তি, সুবিধা, রেফারেল বা মার্কেটপ্লেস প্ল্যাটফর্ম হিসেবে তৃতীয় পক্ষের প্রদানকারীদের সঙ্গে ব্যবহারকারীদের যুক্ত করতে পারে।',
 h2:'2. অ্যাকাউন্ট ও ব্যবহারকারীর তথ্য',p2:'সঠিক registration, KYC, contact, payment ও service information দেওয়া আপনার দায়িত্ব। Login credentials ও OTP গোপন রাখুন।',
 h3:'3. অর্ডার, বুকিং ও পেমেন্ট',p3:'মূল্য, কর, ফি, ডেলিভারি চার্জ, cancellation terms ও payment method পরিষেবা অনুযায়ী ভিন্ন হতে পারে। নিশ্চিতকরণের আগে দেখানো শর্ত লেনদেনের অংশ। সফল লেনদেনে DBest Internal Transaction ID দেওয়া হতে পারে।',
 h4:'4. মার্কেটপ্লেস ও ডেলিভারি',p4:'Fulfilment vendor acceptance, product availability, delivery-partner availability এবং checkout-এর সময়কার নিয়মের উপর নির্ভরশীল।',
 h5:'5. সদস্যতা, রেফারেল ও payout',p5:'Membership ও payout সক্রিয় DBest payout rules, member eligibility, verified transaction status, settlement এবং compliance requirements-এর উপর নির্ভর করে।',
 h6:'6. তৃতীয় পক্ষের পরিষেবা',p6:'তৃতীয় পক্ষের পরিষেবায় সেই provider-এর eligibility, cancellation/refund এবং regulatory rules প্রযোজ্য হতে পারে।',
 h7:'7. বাতিল, রিফান্ড ও বিরোধ',p7:'Cancellation ও refund eligibility সংশ্লিষ্ট service, supplier এবং payment status-এর উপর নির্ভর করে।',
 h8:'8. গ্রহণযোগ্য ব্যবহার',p8:'ভুল তথ্য, payout manipulation, fraudulent transaction, promotion misuse, security interference, impersonation বা unlawful activity নিষিদ্ধ।',
 h9:'9. উপলভ্যতা ও পরিবর্তন',p9:'DBest প্রয়োজন অনুযায়ী features, pricing, payout rules, delivery rules বা partner integrations পরিবর্তন বা স্থগিত করতে পারে।',
 h10:'10. দায়',p10:'আইনসম্মত সীমার মধ্যে, DBest তার যুক্তিসঙ্গত নিয়ন্ত্রণের বাইরে ঘটনা বা independent third-party provider-এর ব্যর্থতা/বিলম্বের জন্য দায়ী নয়।',
 h11:'11. প্রযোজ্য আইন',p11:'এই শর্ত ভারতের আইন দ্বারা নিয়ন্ত্রিত। প্রযোজ্য বাধ্যতামূলক আইন সাপেক্ষে Jharkhand-এ কোম্পানির registered/operational location অনুযায়ী jurisdiction প্রযোজ্য হবে।',contact:'যোগাযোগ'
},
or:{
 aboutTitle:'ଆମ ବିଷୟରେ',contactTitle:'ଯୋଗାଯୋଗ କରନ୍ତୁ',termsTitle:'ନିୟମ ଓ ସର୍ତ୍ତ',aboutBtn:'ଆମ ବିଷୟରେ',contactBtn:'ଯୋଗାଯୋଗ',termsBtn:'ନିୟମ ଓ ସର୍ତ୍ତ',
 aboutLead:'ଦୈନନ୍ଦିନ ସେବା, କମର୍ସ, ଯାତ୍ରା, ଆର୍ଥିକ ସେବା ଓ ପାର୍ଟନର ସୁଯୋଗ—ଗୋଟିଏ ପ୍ଲାଟଫର୍ମରେ।',
 aboutP1:'DBest ହେଉଛି Sarwashresth Services OPC Pvt Ltd ଦ୍ୱାରା ପରିଚାଳିତ ଏକ multi-service platform, ଯାହା customer, member, vendor, service partner ଓ delivery partnerମାନଙ୍କୁ ଗୋଟିଏ digital ecosystemରେ ଯୋଡ଼େ।',
 aboutP2:'ଉପଲବ୍ଧତା ଓ ଯୋଗ୍ୟତା ଅନୁଯାୟୀ DBest marketplace, grocery delivery, travel, insurance-related services, mutual fund ଓ financial-service journeys, cab/ride, government application assistance ଏବଂ ଅନ୍ୟ partner offerings ସୁବିଧା କରିପାରେ।',
 aboutP3:'DBest member network, internal transaction tracking ଓ rule-based payout visibilityକୁ ମଧ୍ୟ ସମର୍ଥନ କରେ।',
 office:'DBest କାର୍ଯ୍ୟାଳୟ',help:'ସହାୟତା ଦରକାର?',helpP:'Booking, transaction, membership, payout, vendor, Vaahak କିମ୍ବା service assistance ପାଇଁ DBest ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ:',call:'ସପୋର୍ଟ ନମ୍ବର',wa:'WhatsApp ସପୋର୍ଟ',support:'ସପୋର୍ଟ',complaints:'ଅଭିଯୋଗ',fast:'ଶୀଘ୍ର ସହାୟତା ପାଇଁ:',fastP:'Payment, order କିମ୍ବା service query ପାଇଁ DBest Internal Transaction ID / Order ID ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
 updated:'ଶେଷ ଅଦ୍ୟତନ: 23 ଅଗଷ୍ଟ 2026',intro:'DBest Super App ବ୍ୟବହାର କରି ଆପଣ ଆଇନସମ୍ମତ ଭାବରେ platform ବ୍ୟବହାର ଏବଂ ଏହି ନିୟମ ଓ ସର୍ତ୍ତ ପାଳନ କରିବାକୁ ସମ୍ମତ ହୁଅନ୍ତି।',
 h1:'1. ପ୍ଲାଟଫର୍ମର ଭୂମିକା',p1:'DBest କିଛି ସେବା ସିଧାସଳଖ ଦେଇପାରେ ଏବଂ technology, facilitation, referral କିମ୍ବା marketplace platform ଭାବେ third-party providers ସହ usersଙ୍କୁ ଯୋଡ଼ିପାରେ।',
 h2:'2. ଆକାଉଣ୍ଟ ଓ user information',p2:'ସଠିକ୍ registration, KYC, contact, payment ଓ service information ଦେବା ଆପଣଙ୍କ ଦାୟିତ୍ୱ। Login credentials ଓ OTP ଗୋପନୀୟ ରଖନ୍ତୁ।',
 h3:'3. Order, booking ଓ payment',p3:'Price, tax, fee, delivery charge, cancellation terms ଓ payment methods service ଅନୁଯାୟୀ ଭିନ୍ନ ହୋଇପାରେ। Confirmation ପୂର୍ବରୁ ଦେଖାଯାଇଥିବା terms transactionର ଅଂଶ।',
 h4:'4. Marketplace ଓ delivery',p4:'Fulfilment vendor acceptance, product availability, delivery-partner availability ଓ checkout rules ଉପରେ ନିର୍ଭର କରେ।',
 h5:'5. Membership, referral ଓ payout',p5:'Membership ଓ payout active DBest payout rules, member eligibility, verified transaction status, settlement ଓ compliance requirements ଉପରେ ନିର୍ଭର କରେ।',
 h6:'6. Third-party services',p6:'Third-party service ପାଇଁ providerର eligibility, cancellation/refund ଓ regulatory rules ମଧ୍ୟ ଲାଗୁ ହୋଇପାରେ।',
 h7:'7. Cancellation, refund ଓ dispute',p7:'Cancellation ଓ refund eligibility service, supplier ଓ payment status ଉପରେ ନିର୍ଭର କରେ।',
 h8:'8. ଗ୍ରହଣଯୋଗ୍ୟ ବ୍ୟବହାର',p8:'ଭୁଲ ତଥ୍ୟ, payout manipulation, fraudulent transaction, promotion misuse, security interference, impersonation କିମ୍ବା unlawful activity ନିଷିଦ୍ଧ।',
 h9:'9. Availability ଓ changes',p9:'DBest ଆବଶ୍ୟକତା ଅନୁସାରେ features, pricing, payout rules, delivery rules କିମ୍ବା partner integrations ପରିବର୍ତ୍ତନ କରିପାରେ।',
 h10:'10. ଦାୟିତ୍ୱ',p10:'ଆଇନ ଅନୁମତି ଦେଇଥିବା ସୀମାରେ DBest ନିଜ reasonable control ବାହାରର ଘଟଣା କିମ୍ବା independent third-party provider failure/delay ପାଇଁ ଦାୟୀ ନୁହେଁ।',
 h11:'11. ଲାଗୁ ଆଇନ',p11:'ଏହି terms ଭାରତର ଆଇନ ଦ୍ୱାରା ଶାସିତ। Applicable mandatory law ସାପେକ୍ଷରେ Jharkhandର company registered/operational location ଅନୁଯାୟୀ jurisdiction ଲାଗୁ ହେବ।',contact:'ଯୋଗାଯୋଗ'
},
te:{
 aboutTitle:'మా గురించి',contactTitle:'సంప్రదించండి',termsTitle:'నిబంధనలు & షరతులు',aboutBtn:'మా గురించి',contactBtn:'సంప్రదించండి',termsBtn:'నిబంధనలు & షరతులు',
 aboutLead:'రోజువారీ సేవలు, వాణిజ్యం, ప్రయాణం, ఆర్థిక సేవలు మరియు భాగస్వామ్య అవకాశాలు—ఒకే ప్లాట్‌ఫారమ్‌లో.',
 aboutP1:'DBest అనేది Sarwashresth Services OPC Pvt Ltd నిర్వహించే multi-service platform. ఇది customers, members, vendors, service partners మరియు delivery partners‌ను ఒక digital ecosystemలో కలుపుతుంది.',
 aboutP2:'అందుబాటు మరియు అర్హత ఆధారంగా DBest marketplace purchases, grocery delivery, travel, insurance-related services, mutual funds, financial-service journeys, cab/ride services, government application assistance మరియు ఇతర partner offerings‌ను అందించవచ్చు లేదా సులభతరం చేయవచ్చు.',
 aboutP3:'DBest member networks, internal transaction tracking మరియు rule-based payout visibility‌ను కూడా అందిస్తుంది.',
 office:'DBest కార్యాలయం',help:'సహాయం కావాలా?',helpP:'Booking, transaction, membership, payout, vendor, Vaahak లేదా service assistance కోసం DBest‌ను సంప్రదించండి:',call:'సపోర్ట్ నంబర్',wa:'WhatsApp సపోర్ట్',support:'సపోర్ట్',complaints:'ఫిర్యాదులు',fast:'వేగవంతమైన సహాయం కోసం:',fastP:'Payment, order లేదా service query కోసం DBest Internal Transaction ID / Order ID సిద్ధంగా ఉంచండి.',
 updated:'చివరి నవీకరణ: 23 ఆగస్టు 2026',intro:'DBest Super App‌ను ఉపయోగించడం ద్వారా మీరు ప్లాట్‌ఫారమ్‌ను చట్టబద్ధంగా ఉపయోగించేందుకు మరియు ఈ నిబంధనలు, లావాదేవీ సమయంలో చూపబడే service-specific rules‌ను అనుసరించేందుకు అంగీకరిస్తారు.',
 h1:'1. ప్లాట్‌ఫారమ్ పాత్ర',p1:'DBest కొన్ని సేవలను నేరుగా అందించవచ్చు మరియు technology, facilitation, referral లేదా marketplace platform‌గా third-party providers‌తో users‌ను కలుపవచ్చు.',
 h2:'2. ఖాతాలు మరియు వినియోగదారు సమాచారం',p2:'సరైన registration, KYC, contact, payment మరియు service information అందించడం మీ బాధ్యత. Login credentials మరియు OTPలను గోప్యంగా ఉంచండి.',
 h3:'3. ఆర్డర్లు, బుకింగ్స్ మరియు చెల్లింపులు',p3:'Prices, taxes, fees, delivery charges, cancellation terms మరియు payment methods సేవ ఆధారంగా మారవచ్చు. Confirmationకు ముందు చూపిన terms transactionలో భాగం.',
 h4:'4. Marketplace మరియు delivery',p4:'Fulfilment vendor acceptance, product availability, delivery-partner availability మరియు checkout rules‌పై ఆధారపడి ఉంటుంది.',
 h5:'5. Membership, referrals మరియు payouts',p5:'Membership మరియు payout active DBest payout rules, member eligibility, verified transaction status, settlement మరియు compliance requirements‌పై ఆధారపడి ఉంటాయి.',
 h6:'6. Third-party services',p6:'Third-party service‌కు provider eligibility, cancellation/refund మరియు regulatory rules కూడా వర్తించవచ్చు.',
 h7:'7. Cancellation, refund మరియు disputes',p7:'Cancellation మరియు refund eligibility సంబంధిత service, supplier మరియు payment status‌పై ఆధారపడి ఉంటుంది.',
 h8:'8. అనుమతించబడిన వినియోగం',p8:'తప్పుడు సమాచారం, payout manipulation, fraudulent transactions, promotion misuse, security interference, impersonation లేదా unlawful activity నిషేధించబడింది.',
 h9:'9. Availability మరియు changes',p9:'DBest అవసరమైనప్పుడు features, pricing, payout rules, delivery rules లేదా partner integrations‌ను మార్చవచ్చు లేదా నిలిపివేయవచ్చు.',
 h10:'10. బాధ్యత',p10:'చట్టం అనుమతించే మేరకు, DBest తన reasonable control‌కు బయట ఉన్న సంఘటనలు లేదా independent third-party provider failure/delay వల్ల కలిగే నష్టాలకు బాధ్యుడు కాదు.',
 h11:'11. వర్తించే చట్టం',p11:'ఈ terms భారత చట్టాల ద్వారా నియంత్రించబడతాయి. Applicable mandatory lawకు లోబడి Jharkhandలోని company registered/operational location ప్రకారం jurisdiction వర్తిస్తుంది.',contact:'సంప్రదింపు'
},
ta:{
 aboutTitle:'எங்களைப் பற்றி',contactTitle:'தொடர்பு கொள்ளவும்',termsTitle:'விதிமுறைகள் & நிபந்தனைகள்',aboutBtn:'எங்களைப் பற்றி',contactBtn:'தொடர்பு',termsBtn:'விதிமுறைகள் & நிபந்தனைகள்',
 aboutLead:'தினசரி சேவைகள், வர்த்தகம், பயணம், நிதி சேவைகள் மற்றும் கூட்டாளர் வாய்ப்புகள்—ஒரே தளத்தில்.',
 aboutP1:'DBest என்பது Sarwashresth Services OPC Pvt Ltd இயக்கும் multi-service platform. இது customers, members, vendors, service partners மற்றும் delivery partners-ஐ ஒரே digital ecosystem-இல் இணைக்கிறது.',
 aboutP2:'கிடைக்கும் நிலை மற்றும் தகுதியைப் பொறுத்து DBest marketplace purchases, grocery delivery, travel, insurance-related services, mutual funds, financial-service journeys, cab/ride services, government application assistance மற்றும் பிற partner offerings-ஐ வழங்கலாம் அல்லது எளிதாக்கலாம்.',
 aboutP3:'DBest member networks, internal transaction tracking மற்றும் rule-based payout visibility-ஐயும் ஆதரிக்கிறது.',
 office:'DBest அலுவலகம்',help:'உதவி வேண்டுமா?',helpP:'Booking, transaction, membership, payout, vendor, Vaahak அல்லது service assistance-க்கு DBest-ஐ தொடர்பு கொள்ளவும்:',call:'சப்போர்ட் எண்',wa:'WhatsApp சப்போர்ட்',support:'சப்போர்ட்',complaints:'புகார்கள்',fast:'விரைவான உதவிக்கு:',fastP:'Payment, order அல்லது service query-க்கு DBest Internal Transaction ID / Order ID-ஐ தயார் வைத்திருக்கவும்.',
 updated:'கடைசி புதுப்பிப்பு: 23 ஆகஸ்ட் 2026',intro:'DBest Super App-ஐ பயன்படுத்துவதன் மூலம் தளத்தை சட்டபூர்வமாக பயன்படுத்தவும், இந்த விதிமுறைகள் மற்றும் transaction-இல் காட்டப்படும் service-specific rules-ஐ பின்பற்றவும் நீங்கள் ஒப்புக்கொள்கிறீர்கள்.',
 h1:'1. தளத்தின் பங்கு',p1:'DBest சில சேவைகளை நேரடியாக வழங்கலாம்; மேலும் technology, facilitation, referral அல்லது marketplace platform ஆக third-party providers உடன் users-ஐ இணைக்கலாம்.',
 h2:'2. கணக்குகள் மற்றும் பயனர் தகவல்',p2:'சரியான registration, KYC, contact, payment மற்றும் service information வழங்குவது உங்கள் பொறுப்பு. Login credentials மற்றும் OTP-களை ரகசியமாக வைத்திருக்கவும்.',
 h3:'3. Orders, bookings மற்றும் payments',p3:'Prices, taxes, fees, delivery charges, cancellation terms மற்றும் payment methods சேவைக்கு ஏற்ப மாறலாம். Confirmation-க்கு முன் காட்டப்படும் terms transaction-இன் ஒரு பகுதியாகும்.',
 h4:'4. Marketplace மற்றும் delivery',p4:'Fulfilment vendor acceptance, product availability, delivery-partner availability மற்றும் checkout rules-ஐ சார்ந்தது.',
 h5:'5. Membership, referrals மற்றும் payouts',p5:'Membership மற்றும் payout active DBest payout rules, member eligibility, verified transaction status, settlement மற்றும் compliance requirements-ஐ சார்ந்தது.',
 h6:'6. Third-party services',p6:'Third-party service-க்கு provider eligibility, cancellation/refund மற்றும் regulatory rules கூட பொருந்தலாம்.',
 h7:'7. Cancellation, refund மற்றும் disputes',p7:'Cancellation மற்றும் refund eligibility சம்பந்தப்பட்ட service, supplier மற்றும் payment status-ஐ சார்ந்தது.',
 h8:'8. ஏற்றுக்கொள்ளத்தக்க பயன்பாடு',p8:'தவறான தகவல், payout manipulation, fraudulent transactions, promotion misuse, security interference, impersonation அல்லது unlawful activity தடைசெய்யப்பட்டுள்ளது.',
 h9:'9. Availability மற்றும் changes',p9:'DBest தேவையானபோது features, pricing, payout rules, delivery rules அல்லது partner integrations-ஐ மாற்றவோ நிறுத்தவோ முடியும்.',
 h10:'10. பொறுப்பு',p10:'சட்டம் அனுமதிக்கும் வரம்பில், DBest தனது reasonable control-க்கு அப்பாற்பட்ட நிகழ்வுகள் அல்லது independent third-party provider failure/delay காரணமாக ஏற்படும் இழப்புகளுக்கு பொறுப்பல்ல.',
 h11:'11. பொருந்தும் சட்டம்',p11:'இந்த terms இந்திய சட்டங்களால் நிர்வகிக்கப்படுகின்றன. Applicable mandatory law-க்கு உட்பட்டு Jharkhand-இல் உள்ள company registered/operational location அடிப்படையில் jurisdiction பொருந்தும்.',contact:'தொடர்பு'
}};
function L(){return I18N[currentLang()]||I18N.en}
function about(){const x=L();modal(x.aboutTitle,`<div style="padding:16px;border-radius:16px;background:linear-gradient(135deg,#10264d,#175cff);color:white;margin-bottom:16px"><div style="font-size:22px;font-weight:900">DBest</div><div style="opacity:.92;margin-top:5px">${esc(x.aboutLead)}</div></div><p><b>DBest</b> ${esc(x.aboutP1.replace(/^DBest\s*/i,''))}</p><p>${esc(x.aboutP2)}</p><p>${esc(x.aboutP3)}</p>`)}
function contact(){const x=L();modal(x.contactTitle,`<div style="display:grid;gap:12px"><div style="padding:16px;border:1px solid #dce6f4;border-radius:16px;background:#f8fbff"><b style="font-size:16px">${esc(x.office)}</b><div style="margin-top:6px">${esc(COMPANY)}</div><div style="margin-top:4px">${esc(ADDRESS)}</div></div><div style="padding:16px;border:1px solid #dce6f4;border-radius:16px"><b>${esc(x.help)}</b><p>${esc(x.helpP)}</p><div style="display:grid;gap:9px"><a href="tel:${SUPPORT_PHONE}" style="color:#175cff;font-weight:800;text-decoration:none;overflow-wrap:anywhere">📞 ${esc(x.call)}: ${esc(SUPPORT_PHONE_DISPLAY)}</a><a href="https://wa.me/917250132677" target="_blank" rel="noopener noreferrer" style="color:#0b8f47;font-weight:900;text-decoration:none;overflow-wrap:anywhere">💬 ${esc(x.wa)}: ${esc(SUPPORT_PHONE_DISPLAY)}</a><a href="mailto:support@dbest4u.com" style="color:#175cff;font-weight:800;text-decoration:none;overflow-wrap:anywhere">✉️ ${esc(x.support)}: support@dbest4u.com</a><a href="mailto:complaints@dbest4u.com" style="color:#175cff;font-weight:800;text-decoration:none;overflow-wrap:anywhere">${esc(x.complaints)}: complaints@dbest4u.com</a></div></div><div style="padding:14px;border-radius:14px;background:#fff8e8;border:1px solid #f1d38a"><b>${esc(x.fast)}</b> ${esc(x.fastP)}</div></div>`)}
function terms(){const x=L();let h=`<div style="padding:12px 14px;border-radius:14px;background:#f4f8ff;border:1px solid #cfe0ff;margin-bottom:14px"><b>${esc(x.updated)}</b></div><p>${esc(x.intro)}</p>`;for(let i=1;i<=11;i++)h+=`<h3>${esc(x['h'+i])}</h3><p>${esc(x['p'+i])}</p>`;h+=`<p style="margin-bottom:0"><b>${esc(x.contact)}:</b> ${esc(COMPANY)}, ${esc(ADDRESS)}.</p>`;modal(x.termsTitle,h)}
function homeVisible(){const hero=document.querySelector('.hero');if(!hero)return false;try{const s=getComputedStyle(hero);return s.display!=='none'&&s.visibility!=='hidden'&&hero.getClientRects().length>0}catch(e){return !!hero}}
function removeFooter(){document.getElementById('dbestPlatformFooter')?.remove();closeModal()}
function ensureFooter(){if(!homeVisible()){removeFooter();return null}let f=document.getElementById('dbestPlatformFooter');if(f)return f;f=document.createElement('footer');f.id='dbestPlatformFooter';f.style.cssText='position:relative;width:100%;z-index:2;background:#081833;color:#fff;border-top:1px solid rgba(255,255,255,.14);font-family:system-ui,Arial;margin-top:24px';const x=L();f.innerHTML=`<div style="max-width:1100px;margin:auto;min-height:56px;padding:10px 14px;display:flex;align-items:center;justify-content:center;gap:8px 18px;flex-wrap:wrap"><button data-dbest-footer="about" style="border:0;background:transparent;color:#fff;font-weight:800;cursor:pointer;padding:7px 5px">${esc(x.aboutBtn)}</button><button data-dbest-footer="contact" style="border:0;background:transparent;color:#fff;font-weight:800;cursor:pointer;padding:7px 5px">${esc(x.contactBtn)}</button><button data-dbest-footer="terms" style="border:0;background:transparent;color:#fff;font-weight:800;cursor:pointer;padding:7px 5px">${esc(x.termsBtn)}</button><span style="font-size:11px;color:#b9c6d8">© 2026 DBest</span></div>`;f.addEventListener('click',e=>{const b=e.target.closest('[data-dbest-footer]');if(!b)return;const k=b.getAttribute('data-dbest-footer');if(k==='about')about();if(k==='contact')contact();if(k==='terms')terms()});document.body.appendChild(f);return f}
function syncFooter(){if(homeVisible())ensureFooter();else removeFooter()}
let queued=false;
function queueSync(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncFooter()})}
const obs=new MutationObserver(queueSync);obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
setTimeout(queueSync,120);window.addEventListener('hashchange',queueSync);window.addEventListener('popstate',queueSync);window.addEventListener('pageshow',queueSync);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queueSync()});window.DBEST_PLATFORM_FOOTER={version:VERSION,about,contact,terms,ensure:ensureFooter,sync:syncFooter};
})();