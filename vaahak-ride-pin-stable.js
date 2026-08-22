(function(){
'use strict';
const VERSION='1.0.0';
let activeJob='',submitting=false,idleTimer=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lang(){let x='en';try{x=localStorage.getItem('d2_lang')||'en'}catch(e){}if(x==='ta')x='te';return x}
const T={
 en:{label:'4-digit Ride PIN',hint:'Enter the PIN shown on the customer’s ride screen.',start:'Verify PIN & Start Ride',invalid:'Enter the complete 4-digit Ride PIN.',wrong:'Ride PIN does not match. Please check the customer screen.',started:'Ride PIN verified. Ride started.',error:'Unable to start ride'},
 hi:{label:'4-अंकीय Ride PIN',hint:'ग्राहक की राइड स्क्रीन पर दिख रहा PIN दर्ज करें।',start:'PIN सत्यापित करें और राइड शुरू करें',invalid:'पूरा 4-अंकीय Ride PIN दर्ज करें।',wrong:'Ride PIN मेल नहीं खाता। ग्राहक की स्क्रीन दोबारा देखें।',started:'Ride PIN सत्यापित हुआ। राइड शुरू हो गई।',error:'राइड शुरू नहीं हो सकी'},
 bn:{label:'4-সংখ্যার Ride PIN',hint:'গ্রাহকের রাইড স্ক্রিনে দেখানো PIN লিখুন।',start:'PIN যাচাই করে রাইড শুরু করুন',invalid:'সম্পূর্ণ 4-সংখ্যার Ride PIN লিখুন।',wrong:'Ride PIN মিলছে না। গ্রাহকের স্ক্রিন আবার দেখুন।',started:'Ride PIN যাচাই হয়েছে। রাইড শুরু হয়েছে।',error:'রাইড শুরু করা যায়নি'},
 or:{label:'4-ଅଙ୍କର Ride PIN',hint:'ଗ୍ରାହକଙ୍କ ରାଇଡ୍ ସ୍କ୍ରିନରେ ଦେଖାଯାଇଥିବା PIN ଲେଖନ୍ତୁ।',start:'PIN ଯାଞ୍ଚ କରି ରାଇଡ୍ ଆରମ୍ଭ କରନ୍ତୁ',invalid:'ସମ୍ପୂର୍ଣ୍ଣ 4-ଅଙ୍କର Ride PIN ଲେଖନ୍ତୁ।',wrong:'Ride PIN ମେଳ ଖାଉନାହିଁ। ଗ୍ରାହକଙ୍କ ସ୍କ୍ରିନ୍ ଯାଞ୍ଚ କରନ୍ତୁ।',started:'Ride PIN ସତ୍ୟାପିତ। ରାଇଡ୍ ଆରମ୍ଭ ହେଲା।',error:'ରାଇଡ୍ ଆରମ୍ଭ ହୋଇପାରିଲା ନାହିଁ'},
 te:{label:'4-అంకెల Ride PIN',hint:'కస్టమర్ రైడ్ స్క్రీన్‌లో కనిపించే PIN నమోదు చేయండి.',start:'PIN ధృవీకరించి రైడ్ ప్రారంభించండి',invalid:'పూర్తి 4-అంకెల Ride PIN నమోదు చేయండి.',wrong:'Ride PIN సరిపోలలేదు. కస్టమర్ స్క్రీన్‌ను మళ్లీ చూడండి.',started:'Ride PIN ధృవీకరించబడింది. రైడ్ ప్రారంభమైంది.',error:'రైడ్ ప్రారంభించలేకపోయాం'}
};
const tr=()=>T[lang()]||T.en;
function note(msg,ok=true){try{if(typeof toast==='function')toast(msg);else if(typeof window.note==='function')window.note(msg,ok);else alert(msg)}catch(e){alert(msg)}}
function stopRefresh(){try{window.DBEST_VAAHAK_STABLE_DASHBOARD?.stop?.()}catch(e){}clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!submitting&&document.querySelector('[data-dbest-ride-pin-input]')){try{window.vaahakDashboard?.()}catch(e){}}},60000)}
function css(){if(document.getElementById('dbest-vaahak-pin-stable-css'))return;const s=document.createElement('style');s.id='dbest-vaahak-pin-stable-css';s.textContent=`
.dbestRidePinStable{margin-top:12px;padding:12px;border:1px solid #cfe0ff;background:#f7faff;border-radius:15px}
.dbestRidePinStable label{display:block;font-size:12px;font-weight:900;color:#24466f;margin-bottom:7px}
.dbestRidePinRow{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.dbestRidePinStable input{width:100%;min-width:0;padding:13px 14px;border:2px solid #bfd3f4;border-radius:12px;background:#fff;font-size:22px;font-weight:900;letter-spacing:7px;text-align:center;outline:none}
.dbestRidePinStable input:focus{border-color:#175cff;box-shadow:0 0 0 3px rgba(23,92,255,.12)}
.dbestRidePinStable button{white-space:nowrap}
.dbestRidePinStable small{display:block;margin-top:7px;color:#687386;line-height:1.4}
@media(max-width:480px){.dbestRidePinRow{grid-template-columns:1fr}.dbestRidePinStable button{width:100%;padding:12px}}
`;document.head.appendChild(s)}
function jobIdFrom(btn){const x=String(btn?.getAttribute('onclick')||'');const m=x.match(/vaahakJobAction\(['"]([^'"]+)['"]\s*,\s*['"]start['"]\)/);return m?m[1]:''}
function enhance(){css();document.querySelectorAll('.vhJob').forEach(card=>{const startBtn=[...card.querySelectorAll('button')].find(b=>/vaahakJobAction\([^)]*['"]start['"]/.test(String(b.getAttribute('onclick')||'')));if(!startBtn)return;const jobId=jobIdFrom(startBtn);if(!jobId)return;startBtn.style.display='none';if(card.querySelector(`[data-dbest-ride-pin-box="${CSS.escape(jobId)}"]`))return;const L=tr(),box=document.createElement('div');box.className='dbestRidePinStable';box.dataset.dbestRidePinBox=jobId;box.innerHTML=`<label>${esc(L.label)}</label><div class="dbestRidePinRow"><input data-dbest-ride-pin-input="${esc(jobId)}" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="4" placeholder="••••" aria-label="${esc(L.label)}"><button type="button" class="btn" data-dbest-ride-pin-submit="${esc(jobId)}">${esc(L.start)}</button></div><small>${esc(L.hint)}</small>`;startBtn.parentElement?.insertAdjacentElement('afterend',box)})}
async function submit(jobId){if(submitting)return;const input=document.querySelector(`[data-dbest-ride-pin-input="${CSS.escape(jobId)}"]`),L=tr();const pin=String(input?.value||'').replace(/\D/g,'').slice(0,4);if(!/^\d{4}$/.test(pin)){note(L.invalid,false);input?.focus();return}const call=window.DBEST_VAAHAK_LIVE?.call;if(typeof call!=='function')return note(L.error+': service unavailable',false);submitting=true;stopRefresh();try{input?.blur();const d=await call('start',{jobId,otp:pin},{vaahak:true});if(!d?.otpVerified)throw new Error('pin_not_verified');note(L.started,true);clearTimeout(idleTimer);activeJob='';setTimeout(()=>window.vaahakDashboard?.(),120)}catch(e){submitting=false;if(e?.message==='invalid_ride_otp'){note(L.wrong,false);input.value='';setTimeout(()=>input.focus(),80);return}note(L.error+': '+String(e?.message||e),false);setTimeout(()=>input?.focus(),80);return}submitting=false}
document.addEventListener('pointerdown',e=>{const input=e.target?.closest?.('[data-dbest-ride-pin-input]');if(input){activeJob=input.dataset.dbestRidePinInput||'';stopRefresh()}},true);
document.addEventListener('focusin',e=>{const input=e.target?.closest?.('[data-dbest-ride-pin-input]');if(input){activeJob=input.dataset.dbestRidePinInput||'';stopRefresh()}},true);
document.addEventListener('input',e=>{const input=e.target?.closest?.('[data-dbest-ride-pin-input]');if(!input)return;stopRefresh();const v=String(input.value||'').replace(/\D/g,'').slice(0,4);if(input.value!==v)input.value=v;if(v.length===4){const jobId=input.dataset.dbestRidePinInput||'';activeJob=jobId}},true);
document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-dbest-ride-pin-submit]');if(!b)return;e.preventDefault();e.stopPropagation();stopRefresh();submit(b.dataset.dbestRidePinSubmit||'')},true);
document.addEventListener('keydown',e=>{const input=e.target?.closest?.('[data-dbest-ride-pin-input]');if(!input)return;if(e.key==='Enter'){e.preventDefault();submit(input.dataset.dbestRidePinInput||'')}},true);
const mo=new MutationObserver(()=>{if(document.querySelector('.vhJob'))enhance()});mo.observe(document.documentElement,{childList:true,subtree:true});
[80,300,800,1600].forEach(ms=>setTimeout(enhance,ms));
window.DBEST_VAAHAK_RIDE_PIN_STABLE={version:VERSION,enhance,submit};
})();