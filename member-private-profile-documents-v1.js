(function(){
'use strict';
const VERSION='1.0.0-private-profile-docs';
function cfg(){return window.DBEST_RUNTIME_CONFIG||{}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function member(){try{return users.find(x=>String(x.id)===String(session?.id))}catch(e){return null}}
function inject(){
 const u=member();if(!u)return;
 const root=[...document.querySelectorAll('.sectionContent')].find(x=>/My Profile|Profile Field|Membership Type/i.test(x.innerText||''));if(!root||root.querySelector('[data-dbest-private-profile]'))return;
 const subs=root.querySelector('.subs');if(!subs)return;
 const b=document.createElement('button');b.className='sub';b.type='button';b.setAttribute('data-dbest-private-profile','1');
 b.innerHTML='<b>🪪 Aadhaar & Bank Details</b><small>Securely upload Aadhaar and bank proof / payout details</small>';
 b.onclick=()=>window.DBEST_OPEN_PRIVATE_PROFILE?.();subs.insertBefore(b,subs.firstChild);
}
function modal(){
 const u=member();if(!u)return;
 document.getElementById('dbestPrivateProfileOverlay')?.remove();
 const o=document.createElement('div');o.id='dbestPrivateProfileOverlay';
 o.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(8,18,40,.68);display:flex;align-items:flex-end;justify-content:center;padding:0';
 o.innerHTML=`<div style="background:#fff;width:min(680px,100%);max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px;color:#172033">
 <div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b style="font-size:20px">Aadhaar & Bank Details</b><div style="font-size:12px;color:#64748b;margin-top:4px">Private documents • PDF/JPG/PNG • Max 5 MB each</div></div><button type="button" id="dbestPrivateClose" style="border:0;background:#eef2f7;border-radius:12px;padding:9px 12px">✕</button></div>
 <form id="dbestPrivateProfileForm" style="display:grid;gap:12px;margin-top:18px">
 <label>Aadhaar last 4 digits<input name="aadhaarLast4" inputmode="numeric" maxlength="4" value="${esc(String(u.aad||'').replace(/\D/g,'').slice(-4))}" placeholder="Last 4 digits only" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9e0ea;border-radius:12px;margin-top:5px"></label>
 <label>Upload Aadhaar<input name="aadhaarFile" type="file" accept="image/jpeg,image/png,application/pdf" style="display:block;margin-top:7px"></label>
 <hr style="border:0;border-top:1px solid #edf0f4;width:100%">
 <label>Account holder name<input name="accountName" value="${esc(u.name||'')}" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9e0ea;border-radius:12px;margin-top:5px"></label>
 <label>Bank name<input name="bankName" placeholder="Bank name" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9e0ea;border-radius:12px;margin-top:5px"></label>
 <label>Bank account number<input name="accountNumber" inputmode="numeric" autocomplete="off" placeholder="Account number" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9e0ea;border-radius:12px;margin-top:5px"></label>
 <label>IFSC<input name="ifsc" value="${esc(u.ifsc||'')}" autocapitalize="characters" placeholder="e.g. SBIN0001234" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9e0ea;border-radius:12px;margin-top:5px;text-transform:uppercase"></label>
 <label>Upload bank proof / cancelled cheque<input name="bankProofFile" type="file" accept="image/jpeg,image/png,application/pdf" style="display:block;margin-top:7px"></label>
 <div id="dbestPrivateProfileMsg" style="font-size:13px;color:#64748b"></div>
 <button id="dbestPrivateSave" type="submit" style="border:0;border-radius:14px;background:#1550c6;color:#fff;padding:13px;font-weight:700">Save Securely</button>
 </form></div>`;
 document.body.appendChild(o);o.querySelector('#dbestPrivateClose').onclick=()=>o.remove();o.addEventListener('click',e=>{if(e.target===o)o.remove()});
 o.querySelector('form').onsubmit=saveProfile;
}
async function saveProfile(e){
 e.preventDefault();const form=e.currentTarget,msg=form.querySelector('#dbestPrivateProfileMsg'),btn=form.querySelector('#dbestPrivateSave');
 const c=cfg(),base=String(c.supabaseUrl||'').replace(/\/$/,''),key=String(c.supabasePublishableKey||''),token=localStorage.getItem('dbest_member_live_token')||'';
 if(!base||!key||!token){msg.textContent='Please sign in again before saving.';return}
 const fd=new FormData(form);const af=fd.get('aadhaarFile'),bf=fd.get('bankProofFile');
 for(const f of [af,bf])if(f instanceof File&&f.size>5242880){msg.textContent='Each document must be 5 MB or smaller.';return}
 btn.disabled=true;btn.textContent='Saving…';msg.textContent='Encrypting connection and uploading privately…';
 try{
  const r=await fetch(base+'/functions/v1/member-profile-documents',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'x-dbest-member-token':token},body:fd});
  const d=await r.json().catch(()=>({}));if(!r.ok){if(r.status===401||/session_invalid/i.test(String(d.error||'')))window.dispatchEvent(new CustomEvent('dbest:member-session-invalid'));throw new Error(d.error||'save_failed')};
  const u=member();if(u){if(d.aadhaarLast4)u.aad='••••••••'+d.aadhaarLast4;if(d.bank?.accountLast4)u.bank='••••'+d.bank.accountLast4;if(d.bank?.ifsc)u.ifsc=d.bank.ifsc;try{save()}catch(_){}}
  msg.style.color='#087a42';msg.textContent='Saved securely.';btn.textContent='Saved';
  setTimeout(()=>{document.getElementById('dbestPrivateProfileOverlay')?.remove();try{memberProfile(session.id)}catch(_){}},700);
 }catch(err){msg.style.color='#b42318';msg.textContent='Could not save. Please check the details and try again.';btn.disabled=false;btn.textContent='Save Securely'}
}
window.DBEST_OPEN_PRIVATE_PROFILE=modal;
function wrap(){
 try{const fn=window.memberProfile;if(typeof fn!=='function'||fn.__dbestPrivateDocs)return false;
  const w=function(){const r=fn.apply(this,arguments);setTimeout(inject,0);return r};w.__dbestPrivateDocs=true;window.memberProfile=w;return true
 }catch(e){return false}
}
let n=0,iv=setInterval(()=>{n++;if(wrap()||n>40)clearInterval(iv)},150);
document.addEventListener('click',()=>setTimeout(inject,0),true);
})();