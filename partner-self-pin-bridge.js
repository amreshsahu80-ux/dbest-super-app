(function(){
  function say(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
  function vendorObj(){try{return typeof marketVendor==='function'&&window.vendorSession?.vendorId?marketVendor(window.vendorSession.vendorId):null}catch(e){return null}}
  window.vendorChangeOwnPin=function(){
    const v=vendorObj();if(!v)return say('Vendor session not found. Please login again.');
    const current=String(prompt('Enter your current Vendor PIN')||'').trim();if(!current)return;
    if(String(v.pin||'')!==current)return say('Current PIN is incorrect.');
    const next=String(prompt('Enter a new 4–8 digit Vendor PIN')||'').trim();if(!next)return;
    if(!/^\d{4,8}$/.test(next))return say('PIN must contain 4 to 8 digits.');
    const confirmPin=String(prompt('Re-enter the new PIN')||'').trim();if(confirmPin!==next)return say('New PIN confirmation does not match.');
    v.pin=next;try{typeof save==='function'&&save()}catch(e){}
    say('Vendor PIN changed successfully. Please login again with the new PIN.');
    try{if(typeof vendorLogout==='function')vendorLogout();else if(window.vendorSession)window.vendorSession={vendorId:''}}catch(e){}
  };
  function addVendorButton(){
    const v=vendorObj();if(!v)return;
    const host=document.querySelector('.vendorDashboardHead')||document.querySelector('.sectionContent');if(!host||document.getElementById('dbestVendorOwnPin'))return;
    const b=document.createElement('button');b.id='dbestVendorOwnPin';b.type='button';b.className='sectionHome';b.textContent='🔐 Change PIN';b.onclick=window.vendorChangeOwnPin;
    const logout=[...host.querySelectorAll('button')].find(x=>/Logout/i.test(x.textContent||''));
    if(logout&&logout.parentElement)logout.parentElement.insertBefore(b,logout);else host.appendChild(b);
  }
  const old=window.vendorDashboard;
  if(typeof old==='function')window.vendorDashboard=function(){old();setTimeout(addVendorButton,80)};
  const obs=new MutationObserver(()=>{if(window.vendorSession?.vendorId&&/Vendor Dashboard/i.test(document.body.innerText||''))addVendorButton()});
  try{obs.observe(document.documentElement,{subtree:true,childList:true})}catch(e){}
  window.DBEST_PARTNER_SELF_PIN={version:'1.0.0'};
})();