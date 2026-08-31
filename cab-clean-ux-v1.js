(function(){
'use strict';
const VERSION='1.1.0';
const KEY='dbest_cab_initial_rider_v1';
const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
function css(){
  let s=q('#dbest-cab-clean-ux-css');if(s)s.remove();
  s=document.createElement('style');s.id='dbest-cab-clean-ux-css';s.textContent=`
.dcxHero,.dcxHint,.dcxBtns,.dcxStats,.dcxPowered,.cabxNote,.c9Hint,.mcHint,.dbestCabUtilityStrip,.dbestCabObsolete{display:none!important}
#dbestCabContinueWrap small{display:none!important}
.dcxPanel{display:block!important;visibility:visible!important;opacity:1!important;padding:14px!important;margin:-18px 10px 0!important;border-radius:22px!important}
.dcxField,#dcxPickup,#dcxDrop{visibility:visible!important;opacity:1!important}.dcxField{margin-bottom:10px!important}
.dcxVehicles{margin-top:12px!important}
.dbestCabFirstRider{margin:12px 0;padding:12px;border:1px solid #dfe7f4;border-radius:16px;background:#f8faff}
.dbestCabFirstRiderTop{display:flex;align-items:center;justify-content:space-between;gap:10px}.dbestCabFirstRiderTop b{font-size:13px;color:#233653}
.dbestCabFirstRiderToggle{display:flex;gap:6px}.dbestCabFirstRiderToggle button{border:1px solid #dbe4f1;background:#fff;color:#52627a;border-radius:999px;padding:9px 12px;font-size:11px;font-weight:900}.dbestCabFirstRiderToggle button.on{background:#175cff;color:#fff;border-color:#175cff}
.dbestCabFirstRiderFields{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.dbestCabFirstRiderFields.show{display:grid}.dbestCabFirstRiderFields input{width:100%;border:1px solid #d7e1ef;border-radius:11px;padding:11px;font-size:13px;background:#fff}
.dbestCabPrimaryContinue{display:block!important;width:100%!important;min-height:54px!important;border:0!important;border-radius:16px!important;background:#175cff!important;color:#fff!important;font-weight:900!important;font-size:15px!important;margin:10px 0 4px!important}
@media(max-width:560px){.dbestCabFirstRiderTop{align-items:flex-start;flex-direction:column}.dbestCabFirstRiderToggle{width:100%}.dbestCabFirstRiderToggle button{flex:1}.dbestCabFirstRiderFields{grid-template-columns:1fr}.dcxMap{height:240px!important}}
`;document.head.appendChild(s)
}
function getSaved(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||{mode:'self',name:'',mobile:''}}catch(e){return{mode:'self',name:'',mobile:''}}}
function save(v){try{sessionStorage.setItem(KEY,JSON.stringify(v))}catch(e){}try{if(typeof rideDraft!=='undefined'&&rideDraft){rideDraft.riderFor=v.mode;rideDraft.riderName=v.name||'';rideDraft.riderMobile=v.mobile||'';rideDraft.bookedForOther=v.mode==='other'}}catch(e){}}
function setMode(card,mode){const s=getSaved();s.mode=mode;save(s);card.querySelectorAll('[data-first-rider]').forEach(b=>b.classList.toggle('on',b.dataset.firstRider===mode));card.querySelector('.dbestCabFirstRiderFields')?.classList.toggle('show',mode==='other')}
function norm(t){return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function getContinues(){return qa('button,a').filter(el=>{const t=norm(el.textContent);return t.includes('continue')&&(t.includes('vehicle')||t.includes('fare'))})}
function cleanupLegacyControls(){
  const unwanted=new Set(['gps on','easy pin','smart search','pickup map','drop map','current','swap pickup drop']);
  qa('button,a,span,div').forEach(el=>{
    if(el.closest('#dbestCabFirstRider'))return;
    const t=norm(el.textContent);
    if(unwanted.has(t)){
      const target=el.closest('button,a')||el;
      target.classList.add('dbestCabObsolete');
      target.style.setProperty('display','none','important');
    }
  });
  qa('div').forEach(row=>{
    if(row.classList.contains('dcxPanel')||row.querySelector('#dcxPickup,#dcxDrop,#dbestCabFirstRider'))return;
    const kids=Array.from(row.children).filter(x=>getComputedStyle(x).display!=='none');if(kids.length<2||kids.length>6)return;
    const vals=kids.map(k=>norm(k.textContent)).filter(Boolean);
    if(vals.length>=2&&vals.every(v=>unwanted.has(v))){row.classList.add('dbestCabUtilityStrip');row.style.setProperty('display','none','important')}
  });
  qa('.dcxBtns').forEach(x=>{x.classList.add('dbestCabUtilityStrip');x.style.setProperty('display','none','important')});
  qa('small,p,div').forEach(el=>{if(el.children.length>1)return;const t=norm(el.textContent);if(t.startsWith('next choose vehicle')||t.includes('tapping a vehicle opens')||t.includes('calculate the route show vehicle fares'))el.style.setProperty('display','none','important')});
  const cs=getContinues();cs.forEach((b,i)=>{if(i===0){b.classList.add('dbestCabPrimaryContinue');b.style.removeProperty('display')}else{b.classList.add('dbestCabObsolete');b.style.setProperty('display','none','important')}});
  const panel=q('.dcxPanel');if(panel){panel.style.setProperty('display','block','important');panel.style.setProperty('visibility','visible','important')}
}
function addRiderChoice(){
  const panel=q('.dcxPanel');if(!panel)return;
  let card=q('#dbestCabFirstRider');if(card)return;
  const s=getSaved();card=document.createElement('div');card.id='dbestCabFirstRider';card.className='dbestCabFirstRider';card.innerHTML=`<div class="dbestCabFirstRiderTop"><b>👤 Booking for</b><div class="dbestCabFirstRiderToggle"><button type="button" data-first-rider="self">Myself</button><button type="button" data-first-rider="other">Someone else</button></div></div><div class="dbestCabFirstRiderFields"><input id="dbestFirstRiderName" placeholder="Rider name" value="${String(s.name||'').replace(/"/g,'&quot;')}"><input id="dbestFirstRiderMobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="${String(s.mobile||'').replace(/"/g,'&quot;')}"></div>`;
  const primary=getContinues()[0];
  if(primary){const wrap=primary.closest('#dbestCabContinueWrap,.dcxActions')||primary;wrap.insertAdjacentElement('beforebegin',card)}else panel.appendChild(card);
  card.querySelectorAll('[data-first-rider]').forEach(b=>b.onclick=()=>setMode(card,b.dataset.firstRider));const n=card.querySelector('#dbestFirstRiderName'),m=card.querySelector('#dbestFirstRiderMobile');const sync=()=>{const z=getSaved();z.name=n.value.trim();z.mobile=m.value.replace(/\D/g,'').slice(0,10);save(z)};n.oninput=sync;m.oninput=sync;setMode(card,s.mode||'self')
}
function syncConfirm(){const card=q('#dbestRiderCard');if(!card||card.dataset.dbestInitialSynced==='1')return;card.dataset.dbestInitialSynced='1';const s=getSaved();if(s.mode!=='other')return;card.querySelector('[data-rider-mode="other"]')?.click();const name=card.querySelector('input[name="riderName"]'),mobile=card.querySelector('input[name="riderMobile"]');if(name)name.value=s.name||'';if(mobile)mobile.value=s.mobile||'';try{if(typeof rideDraft!=='undefined'&&rideDraft){rideDraft.riderFor='other';rideDraft.riderName=s.name||'';rideDraft.riderMobile=s.mobile||'';rideDraft.bookedForOther=true}}catch(e){}}
function mount(){css();cleanupLegacyControls();addRiderChoice();cleanupLegacyControls();syncConfirm()}
[0,80,180,350,700,1200,2200,4000].forEach(ms=>setTimeout(mount,ms));document.addEventListener('click',()=>setTimeout(mount,25),true);window.addEventListener('pageshow',()=>setTimeout(mount,40));let mt=null;const mo=new MutationObserver(()=>{clearTimeout(mt);mt=setTimeout(mount,25)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_CAB_CLEAN_UX={version:VERSION,mount};
})();