(function(){
'use strict';
if(document.getElementById('dbestWalletVisibilityStyle'))return;
const s=document.createElement('style');
s.id='dbestWalletVisibilityStyle';
s.textContent='#dbestWalletSummaryBtn{display:none!important}.classicDash #dbestWalletSummaryBtn{display:inline-block!important}';
(document.head||document.documentElement).appendChild(s);
})();
