"use strict";
/**
 * DBest AI Saathi — offline, read-only pilot knowledge and input policies.
 * No databases, credentials, network calls, model calls or personal-data persistence.
 * These are explanations of proposed user journeys, NOT authoritative live rates,
 * account balances, order records, coverage terms or policy documents.
 */
const ROLES=Object.freeze(["customer","partner","owner"]);
function detectLanguage(text){
  if(/[\u0B00-\u0B7F]/u.test(text))return "or";
  if(/[\u0900-\u097F]/u.test(text))return "hi";
  return "en";
}
function sensitive(value){
  if(typeof value!=="string")return true;
  // Exclude secrets, financial identifiers and personal contact details before a
  // model call, including when supplied as previous conversation history.
  return /\b(otp|one.time password|password|passcode|cvv|upi\s*pin|secret key|api key|bank account(?: number)?|account number|card number|aadhaar number|aadhar number|pan number)\b/i.test(value)
    || /(?:पासवर्ड|ओटीपी|आधार नंबर|बैंक खाता नंबर|ପାସୱାର୍ଡ|ଓଟିପି|ଆଧାର ନମ୍ବର)/u.test(value)
    || /\b[A-Z]{5}\d{4}[A-Z]\b/i.test(value)
    || /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)
    || /\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/.test(value)
    || /\b(?:\d[\s-]*?){15,19}\b/.test(value)
    || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value);
}
function action(value){
  if(typeof value!=="string")return true;
  return /\b(refund|pay now|make payment|send money|transfer money|approve payout|delete account|make booking|book now|place order|withdraw|deploy|change permissions|modify live|send email|change bank|export all customers)\b/i.test(value)
  || /(पैसे भेज|भुगतान कर|रिफंड कर|खाता हटाओ|बुकिंग कर दो|ବୁକିଂ କର|ଟଙ୍କା ପଠା)/u.test(value);
}
function privateRequest(value){
  return /\b(all customers|all partner accounts|private data|other users|database records|show passwords|access token|customer list|(?:owner|admin)\s+(?:database|data|password|credentials|access))\b/i.test(value)
  || /(सभी ग्राहक|मालिक का डेटा|ଅନ୍ୟ ଗ୍ରାହକ)/u.test(value);
}
function intent(role,raw){
 const s=raw.toLowerCase();
 const p={
  hotel:/hotel|room|stay|flight|trip|travel|package|puri|होटल|कमरा|फ्लाइट|यात्रा|ହୋଟେଲ|ଯାତ୍ରା|ରୁମ/u,
  cab:/cab|ride|taxi|car|pickup|drop|airport|गाड़ी|टैक्सी|कैब|सवारी|କ୍ୟାବ|ଗାଡ଼ି|ଟ୍ୟାକ୍ସି/u,
  marketplace:/marketplace|grocery|food|medicine|delivery|bulk order|vendor quote|ग्रॉसरी|दवा|डिलीवरी|खाना|ଔଷଧ|ଡେଲିଭରି|ଗ୍ରୋସରି/u,
  insurance:/insurance|policy|claim|health cover|बीमा|क्लेम|पॉलिसी|ବୀମା|କ୍ଲେମ/u,
  membership:/membership|member|join|promoter|prime|leader|starter|सदस्य|मेंबर|प्रमोटर|ସଦସ୍ୟ|ମେମ୍ବର/u,
  jobs:/job|assign|trip request|vaahak|driver|ऑर्डर मिला|जॉब|ड्राइवर|काम मिला|ଭାହାକ|କାମ/u,
  payout:/payout|earning|wallet|commission|settlement|payment status|कमाई|पेआउट|वॉलेट|कमीशन|ରୋଜଗାର|କମିଶନ/u,
  onboarding:/kyc|register|onboard|document upload|रजिस्ट्रेशन|केवाईसी|पंजीकरण|ପଞ୍ଜୀକରଣ|କେୱାଇସି/u,
  outreach:/outreach|email cycle|supplier|hotel campaign|cab campaign|bounce|ईमेल अभियान|आउटरीच|ପ୍ରଚାର|ଇମେଲ/u,
  launch:/launch|release|publish|play store|readiness|app approval|लॉन्च|रिलीज|पब्लिश|ପ୍ରକାଶନ|ଲଞ୍ଚ/u,
  operations:/operations|dashboard|analytics|performance|revenue|report|transaction|overview|डैशबोर्ड|रिपोर्ट|आय|ରିପୋର୍ଟ|ଡ୍ୟାସବୋର୍ଡ/u
 };
 const roleOrder=role==="customer"?["cab","hotel","marketplace","insurance","membership"]:
  role==="partner"?["payout","marketplace","jobs","onboarding"]:
  ["outreach","launch","operations"];
 for(const key of roleOrder)if(p[key].test(s))return key;
 return "general";
}
const disclaimer={
 en:"This is a SIMULATION; no live DBest account, booking, inventory, payment or operational records are connected.",
 hi:"यह परीक्षण (SIMULATION) है। यहां DBest के लाइव खाते, बुकिंग, कीमत, भुगतान या रिपोर्ट से कोई कनेक्शन नहीं है।",
 or:"ଏହା ଏକ ପରୀକ୍ଷା (SIMULATION)। DBest ର ଲାଇଭ୍ ଖାତା, ବୁକିଂ, ମୂଲ୍ୟ, ପେମେଣ୍ଟ କିମ୍ବା ରିପୋର୍ଟ ସହ ଏହା ଯୋଡ଼ା ନାହିଁ।"
};
const protectedReplies={
 en:{
  sensitive:"For safety, please do not share personal identifiers, passwords, OTPs, contact details or payment information in this demonstration.",
  action:"Actions are disabled in this isolated pilot. I cannot book, pay, refund, send money, change accounts or deploy anything.",
  private:"This demonstration cannot access owner administration or another user's private records. No live DBest data is connected."
 },
 hi:{
  sensitive:"सुरक्षा के लिए कृपया इस परीक्षण में पहचान संख्या, पासवर्ड, OTP, मोबाइल नंबर या भुगतान की जानकारी साझा न करें।",
  action:"इस परीक्षण में वास्तविक कार्रवाई बंद है। मैं बुकिंग, भुगतान, रिफंड, पैसे ट्रांसफर या अकाउंट बदलाव नहीं कर सकता।",
  private:"यह परीक्षण मालिक की निजी जानकारी या दूसरे ग्राहकों का रिकॉर्ड नहीं दिखा सकता। कोई लाइव DBest डेटा जुड़ा नहीं है।"
 },
 or:{
  sensitive:"ସୁରକ୍ଷା ପାଇଁ ଏହି ପରୀକ୍ଷାରେ ପରିଚୟ ନମ୍ବର, ପାସୱାର୍ଡ, OTP, ଫୋନ୍ ନମ୍ବର କିମ୍ବା ପେମେଣ୍ଟ ତଥ୍ୟ ଦିଅନ୍ତୁ ନାହିଁ।",
  action:"ଏହି ପରୀକ୍ଷାରେ କୌଣସି ପ୍ରକୃତ କାର୍ଯ୍ୟ ହୁଏ ନାହିଁ। ବୁକିଂ, ପେମେଣ୍ଟ, ରିଫଣ୍ଡ, ଟଙ୍କା ପଠାଇବା କିମ୍ବା ଖାତା ବଦଳାଇବା ସମ୍ଭବ ନୁହେଁ।",
  private:"ଏହି ପରୀକ୍ଷାରେ ମାଲିକଙ୍କ କିମ୍ବା ଅନ୍ୟ ଗ୍ରାହକଙ୍କ ଗୋପନୀୟ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।"
 }
};
const answers={
 customer:{
  hotel:{
    en:"For a hotel search I'd first ask for the destination, check-in/check-out dates, rooms and guests. A future connected service could compare verified DBest offers with comparable public OTA rates. I cannot display live prices, availability or savings now.",
    hi:"होटल खोजने के लिए पहले गंतव्य, चेक-इन/चेक-आउट की तारीखें, कमरे और मेहमानों की संख्या चाहिए। भविष्य में सत्यापित DBest दर और सार्वजनिक OTA दर की तुलना हो सकेगी। अभी लाइव किराया या कमरा उपलब्धता नहीं दिखा सकता।",
    or:"ହୋଟେଲ ଖୋଜିବା ପାଇଁ ଗନ୍ତବ୍ୟ, ଚେକ୍-ଇନ୍/ଚେକ୍-ଆଉଟ୍ ତାରିଖ, ରୁମ୍ ଓ ଅତିଥି ସଂଖ୍ୟା ଦରକାର। ପରେ ଯାଞ୍ଚ ହୋଇଥିବା DBest ଓ ପବ୍ଲିକ୍ OTA ଦର ତୁଳନା ସମ୍ଭବ। ଏବେ ଲାଇଭ୍ ଦର କିମ୍ବା ଉପଲବ୍ଧତା ନାହିଁ।"
  },
  cab:{
    en:"To plan a cab trip I would ask for pickup, destination, trip date, sedan/SUV and one-way or return preference. The existing DBest cab service must calculate the verified fare and dispatch. No ride is created from this preview.",
    hi:"कैब यात्रा के लिए पिकअप, गंतव्य, यात्रा की तारीख, सेडान/SUV और वन-वे/रिटर्न विकल्प चाहिए। सही किराया तथा ड्राइवर आवंटन केवल DBest की मौजूदा कैब सेवा करेगी। यहां कोई बुकिंग नहीं होती।",
    or:"କ୍ୟାବ୍ ଯାତ୍ରା ପାଇଁ ପିକଅପ୍, ଗନ୍ତବ୍ୟ, ତାରିଖ, ସେଡାନ୍/SUV ଓ ଏକମୁଖୀ/ରିଟର୍ନ ତଥ୍ୟ ଦରକାର। ଯାଞ୍ଚ ହୋଇଥିବା ଭଡ଼ା ଓ ଡ୍ରାଇଭର୍ ଆବଣ୍ଟନ DBest ର ମୂଳ ସେବା କରିବ। ଏଠାରେ ବୁକିଂ ହୁଏ ନାହିଁ।"
  },
  marketplace:{
    en:"For grocery, restaurant and medicine orders, the intended flow is to request items and location, find eligible nearby vendors, review quoted prices and confirm before checkout. Prescription-required items must follow the existing verification process. No vendor or order is contacted here.",
    hi:"किराना, भोजन या दवा के लिए सामान और स्थान की जानकारी लेकर पात्र विक्रेताओं के भाव दिखाए जाएंगे। भुगतान से पहले ग्राहक की पुष्टि जरूरी होगी। पर्चे वाली दवाओं के लिए मौजूदा सत्यापन प्रक्रिया लागू होगी। इस परीक्षण से कोई ऑर्डर नहीं जाता।",
    or:"କିରାଣା, ଖାଦ୍ୟ କିମ୍ବା ଔଷଧ ପାଇଁ ସାମଗ୍ରୀ ଓ ଅବସ୍ଥାନ ନେଇ ଯୋଗ୍ୟ ବିକ୍ରେତାଙ୍କ ଦର ଦେଖାଯାଇପାରିବ। ଚେକଆଉଟ୍ ପୂର୍ବରୁ ସମ୍ମତି ଆବଶ୍ୟକ। ପ୍ରେସକ୍ରିପ୍ସନ୍ ଔଷଧ ପାଇଁ ଯାଞ୍ଚ ଲାଗିବ। ଏଠାରେ ଅର୍ଡର୍ ଯାଏ ନାହିଁ।"
  },
  insurance:{
    en:"I can explain general insurance concepts, such as premiums, waiting periods and claims documents. Actual eligibility, exclusions, benefits and claims decisions require the insurer's current policy documents and authorized systems. I cannot issue a policy or handle a claim.",
    hi:"मैं प्रीमियम, वेटिंग पीरियड और क्लेम दस्तावेज़ जैसे बीमा के सामान्य विषय समझा सकता हूं। वास्तविक कवरेज, अपवाद और क्लेम का निर्णय बीमा कंपनी के आधिकारिक दस्तावेज़ से ही होगा। यहां पॉलिसी जारी नहीं होती।",
    or:"ମୁଁ ପ୍ରିମିୟମ୍, ୱେଟିଂ ପିରିଅଡ୍ ଓ କ୍ଲେମ୍ ଡକ୍ୟୁମେଣ୍ଟ ଭଳି ସାଧାରଣ ବୀମା ବିଷୟ ବୁଝାଇପାରିବି। ପ୍ରକୃତ କଭରେଜ୍ ଓ କ୍ଲେମ୍ ନିଷ୍ପତ୍ତି ପାଇଁ ବୀମା କମ୍ପାନୀର ସରକାରୀ ଡକ୍ୟୁମେଣ୍ଟ ଆବଶ୍ୟକ।"
  },
  membership:{
    en:"I can explain how Starter and paid DBest memberships may differ in onboarding, verification and eligibility. Current prices, payout percentages and account eligibility must come from the approved membership service. I cannot register a user or guarantee earnings.",
    hi:"मैं Starter और अन्य DBest सदस्यता श्रेणियों में रजिस्ट्रेशन, KYC और पात्रता का अंतर समझा सकता हूं। वर्तमान शुल्क, कमिशन और पात्रता की पुष्टि DBest के आधिकारिक सदस्यता सिस्टम से ही होगी। यहां सदस्यता या कमाई की गारंटी नहीं है।",
    or:"Starter ଓ ଅନ୍ୟ DBest ସଦସ୍ୟତାର ପଞ୍ଜୀକରଣ, KYC ଓ ଯୋଗ୍ୟତା ବିଷୟରେ ସାଧାରଣ ବ୍ୟାଖ୍ୟା ଦେଇପାରିବି। ବର୍ତ୍ତମାନ ଫି, କମିଶନ୍ ଓ ଯୋଗ୍ୟତା ପାଇଁ DBest ର ଅଧିକୃତ ସେବା ଯାଞ୍ଚ ଆବଶ୍ୟକ।"
  },
  general:{
    en:"I can demonstrate how DBest could help with travel, cabs, marketplace, insurance and membership questions. Choose a topic and I'll explain the proposed journey; I cannot access live services.",
    hi:"मैं DBest की यात्रा, कैब, मार्केटप्लेस, बीमा और सदस्यता सेवाओं की प्रक्रिया समझा सकता हूं। आप कोई विषय चुनिए; लाइव सेवा यहां उपलब्ध नहीं है।",
    or:"DBest ର ଯାତ୍ରା, କ୍ୟାବ୍, ମାର୍କେଟପ୍ଲେସ୍, ବୀମା ଓ ସଦସ୍ୟତା ସେବା ବିଷୟରେ ସାଧାରଣ ତଥ୍ୟ ଦେଇପାରିବି। ଆପଣ ଏକ ବିଷୟ ବାଛନ୍ତୁ; ଲାଇଭ୍ ସେବା ନାହିଁ।"
  }
 },
 partner:{
  jobs:{
    en:"In the intended partner workspace, an authenticated Vaahak would see only their assigned ride or delivery requests, their status and permitted next steps. This simulation cannot display, accept or reject actual jobs.",
    hi:"पार्टनर खाते में सही तरीके से लॉगिन करने के बाद Vaahak केवल अपनी निर्धारित राइड या डिलीवरी और उसकी स्थिति देख सकेगा। यह परीक्षण वास्तविक जॉब स्वीकार या अस्वीकार नहीं करता।",
    or:"ଅଧିକୃତ ପାର୍ଟନର୍ ଲଗଇନ୍ ପରେ Vaahak କେବଳ ନିଜକୁ ମିଳିଥିବା ରାଇଡ୍ କିମ୍ବା ଡେଲିଭରି ଦେଖିପାରିବେ। ଏହି ପରୀକ୍ଷାରେ ପ୍ରକୃତ ଜବ୍ ଗ୍ରହଣ କିମ୍ବା ବାତିଲ୍ ହୁଏ ନାହିଁ।"
  },
  marketplace:{
    en:"A verified vendor could view assigned quote requests, respond with prices and progress through preparing, handover and delivery status. All such actions would use the existing DBest marketplace workflows after authentication. No vendor account is connected here.",
    hi:"सत्यापित विक्रेता कोटेशन अनुरोध देखकर भाव दे सकेगा और तैयारी, हैंडओवर व डिलीवरी की स्थिति बदल सकेगा। यह सब मौजूदा DBest मार्केटप्लेस सिस्टम में लॉगिन के बाद होगा। इस परीक्षण में कोई वास्तविक आदेश नहीं है।",
    or:"ଯାଞ୍ଚ ହୋଇଥିବା ବିକ୍ରେତା ଦର ପ୍ରସ୍ତାବ, ପ୍ରସ୍ତୁତି ଓ ଡେଲିଭରି ଅବସ୍ଥା ଦେଖିପାରିବେ। ଏହା ଅଧିକୃତ DBest ମାର୍କେଟପ୍ଲେସ୍ ସେବା ମାଧ୍ୟମରେ ହେବ। ଏଠାରେ ପ୍ରକୃତ ଅର୍ଡର୍ ନାହିଁ।"
  },
  payout:{
    en:"An authenticated partner may eventually ask about their own verified ledger, payable amounts and reconciliation. This preview cannot see balances, forecast payouts or trigger transfers. Contact support for actual account questions.",
    hi:"भविष्य में सत्यापित पार्टनर अपने लेजर, देय राशि और भुगतान के बारे में पूछ सकेगा। यह परीक्षण बैलेंस नहीं देख सकता, कमाई की गारंटी नहीं देता और पैसे ट्रांसफर नहीं करता।",
    or:"ଅଧିକୃତ ପାର୍ଟନର୍ ନିଜର ଲେଜର୍ ଓ ଦେୟ ରାଶି ଯାଞ୍ଚ କରିପାରିବେ। ଏହି ପରୀକ୍ଷା ବାଲାନ୍ସ ଦେଖାଏ ନାହିଁ କିମ୍ବା ଟଙ୍କା ପଠାଏ ନାହିଁ।"
  },
  onboarding:{
    en:"Partner onboarding should verify identity, approved service category and required documents through DBest's existing onboarding workflow. Do not send identity documents in chat; this preview cannot approve KYC.",
    hi:"पार्टनर रजिस्ट्रेशन में सेवा की श्रेणी और जरूरी दस्तावेज़ DBest की मौजूदा KYC प्रक्रिया से सत्यापित होने चाहिए। चैट में पहचान दस्तावेज़ न भेजें। यहां KYC स्वीकृत नहीं होता।",
    or:"ପାର୍ଟନର୍ ପଞ୍ଜୀକରଣ ଓ ଆବଶ୍ୟକ ଡକ୍ୟୁମେଣ୍ଟ DBest ର ମୂଳ KYC ପ୍ରକ୍ରିୟାରେ ଯାଞ୍ଚ ହେବ। ଚାଟରେ ପରିଚୟ ଡକ୍ୟୁମେଣ୍ଟ ପଠାନ୍ତୁ ନାହିଁ।"
  },
  general:{
    en:"I can demonstrate partner job, delivery, onboarding and payout explanations. Actual assignments, ledger entries and approvals need an authenticated DBest partner session.",
    hi:"मैं पार्टनर जॉब, डिलीवरी, रजिस्ट्रेशन और भुगतान की प्रक्रिया समझा सकता हूं। वास्तविक जानकारी के लिए सुरक्षित पार्टनर लॉगिन जरूरी होगा।",
    or:"ପାର୍ଟନର୍ ଜବ୍, ଡେଲିଭରି, ପଞ୍ଜୀକରଣ ଓ ପେମେଣ୍ଟ ପ୍ରକ୍ରିୟା ବୁଝାଇପାରିବି। ପ୍ରକୃତ ତଥ୍ୟ ପାଇଁ ସୁରକ୍ଷିତ ପାର୍ଟନର୍ ଲଗଇନ୍ ଆବଶ୍ୟକ।"
  }
 },
 owner:{
  outreach:{
    en:"Outreach monitoring could summarize scheduled cycles, sent/replied counts, invalid addresses and supplier tariff reconciliation once read-only, authorized data is connected. This preview has no access to Gmail, Sheets or actual campaign metrics.",
    hi:"आउटरीच मॉनिटर आगे चलकर ईमेल चक्र, भेजे गए मेल, जवाब, गलत पते और सप्लायर टैरिफ का सार दिखा सकेगा। अभी Gmail, Sheets या वास्तविक अभियान रिपोर्ट से कनेक्शन नहीं है।",
    or:"ଆଗକୁ ଆଉଟରିଚ୍ ମନିଟର୍ ଇମେଲ୍ ସାଇକେଲ୍, ଉତ୍ତର, ଭୁଲ ଠିକଣା ଓ ସପ୍ଲାୟର୍ ଦର ଯାଞ୍ଚ ସାର ଦେଇପାରିବ। ଏବେ Gmail/Sheets କିମ୍ବା ପ୍ରକୃତ ରିପୋର୍ଟ ସଂଯୁକ୍ତ ନାହିଁ।"
  },
  launch:{
    en:"A launch-readiness assistant should present evidence-backed checks for Cab, Marketplace, authentication, payments, Android notifications and Play reviews. It must not authorize deployment. No live checks or approvals were performed here.",
    hi:"लॉन्च तैयारी में कैब, मार्केटप्लेस, लॉगिन, पेमेंट, Android नोटिफिकेशन और Play समीक्षा की पुष्टि जरूरी है। AI अकेले लॉन्च स्वीकृत नहीं कर सकता। यहां वास्तविक सिस्टम की जांच नहीं हुई है।",
    or:"ଲଞ୍ଚ ପୂର୍ବରୁ କ୍ୟାବ୍, ମାର୍କେଟପ୍ଲେସ୍, ଲଗଇନ୍, ପେମେଣ୍ଟ, Android ନୋଟିଫିକେସନ୍ ଓ Play ସମୀକ୍ଷା ଯାଞ୍ଚ ଦରକାର। AI ନିଜେ ଲାଇଭ୍ ରିଲିଜ୍ ମଞ୍ଜୁର କରିପାରିବ ନାହିଁ।"
  },
  operations:{
    en:"An authorized owner dashboard could show aggregated bookings, fulfillment, failed orders, revenue trends and exception reports after verified access controls. No live operational or financial reports were fetched.",
    hi:"सुरक्षित मालिक लॉगिन के बाद डैशबोर्ड बुकिंग, ऑर्डर की स्थिति, विफलताओं, आय के रुझान और जरूरी कार्रवाई दिखा सकेगा। अभी कोई लाइव रिपोर्ट या वित्तीय डेटा नहीं लिया गया है।",
    or:"ଅଧିକୃତ ମାଲିକ ଲଗଇନ୍ ପରେ ବୁକିଂ, ଅର୍ଡର୍ ଅବସ୍ଥା, ବିଫଳତା, ଆୟ ପ୍ରବୃତ୍ତି ଓ ସତର୍କତା ଦେଖାଯାଇପାରିବ। ଏଠାରେ ପ୍ରକୃତ ଆର୍ଥିକ ରିପୋର୍ଟ ନାହିଁ।"
  },
  general:{
    en:"I can demonstrate owner-level planning for operations, outreach and launch readiness. Owner authentication, evidence-based reporting and audit controls must be added separately. No live business data is connected.",
    hi:"मैं संचालन, ईमेल आउटरीच और लॉन्च तैयारी की योजना समझा सकता हूं। वास्तविक मालिक लॉगिन, रिपोर्ट और ऑडिट अलग से सुरक्षित तरीके से जोड़ने होंगे। अभी लाइव डेटा नहीं है।",
    or:"ସଂଚାଳନ, ଆଉଟରିଚ୍ ଓ ଲଞ୍ଚ ପ୍ରସ୍ତୁତିର ଯୋଜନା ଦେଖାଇପାରିବି। ସୁରକ୍ଷିତ ମାଲିକ ଲଗଇନ୍, ରିପୋର୍ଟ ଓ ଅଡିଟ୍ ପରେ ଯୋଡ଼ିବାକୁ ପଡ଼ିବ।"
  }
 }
};
function demoReply(role,message){
 const locale=detectLanguage(message);
 if(sensitive(message))return {reply:protectedReplies[locale].sensitive,language:locale,intent:"safety"};
 if(action(message))return {reply:protectedReplies[locale].action,language:locale,intent:"blocked_action"};
 if(privateRequest(message))return {reply:protectedReplies[locale].private,language:locale,intent:"private"};
 const topic=intent(role,message);
 const text=(answers[role]?.[topic]||answers[role]?.general)?.[locale]||answers.customer.general.en;
 return {reply:text+"\n\n"+disclaimer[locale],language:locale,intent:topic};
}
module.exports={ROLES,detectLanguage,sensitive,action,privateRequest,intent,demoReply};
