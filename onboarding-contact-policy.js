(function(){
'use strict';
const VERSION='1.0.0';
const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
function isOnboarding(form){const a=String(form?.getAttribute('onsubmit')||'');return /regGo\(|registerVendor\(|registerVaahakPortal\(/.test(a)}
function prepare(form){if(!form||!isOnboarding(form))return;const mobile=form.querySelector('[name="mobile"]'),email=form.querySelector('[name="email"]');if(mobile){mobile.required=true;mobile.setAttribute('inputmode','tel');mobile.setAttribute('autocomplete','tel');mobile.setAttribute('minlength','10');mobile.setAttribute('maxlength','15')}if(email){email.required=true;email.type='email';email.setAttribute('autocomplete','email')}form.dataset.dbestContactPolicy='1'}
function scan(root=document){if(root.matches?.('form'))prepare(root);root.querySelectorAll?.('form').forEach(prepare)}
function valid(form){if(!isOnboarding(form))return true;prepare(form);const m=form.querySelector('[name="mobile"]'),e=form.querySelector('[name="email"]');const digits=String(m?.value||'').replace(/\D/g,'');if(!m||digits.length<10||digits.length>15){m?.focus();notify('A valid mobile number is mandatory for every DBest onboarding.');return false}if(!e||!/^\S+@\S+\.\S+$/.test(String(e.value||'').trim())){e?.focus();notify('A valid email ID is mandatory for DBest email authentication.');return false}return true}
document.addEventListener('submit',function(ev){const f=ev.target;if(!(f instanceof HTMLFormElement)||!isOnboarding(f))return;if(!valid(f)){ev.preventDefault();ev.stopImmediatePropagation()}},true);
const mo=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)})));mo.observe(document.documentElement,{childList:true,subtree:true});scan();
window.DBEST_ONBOARDING_CONTACT_POLICY={version:VERSION,scan,validate:valid,remoteOtpChannel:'email',smsEnabled:false,mobileMandatory:true};
})();