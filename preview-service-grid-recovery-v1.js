(function(){
'use strict';
var IDS=[['car','Car Bookings','🚕','Local and outstation cabs'],['store','Marketplace','🛒','Shopping and everyday essentials'],['insurance','All Insurance','🛡️','Insurance services'],['travel','Hotels & Packages','🏨','Travel and stays'],['flights','Flights','✈️','Flight bookings'],['govt','Government Services','📄','Government applications'],['loans','Banking & Loans','🏦','Financial services'],['jobs','Home Jobs','💼','Job services']];
function visible(id){try{return typeof serviceVisible==='function'?serviceVisible(id):JSON.parse(localStorage.getItem('d2_service_control')||'{}')[id]?.visible!==false}catch(e){return true}}
function diagnose(){
 var grid=document.getElementById('grid');if(!grid||grid.querySelector('.tile'))return;
 try{if(typeof render==='function')render()}catch(e){console.error('DBest home render failure:',e)}
 if(grid.querySelector('.tile'))return;
 var data;try{data=typeof services!=='undefined'&&Array.isArray(services)?services:[]}catch(e){data=[]}
 if(!data.length)data=IDS.map(function(x){return [x[0],x[1],x[2],'',x[3],[]]});
 var items=data.filter(function(x){return visible(x[0])&&x[0]!=='join'});
 if(!items.length)return;
 var fragment=document.createDocumentFragment();
 items.forEach(function(s){
  var button=document.createElement('button');button.className='tile service-'+String(s[0]).replace(/[^a-z0-9_-]/gi,'');
  button.style.cssText='min-height:150px;padding:18px;border-radius:18px;background:linear-gradient(140deg,#133e91,#5368dc);color:#fff;text-align:left;display:flex;flex-direction:column;justify-content:space-between;gap:12px';
  var title=document.createElement('strong');title.textContent=(s[2]||'🧩')+' '+(s[1]||'Service');button.appendChild(title);
  var detail=document.createElement('small');detail.textContent=s[4]||'Open section';button.appendChild(detail);
  button.addEventListener('click',function(){if(typeof openService==='function')openService(s[0]);else alert('This section is temporarily unavailable in the preview. Please report this to DBest.')});
  fragment.appendChild(button)
 });
 grid.replaceChildren(fragment);console.warn('DBest service grid recovered using safe fallback',items.length)
}
function start(){setTimeout(diagnose,200);setTimeout(diagnose,1200);setTimeout(diagnose,3200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('pageshow',function(){setTimeout(diagnose,300)})
})();