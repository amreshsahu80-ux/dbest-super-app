(function(){
'use strict';
const VERSION='3.1.0';
document.documentElement.classList.add('dbestVaahakBooting');
if(!document.getElementById('dbestVaahakBootStyle')){const s=document.createElement('style');s.id='dbestVaahakBootStyle';s.textContent='.dbestVaahakBooting #jobs .job{display:none!important}.dbestVaahakBooting #jobs:has(.job)::after{content:"Loading current request…";display:block;padding:10px;color:#69778d}';document.head.appendChild(s)}
function loadFinal(){if(document.querySelector('script[data-dbest-vaahak-final-v3]'))return;const s=document.createElement('script');s.src='/vaahak-dashboard-final-v3.js?v=20260828-1415-vaahak-photo-visual';s.setAttribute('data-dbest-vaahak-final-v3','1');s.onerror=()=>document.documentElement.classList.remove('dbestVaahakBooting');document.body.appendChild(s)}
let n=0;const wait=setInterval(()=>{n++;if(window.DBEST_VAAHAK_MARKETPLACE_SYNC||n>=8){clearInterval(wait);loadFinal()}},100);
window.DBEST_VAAHAK_NEAREST_DISPATCH={version:VERSION,offerSeconds:90,mode:'single-controller-bootstrap'};
})();