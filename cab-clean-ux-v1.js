(function(){
'use strict';
const VERSION='1.0.0';
const KEY='dbest_cab_initial_rider_v1';
const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
function css(){if(q('#dbest-cab-clean-ux-css'))return;const s=document.createElement('style');s.id='dbest-cab-clean-ux-css';s.textContent=`
/* Clean first-step cab screen */
.dcx .dcxHero,.dcx .dcxHint,.dcx .dcxBtns,.dcx .dcxStats,.dcx .dcxPowered{display:none!important}
.dcx .dcxPanel{padding:14px!important;margin:-18px 10px 0!important;border-radius:22px!important}
.dcx .dcxField{margin-bottom:10px!important}
.dcx .dcxActions{display:block!important;margin-top:12px!important}
.dcx .dcxActions button{width:100%!important;min-height:52px!important;border-radius:16px!important;font-size:15px!important;font-weight:900!important}
.dcx .dcxActions button:not(:last-child){display:none!important}
.dcx .dcxVehicles{margin-top:12px!important}
.dbestCabFirstRider{margin:10px 0 12px;padding:11px;border:1px solid #dfe7f4;border-radius:16px;background:#f8faff}
.dbestCabFirstRiderTop{display:flex;align-items:center;justify-content:space-between;gap:10px}
.dbestCabFirstRiderTop b{font-size:13px;color:#233653}
.dbestCabFirstRiderToggle{display:flex;gap:6px}
.dbestCabFirstRiderToggle button{border:1px solid #dbe4f1;background:#fff;color:#52627a;border-radius:999px;padding:8px 11px;font-size:11px;font-weight:900}
.dbestCabFirstRiderToggle button.on{background:#175cff;color:#fff;border-color:#175cff}
.dbestCabFirstRiderFields{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
.dbestCabFirstRiderFields.show{display:grid}
.dbestCabFirstRiderFields input{width:100%;border:1px solid #d7e1ef;border-radius:11px;padding:11px;font-size:13px;background:#fff}
@media(max-width:560px){.dbestCabFirstRiderTop{align-items:flex-start;flex-direction:column}.dbestCabFirstRiderToggle{width:100%}.dbestCabFirstRiderToggle button{flex:1}.dbestCabFirstRiderFields{grid-template-columns:1fr}.dcx .dcxMap{height:240px!important}}
`;document.head.appendChild(s)}
function getSaved(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||{mode:'self',name:'',mobile:''}}catch(e){return{mode:'self',name:'',mobile:''}}}
function save(v){try{sessionStorage.setItem(KEY,JSON.stringify(v))}catch(e){}try{if(typeof rideDraft!=='undefined'&&rideDraft){rideDraft.riderFor=v.mode;rideDraft.riderName=v.name||'';rideDraft.riderMobile=v.mobile||'';rideDraft.bookedForOther=v.mode==='other'}}catch(e){}}
function setMode(card,mode){const s=getSaved();s.mode=mode;save(s);card.querySelectorAll('[data-first-rider]').forEach(b=>b.classList.toggle('on',b.dataset.firstRider===mode));card.querySelector('.dbestCabFirstRiderFields')?.classList.toggle('show',mode==='other')}
function addRiderChoice(){const panel=q('.dcx .dcxPanel');if(!panel||q('#dbestCabFirstRider'))return;const action=q('.dcx .dcxActions');if(!action)return;const s=getSaved(),card=document.createElement('div');card.id='dbestCabFirstRider';card.className='dbestCabFirstRider';card.innerHTML=`<div class="dbestCabFirstRiderTop"><b>👤 Booking for</b><div class="dbestCabFirstRiderToggle"><button type="button" data-first-rider="self">Myself</button><button type="button" data-first-rider="other">Someone else</button></div></div><div class="dbestCabFirstRiderFields"><input id="dbestFirstRiderName" placeholder="Rider name" value="${String(s.name||'').replace(/"/g,'&quot;')}"><input id="dbestFirstRiderMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="${String(s.mobile||'').replace(/"/g,'&quot;')}"></div>`;action.insertAdjacentElement('beforebegin',card);card.querySelectorAll('[data-first-rider]').forEach(b=>b.onclick=()=>setMode(card,b.dataset.firstRider));const n=card.querySelector('#dbestFirstRiderName'),m=card.querySelector('#dbestFirstRiderMobile');const sync=()=>{const z=getSaved();z.name=n.value.trim();z.mobile=m.value.replace(/\D/g,'').slice(0,10);save(z)};n.oninput=sync;m.oninput=sync;setMode(card,s.mode||'self')}
function removeDuplicateContinue(){const btns=qa('.dcx button').filter(b=>/continue\s*.*choose vehicle/i.test((b.textContent||'').trim()));btns.forEach((b,i)=>{if(i>0)b.style.display='none'})}
function syncConfirm(){const card=q('#dbestRiderCard');if(!card||card.dataset.dbestInitialSynced==='1')return;card.dataset.dbestInitialSynced='1';const s=getSaved();if(s.mode!=='other')return;const other=card.querySelector('[data-rider-mode="other"]');if(other)other.click();const name=card.querySelector('input[name="riderName"]'),mobile=card.querySelector('input[name="riderMobile"]');if(name)name.value=s.name||'';if(mobile)mobile.value=s.mobile||'';try{if(typeof rideDraft!=='undefined'&&rideDraft){rideDraft.riderFor='other';rideDraft.riderName=s.name||'';rideDraft.riderMobile=s.mobile||'';rideDraft.bookedForOther=true}}catch(e){}}
function mount(){css();addRiderChoice();removeDuplicateContinue();syncConfirm()}
[0,120,350,700,1200,2200].forEach(ms=>setTimeout(mount,ms));document.addEventListener('click',()=>setTimeout(mount,30),true);window.addEventListener('pageshow',()=>setTimeout(mount,50));
window.DBEST_CAB_CLEAN_UX={version:VERSION,mount};
})();