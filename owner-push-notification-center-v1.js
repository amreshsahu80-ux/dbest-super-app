(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/push-notification-live';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ownerToken(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(_){return''}}
async function call(body){const t=ownerToken();if(!t)throw Error('Owner login required');const r=await fetch(API,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-owner-token':t},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.detail||('HTTP '+r.status));return d}
function css(){return '<style id="dbestPushOwnerCss">#dbestPushOwnerModal{position:fixed;inset:0;z-index:2147483646;background:#081226b8;display:grid;place-items:center;padding:14px}.dpo{width:min(760px,100%);max-height:92dvh;overflow:auto;background:#f7f9fc;border-radius:22px;box-shadow:0 28px 90px #0006}.dpoHead{background:linear-gradient(135deg,#10264d,#175cff,#684cff);color:#fff;padding:18px;border-radius:22px 22px 0 0;display:flex;gap:10px;align-items:center}.dpoHead h2{margin:0;font:900 20px system-ui}.dpoBody{padding:16px}.dpoGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dpoField{display:grid;gap:6px}.dpoField.full{grid-column:1/-1}.dpo label{font:800 12px system-ui;color:#526177}.dpo input,.dpo select,.dpo textarea{width:100%;border:1px solid #dbe3ef;border-radius:12px;padding:11px;background:#fff;font:600 14px system-ui}.dpo textarea{min-height:90px;resize:vertical}.dpoBtn{border:0;border-radius:12px;padding:11px 14px;font:900 13px system-ui;cursor:pointer}.dpoSend{background:#175cff;color:#fff}.dpoClose{background:#ffffff22;color:#fff;margin-left:auto}.dpoResult{margin-top:12px;padding:12px;border-radius:12px;background:#eef4ff;color:#173f86;font:800 13px system-ui;display:none}@media(max-width:640px){.dpoGrid{grid-template-columns:1fr}.dpoField.full{grid-column:1}}</style>'}
function open(){
 if(document.getElementById('dbestPushOwnerModal'))return;
 document.head.insertAdjacentHTML('beforeend',css());
 const d=document.createElement('div');d.id='dbestPushOwnerModal';d.innerHTML='<div class="dpo"><div class="dpoHead"><h2>🔔 DBest Push Notification Centre</h2><button class="dpoBtn dpoClose" id="dpoClose">Close</button></div><div class="dpoBody"><div class="dpoGrid"><div class="dpoField"><label>Audience</label><select id="dpoType"><option>All</option><option>Member</option><option>Vendor</option><option>Vaahak</option><option>Service Partner</option><option>Distributor</option></select></div><div class="dpoField"><label>Specific Account ID (optional)</label><input id="dpoId" placeholder="e.g. PR1062 / VND... / DA-..."></div><div class="dpoField"><label>Category</label><select id="dpoCat"><option value="announcement">Announcement</option><option value="marketing">Marketing</option><option value="transactional">Transactional</option><option value="order">Order</option><option value="ride">Ride</option><option value="job">Job</option><option value="payment">Payment</option><option value="wallet">Wallet</option><option value="intervention">Intervention</option></select></div><div class="dpoField"><label>Open URL when tapped</label><input id="dpoUrl" value="/" placeholder="/"></div><div class="dpoField full"><label>Title</label><input id="dpoTitle" maxlength="160" placeholder="DBest Update"></div><div class="dpoField full"><label>Message</label><textarea id="dpoBody" maxlength="500" placeholder="Write notification message"></textarea></div><div class="dpoField full"><button class="dpoBtn dpoSend" id="dpoSend">Send Push Notification</button></div></div><div class="dpoResult" id="dpoResult"></div></div></div>';
 document.body.appendChild(d);
 document.getElementById('dpoClose').onclick=()=>d.remove();
 document.getElementById('dpoSend').onclick=async()=>{
   const btn=document.getElementById('dpoSend'),res=document.getElementById('dpoResult'),title=document.getElementById('dpoTitle').value.trim(),body=document.getElementById('dpoBody').value.trim();
   if(!title||!body){res.style.display='block';res.textContent='Enter a title and message.';return}
   if(!confirm('Send this push notification to the selected DBest audience?'))return;
   btn.disabled=true;btn.textContent='Sending…';res.style.display='block';res.textContent='Sending push notifications…';
   try{const x=await call({action:'owner_send',recipientType:document.getElementById('dpoType').value,recipientId:document.getElementById('dpoId').value.trim(),category:document.getElementById('dpoCat').value,title,body,targetUrl:document.getElementById('dpoUrl').value.trim()||'/'});res.textContent='Sent: '+x.sent+' • Failed: '+x.failed+' • Skipped: '+x.skipped+' • Registered devices targeted: '+x.devices}
   catch(e){res.textContent='Send failed: '+e.message}
   finally{btn.disabled=false;btn.textContent='Send Push Notification'}
 };
}
function inject(){
 if(!ownerToken()||document.getElementById('dbestOwnerPushBtn'))return;
 const host=document.querySelector('.ownerControlGrid,.owner55Grid,#ownerControls,.adminGrid')||document.body;
 const b=document.createElement('button');b.id='dbestOwnerPushBtn';b.type='button';b.textContent='🔔 Push Notifications';b.className='btn';b.style.cssText='margin:8px;padding:12px 16px;border:0;border-radius:12px;background:#175cff;color:#fff;font-weight:900;cursor:pointer';b.onclick=open;host.appendChild(b);
}
setTimeout(inject,700);setInterval(inject,3000);
window.DBEST_OWNER_PUSH={open};
})();