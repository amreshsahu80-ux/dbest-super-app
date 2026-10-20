(function(){
'use strict';
const VERSION='20261020-authenticated-member-referral-share-v2-mount-retry';
if(window.DBEST_MEMBER_REFERRAL_SHARE?.version===VERSION)return;
const config=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(config.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(config.supabasePublishableKey||'');
const TOKEN_KEY='dbest_member_live_token';
const ELIGIBLE=new Set(['promoter','prime','leader']);
const ID='dbestMemberReferralLink';
const acceptedPayments=new Set(['approved','razorpay verified','payu verified','verified']);
let checking=false,queued=false,lastAttempt=0,shownKey='',retryTimer=null;
function token(){
 try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem(TOKEN_KEY)||'')}catch(_){return''}
}
function memberSession(){
 try{const s=window.DBEST_SESSION_COMPAT?.read?.()||window.session||JSON.parse(localStorage.getItem('d2_session')||'{}');return {id:String(s?.id||'').trim(),role:String(s?.role||'').trim().toLowerCase()}}catch(_){return {id:'',role:''}}
}
function referralFrom(data,id){
 if(!data?.ok||String(data.viewerId||'')!==String(id||''))return null;
 const rows=Array.isArray(data.members)?data.members:[];
 const m=rows.find(x=>String(x.id||x.member_id||'')===String(id||''));
 if(!m)return null;
 const tier=String(m.tier||m.role||'').trim().toLowerCase();
 const status=String(m.status||'').trim().toLowerCase();
 const paid=String(m.paymentStatus||m.payment_status||'').trim().toLowerCase();
 const code=String(m.ref||m.referral_code||'').trim().toUpperCase();
 if(!ELIGIBLE.has(tier)||status!=='active'||!acceptedPayments.has(paid))return null;
 if(!/^[A-Z0-9][A-Z0-9_-]{1,79}$/.test(code))return null;
 return {id:String(id),tier,code};
}
function buildUrl(code){
 const c=String(code||'').trim().toUpperCase();
 if(!/^[A-Z0-9][A-Z0-9_-]{1,79}$/.test(c))throw Error('invalid_referral_code');
 const q=new URLSearchParams({ref:c});
 return 'https://dbest4u.com/membership-choose.html?'+q.toString();
}
async function verify(){
 const s=memberSession(),t=token();
 if(!ELIGIBLE.has(s.role)||!s.id||!t||!BASE||!KEY)return null;
 const r=await fetch(BASE+'/functions/v1/member-network-live',{
   method:'POST',cache:'no-store',
   headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-member-token':t},
   body:'{}'
 });
 if(!r.ok)return null;
 const d=await r.json().catch(()=>null);
 const latest=memberSession();
 if(latest.id!==s.id||latest.role!==s.role||token()!==t)return null;
 return referralFrom(d,s.id);
}
function dashboard(){
 const roots=Array.from(document.querySelectorAll('.sectionContent.classicDash'));
 return roots.find(root=>root.querySelector('.memberMiniHead')&&/Member Business Dashboard/i.test(String(root.querySelector('.memberMiniHead')?.textContent||'')))||null;
}
function addButton(root,member,key){
 const anchor=root.querySelector('.memberMiniHead');
 if(!anchor)return;
 const section=document.createElement('section');section.id=ID;
 section.style.cssText='margin:12px 0;padding:14px;border-radius:16px;background:#f2f7ff;border:1px solid #cfe0ff;color:#173459';
 const heading=document.createElement('div');heading.style.cssText='font-weight:850;font-size:15px';heading.textContent='🤝 Invite Members to DBest';
 const sub=document.createElement('div');sub.style.cssText='font-size:12px;margin:5px 0 10px;color:#526584';
 sub.textContent='Your referral ID '+member.code+' is automatically included in the joining link.';
 const button=document.createElement('button');button.type='button';button.id='dbestCreateReferralLink';
 button.style.cssText='width:100%;border:0;border-radius:12px;background:#175cff;color:white;padding:12px;font-weight:850;cursor:pointer';
 button.textContent='🔗 Create Referral Link';
 const panel=document.createElement('div');panel.id='dbestReferralSharePanel';panel.hidden=true;panel.style.cssText='margin-top:10px';
 const field=document.createElement('input');field.type='text';field.readOnly=true;field.setAttribute('aria-label','Your referral joining link');
 field.style.cssText='display:block;box-sizing:border-box;width:100%;padding:11px;border:1px solid #bed0ea;border-radius:10px;font-size:12px;background:white';
 const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px';
 const copy=document.createElement('button');copy.type='button';copy.id='dbestCopyReferralLink';copy.textContent='Copy Link';
 copy.style.cssText='border:1px solid #175cff;border-radius:10px;padding:10px 14px;color:#175cff;background:#fff;font-weight:800';
 const whats=document.createElement('a');whats.id='dbestWhatsappReferralLink';whats.textContent='Share on WhatsApp';whats.target='_blank';whats.rel='noopener noreferrer';
 whats.style.cssText='border-radius:10px;padding:10px 14px;background:#e2f7e7;color:#145c30;font-weight:800;text-decoration:none';
 const note=document.createElement('div');note.style.cssText='font-size:11px;margin-top:7px;color:#526584';note.textContent='Your friend can choose a membership; your referral ID will be prefilled.';
 const active=()=>{const s=memberSession();return s.id===member.id&&ELIGIBLE.has(s.role)&&token()&&shownKey===key&&section.isConnected};
 button.addEventListener('click',()=>{
   if(!active()){section.remove();shownKey='';return}
   const url=buildUrl(member.code);field.value=url;panel.hidden=false;
   whats.href='https://wa.me/?text='+encodeURIComponent('Join DBest with my referral ID '+member.code+': '+url);
   if(typeof field.focus==='function')field.focus();
 });
 copy.addEventListener('click',async()=>{
   if(!active()){section.remove();shownKey='';return}
   const url=buildUrl(member.code);
   try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
     else{field.focus();field.select();if(!document.execCommand?.('copy'))throw Error('copy_unavailable')}
     copy.textContent='✓ Copied';
   }catch(_){field.focus();field.select();copy.textContent='Select & Copy Link'}
 });
 actions.append(copy,whats);panel.append(field,actions,note);section.append(heading,sub,button,panel);
 anchor.insertAdjacentElement('afterend',section);
}
async function mount(){
 const root=dashboard(),s=memberSession(),t=token(),el=document.getElementById(ID);
 if(!root||!ELIGIBLE.has(s.role)||!s.id||!t){if(el)el.remove();shownKey='';return}
 if(!BASE||!KEY)return;
 const key=s.id+'|'+t;
 if(el&&shownKey===key)return;
 if(el){el.remove();shownKey=''}
 if(checking){scheduleRetry(400);return}
 const elapsed=Date.now()-lastAttempt;
 if(elapsed<1200){scheduleRetry(1250-elapsed);return}
 checking=true;lastAttempt=Date.now();
 try{
   const member=await verify();
   if(!member)return;
   if(!root.isConnected||dashboard()!==root){scheduleRetry(400);return}
   if(document.getElementById(ID))return;
   shownKey=key;addButton(root,member,key);
 }catch(e){console.warn('DBest member referral link unavailable',e)}
 finally{checking=false}
}
function scheduleRetry(ms){
 if(retryTimer!==null)return;
 retryTimer=setTimeout(()=>{retryTimer=null;queue()},Math.max(120,ms||500));
}
function queue(){
 if(queued)return;queued=true;
 setTimeout(()=>{queued=false;mount()},90);
}
if(typeof MutationObserver!=='undefined')new MutationObserver(queue).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',queue,{once:true});
document.addEventListener('click',e=>{if(e.target?.closest?.('button,a,[role="button"]'))queue()},true);
setTimeout(queue,150);
window.DBEST_MEMBER_REFERRAL_SHARE={version:VERSION,referralFrom,buildUrl,verify,mount};
})();