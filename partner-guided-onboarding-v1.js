(function(){
'use strict';
const form=document.getElementById('regForm');
if(!form||document.getElementById('dbestGuidedSteps'))return;
const kind=/vaahak/i.test(document.title)?'vaahak':'vendor';
const grid=form.querySelector('.grid');if(!grid)return;
const groups=kind==='vaahak'
 ?[['name','mobile','email','pin'],['vehicle','vehicleNo','ride','delivery'],['whatsappConsent']]
 :[['name','ownerName','type','mobile','email','pin'],['address','city','pincode'],['whatsappConsent']];
const labels=kind==='vaahak'?['Your account','Vehicle & jobs','Documents & consent']:['Your account','Store location','Documents & consent'];
const children=[...grid.children],steps=groups.map(()=>[]);
for(const node of children){if(node.querySelector('button[type="submit"],button:not([type])')){steps[2].push(node);continue}
 const names=[...node.querySelectorAll('[name]')].map(x=>x.name);let ix=groups.findIndex(g=>names.some(n=>g.includes(n)));
 if(ix<0)ix=node.querySelector('input[type="file"]')?2:1;steps[ix].push(node);
}
const nav=document.createElement('div');nav.id='dbestGuidedSteps';nav.innerHTML='<div class="dbest-step-count" role="status" aria-live="polite"></div><div class="dbest-step-track"><span></span></div><h3 class="dbest-step-title"></h3><p class="dbest-step-help">Complete this section to continue. Your details stay on this device until you submit.</p>';
grid.before(nav);
const controls=document.createElement('div');controls.className='dbest-wizard-actions';
controls.innerHTML='<button type="button" class="btn soft" data-wizard-back>Previous</button><button type="button" class="btn" data-wizard-next>Continue</button>';
grid.after(controls);
let current=0;
function classifyLate(){for(const node of [...grid.children]){if(node.dataset.dbestWizardStep!==undefined)continue;const hasFile=!!node.querySelector('input[type="file"]');if(hasFile||/kyc/i.test(node.textContent||'')){node.dataset.dbestWizardStep='2';steps[2].push(node)}}}
function render(){classifyLate();[...grid.children].forEach(n=>{const idx=Number(n.dataset.dbestWizardStep);if(Number.isInteger(idx)&&idx>=0&&idx<=2)n.hidden=idx!==current});
nav.querySelector('.dbest-step-count').textContent='Step '+(current+1)+' of 3';
nav.querySelector('.dbest-step-track span').style.width=((current+1)/3*100)+'%';
nav.querySelector('.dbest-step-title').textContent=labels[current];
controls.querySelector('[data-wizard-back]').hidden=current===0;
controls.querySelector('[data-wizard-next]').hidden=current===2;
}
steps.forEach((items,i)=>items.forEach(n=>n.dataset.dbestWizardStep=String(i)));
function validStep(i){for(const node of steps[i])for(const el of node.querySelectorAll('input,select,textarea')){if(el.disabled||!el.willValidate)continue;if(!el.checkValidity()){el.reportValidity();el.focus();return false}}return true}
controls.querySelector('[data-wizard-next]').onclick=()=>{if(!validStep(current))return;current=Math.min(2,current+1);render();nav.scrollIntoView({block:'start',behavior:'smooth'})};
controls.querySelector('[data-wizard-back]').onclick=()=>{current=Math.max(0,current-1);render()};
form.addEventListener('submit',e=>{for(let i=0;i<3;i++){if(!validStep(i)){current=i;render();e.preventDefault();e.stopImmediatePropagation();setTimeout(()=>{for(const node of steps[i]){const el=node.querySelector(':invalid');if(el){el.reportValidity();break}}},0);return}}},true);
const obs=new MutationObserver(()=>{let changed=false;for(const node of [...grid.children])if(node.dataset.dbestWizardStep===undefined&&node.querySelector('input[type="file"]')){node.dataset.dbestWizardStep='2';steps[2].push(node);changed=true}if(changed)render()});obs.observe(grid,{childList:true,subtree:false});
const style=document.createElement('style');style.textContent='#dbestGuidedSteps{margin:12px 0 18px;padding:16px;background:#f0f5ff;border:1px solid #d7e5ff;border-radius:16px}#dbestGuidedSteps .dbest-step-count{font-size:13px;color:#2457a7;font-weight:800}#dbestGuidedSteps .dbest-step-track{height:7px;background:#d7e3f7;border-radius:99px;margin:10px 0 14px;overflow:hidden}#dbestGuidedSteps .dbest-step-track span{display:block;height:100%;background:#2166ed;border-radius:99px;transition:width .2s}#dbestGuidedSteps .dbest-step-title{margin:0 0 5px;font-size:21px}#dbestGuidedSteps .dbest-step-help{margin:0;font-size:13px;color:#5b6c84}.dbest-wizard-actions{display:flex;gap:10px;margin:16px 0}.dbest-wizard-actions .btn{min-height:48px;flex:1}#regForm [data-dbest-wizard-step][hidden]{display:none!important}@media(max-width:520px){#regForm .grid{grid-template-columns:1fr!important}#regForm .field,#regForm .full{grid-column:1/-1!important}}';document.head.append(style);
render();
})();