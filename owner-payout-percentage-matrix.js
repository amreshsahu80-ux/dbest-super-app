(function(){
'use strict';
const VERSION='1.0.0';
const LEVELS=[['self','Direct / Self'],['l1','Level 1'],['l2','Level 2'],['l3','Level 3']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').trim().toLowerCase();
function slug(s){return String(s||'x').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,46)||'x'}
function serviceList(){
  const out=[];
  try{
    if(typeof services!=='undefined'&&Array.isArray(services)){
      services.forEach(s=>{if(Array.isArray(s)&&s[1])out.push({id:String(s[0]||s[1]),name:String(s[1]),icon:String(s[2]||'•'),subs:Array.isArray(s[5])?s[5].map(String):[]})});
    }
  }catch(e){}
  try{
    if(typeof customServices!=='undefined'&&Array.isArray(customServices)){
      customServices.forEach((c,i)=>{
        if(Array.isArray(c)&&c[1])out.push({id:String(c[0]||('custom-'+i)),name:String(c[1]),icon:String(c[2]||'✨'),subs:Array.isArray(c[5])?c[5].map(String):[]});
        else if(c&&typeof c==='object'){
          const name=String(c.name||c.title||c.label||'').trim();if(!name)return;
          const subs=Array.isArray(c.subs)?c.subs:Array.isArray(c.subsections)?c.subsections:Array.isArray(c.services)?c.services:[];
          out.push({id:String(c.id||('custom-'+i)),name,icon:String(c.icon||'✨'),subs:subs.map(x=>String(x?.name||x?.title||x))});
        }
      });
    }
  }catch(e){}
  const seen=new Set();return out.filter(s=>{const k=norm(s.id)+'|'+norm(s.name);if(seen.has(k))return false;seen.add(k);return true});
}
function rules(){try{return (typeof payoutRules!=='undefined'&&Array.isArray(payoutRules))?payoutRules:[]}catch(e){return[]}}
function findPercentRule(scope,value,recipient){
  const candidates=rules().filter(r=>r&&r.enabled!==false&&r.valueType==='percent'&&r.scope===scope&&r.recipient===recipient&&norm(r.scopeValue)===norm(value));
  return candidates.find(r=>r.matrixRule)||candidates[0]||null;
}
function valueFor(scope,value,recipient){const r=findPercentRule(scope,value,recipient);return r?String(Number(r.amount||0)):''}
function input(name,value,placeholder='—'){
  return `<div class="dbestPctField"><div class="dbestPctInput"><input name="${esc(name)}" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="${esc(value)}" placeholder="${esc(placeholder)}"><span>%</span></div></div>`;
}
function rowFields(prefix,scope,value){return LEVELS.map(([k])=>input(`${prefix}_${k}`,valueFor(scope,value,k),scope==='service'?'Inherit':'0')).join('')}
function ensureStyle(){
  if(document.getElementById('dbestPayoutPercentageMatrixStyle'))return;
  const s=document.createElement('style');s.id='dbestPayoutPercentageMatrixStyle';s.textContent=`
  .dbestPctWrap{max-width:1180px;margin:0 auto}.dbestPctIntro{background:linear-gradient(135deg,#eef4ff,#f6f2ff);border:1px solid #dbe5ff;border-radius:18px;padding:14px 16px;margin-bottom:14px;color:#243b68;line-height:1.5}.dbestPctIntro b{color:#173d8f}.dbestPctLegend{display:grid;grid-template-columns:minmax(220px,1.45fr) repeat(4,minmax(110px,.7fr));gap:8px;padding:10px 12px;background:#12284f;color:#fff;border-radius:14px 14px 0 0;position:sticky;top:70px;z-index:4}.dbestPctLegend div{font-size:11px;font-weight:900;text-align:center}.dbestPctLegend div:first-child{text-align:left}.dbestPctSection{border:1px solid #dfe7f3;border-radius:16px;margin:12px 0;overflow:hidden;background:#fff;box-shadow:0 8px 22px rgba(18,40,79,.06)}.dbestPctRow{display:grid;grid-template-columns:minmax(220px,1.45fr) repeat(4,minmax(110px,.7fr));gap:8px;align-items:center;padding:10px 12px;border-top:1px solid #edf1f7}.dbestPctRow:first-child{border-top:0}.dbestPctSectionRow{background:#f4f7ff}.dbestPctName b{display:block;color:#13213a}.dbestPctName small{display:block;color:#6b778a;margin-top:3px}.dbestPctSub .dbestPctName{padding-left:24px;position:relative}.dbestPctSub .dbestPctName:before{content:'↳';position:absolute;left:5px;color:#8492aa}.dbestPctInput{display:flex;align-items:center;border:1px solid #d8e0ec;border-radius:10px;background:#fff;overflow:hidden}.dbestPctInput:focus-within{border-color:#175cff;box-shadow:0 0 0 3px rgba(23,92,255,.09)}.dbestPctInput input{width:100%;min-width:0;border:0;outline:0;padding:9px 7px;text-align:right;background:transparent}.dbestPctInput span{padding:0 8px;color:#175cff;font-weight:900}.dbestPctActions{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;position:sticky;bottom:8px;background:rgba(255,255,255,.96);border:1px solid #dfe7f3;border-radius:14px;padding:10px 12px;margin-top:14px;box-shadow:0 10px 28px rgba(18,40,79,.12);z-index:5}.dbestPctActions small{color:#67758a;max-width:720px}.dbestPctSave{border:0;border-radius:11px;background:#175cff;color:#fff;padding:11px 17px;font-weight:900}.dbestPctBadge{display:inline-block;margin-left:7px;padding:3px 7px;border-radius:999px;background:#e7efff;color:#175cff;font-size:9px;font-weight:900}.dbestPctCount{font-weight:900;color:#175cff}
  @media(max-width:760px){.dbestPctLegend{display:none}.dbestPctRow{grid-template-columns:1fr 1fr;gap:7px}.dbestPctName{grid-column:1/-1}.dbestPctField:before{display:block;font-size:9px;color:#6b778a;font-weight:800;margin:0 0 3px 2px}.dbestPctField:nth-child(2):before{content:'Direct / Self'}.dbestPctField:nth-child(3):before{content:'Level 1'}.dbestPctField:nth-child(4):before{content:'Level 2'}.dbestPctField:nth-child(5):before{content:'Level 3'}.dbestPctSub .dbestPctName{padding-left:20px}.dbestPctActions{position:static}.dbestPctSave{width:100%}}
  `;document.head.appendChild(s);
}
function renderStudio(){
  ensureStyle();const list=serviceList(),configured=rules().filter(r=>r?.matrixRule&&r.enabled!==false&&r.valueType==='percent').length;
  const sections=list.map((s,si)=>{
    const secPrefix=`pct_s${si}_section`;
    const head=`<div class="dbestPctRow dbestPctSectionRow"><div class="dbestPctName"><b>${esc(s.icon)} ${esc(s.name)} <span class="dbestPctBadge">SECTION DEFAULT</span></b><small>Used for this section unless a subsection percentage is entered below.</small></div>${rowFields(secPrefix,'section',s.name)}</div>`;
    const subs=(s.subs||[]).map((sub,sj)=>`<div class="dbestPctRow dbestPctSub"><div class="dbestPctName"><b>${esc(sub)}</b><small>Leave blank to inherit the section percentage.</small></div>${rowFields(`pct_s${si}_sub${sj}`,'service',sub)}</div>`).join('');
    return `<div class="dbestPctSection" data-section-id="${esc(s.id)}">${head}${subs||`<div class="dbestPctRow"><div class="dbestPctName"><small>No configured subsections.</small></div></div>`}</div>`;
  }).join('');
  const top=typeof sectionTopBar==='function'?sectionTopBar('💰 Percentage Payout Rules','All sections • all subsections • Direct/L1/L2/L3','owner()'):'';
  const html=`${top}<div class="sectionContent ownerMasterPage"><div class="dbestPctWrap"><div class="dbestPctIntro"><b>Percentage-only payout control.</b> Enter the percentage of a successful transaction amount payable at each hierarchy level. Every section and subsection is open below. A blank subsection field <b>inherits its section default</b>; entering 0% explicitly disables payout for that level on that subsection. <span class="dbestPctCount">${configured}</span> percentage rules are currently configured.</div><form id="dbestPctMatrixForm" onsubmit="window.DBEST_PAYOUT_PERCENT_MATRIX.save(event)"><div class="dbestPctLegend"><div>Section / Subsection</div><div>Direct / Self %</div><div>Level 1 %</div><div>Level 2 %</div><div>Level 3 %</div></div>${sections}<div class="dbestPctActions"><small>Saving this matrix makes percentage rules authoritative for section/subsection payouts. Previous flat-amount rules are disabled, and unconfigured payouts default to 0%.</small><button class="dbestPctSave">Save Percentage Payout Rules</button></div></form></div></div>`;
  if(typeof sectionScreen==='function')sectionScreen(html);else document.body.innerHTML=html;
}
function readPct(f,name){const raw=String(f.get(name)??'').trim();if(raw==='')return null;const n=Number(raw);if(!Number.isFinite(n)||n<0||n>100)throw new Error('Each payout percentage must be between 0% and 100%.');return Math.round(n*100)/100}
function validateRow(values,label){const total=values.reduce((s,v)=>s+(v==null?0:v),0);if(total>100.00001)throw new Error(`${label}: total hierarchy payout cannot exceed 100%.`)}
function makeRule({id,name,recipient,scope,scopeValue,amount,priority,sectionId,subsection}){return {id,name,recipient,scope,scopeValue,valueType:'percent',amount,flatMode:'per_line',minBusiness:0,priority,enabled:true,startDate:'',endDate:'',matrixRule:true,matrixVersion:VERSION,sectionId:sectionId||'',subsection:subsection||'',updatedAt:new Date().toISOString()}}
async function saveMatrix(e){
  e.preventDefault();const f=new FormData(e.target),list=serviceList(),made=[];
  try{
    list.forEach((s,si)=>{
      const secVals=LEVELS.map(([k])=>readPct(f,`pct_s${si}_section_${k}`));validateRow(secVals,s.name+' section');
      LEVELS.forEach(([recipient,label],li)=>{const val=secVals[li];if(val==null)return;made.push(makeRule({id:`PCT-SEC-${slug(s.id)}-${recipient}`,name:`${s.name} • ${label}`,recipient,scope:'section',scopeValue:s.name,amount:val,priority:20,sectionId:s.id}))});
      (s.subs||[]).forEach((sub,sj)=>{
        const vals=LEVELS.map(([k])=>readPct(f,`pct_s${si}_sub${sj}_${k}`));validateRow(vals,s.name+' / '+sub);
        LEVELS.forEach(([recipient,label],li)=>{const val=vals[li];if(val==null)return;made.push(makeRule({id:`PCT-SUB-${slug(s.id)}-${slug(sub)}-${recipient}`,name:`${s.name} / ${sub} • ${label}`,recipient,scope:'service',scopeValue:sub,amount:val,priority:40,sectionId:s.id,subsection:sub}))});
      });
    });
    const old=rules();const legacy=old.filter(r=>!r?.matrixRule).map(r=>({...r,enabled:false,disabledReason:'Percentage section/subsection payout matrix activated',updatedAt:new Date().toISOString()}));
    payoutRules=[...legacy,...made];
    payout={self:0,l1:0,l2:0,l3:0};
    try{localStorage.setItem('d2_payout_rules',JSON.stringify(payoutRules));localStorage.setItem('d2_payout',JSON.stringify(payout))}catch(x){}
    try{if(typeof save==='function')save()}catch(x){}
    const btn=e.target.querySelector('.dbestPctSave');if(btn){btn.disabled=true;btn.textContent='Saving…'}
    try{if(window.DBEST_OWNER_CONTROL_LIVE?.syncOwnerSettings)await window.DBEST_OWNER_CONTROL_LIVE.syncOwnerSettings()}catch(syncErr){throw new Error('Rules saved on this device but central Owner sync failed. Please retry.')}
    if(typeof toast==='function')toast('Percentage payout rules saved for all sections and hierarchy levels.');
    renderStudio();
  }catch(err){if(typeof toast==='function')toast(err.message||'Could not save payout rules.');else alert(err.message||'Could not save payout rules.')}
}
function install(){ensureStyle();window.ownerPayoutStudio=renderStudio;window.DBEST_PAYOUT_PERCENT_MATRIX={version:VERSION,open:renderStudio,save:saveMatrix,services:serviceList}}
install();setTimeout(install,300);setTimeout(install,1200);
})();