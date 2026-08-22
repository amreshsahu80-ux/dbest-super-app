(function(){
  function go(){
    const p=new URLSearchParams(location.search);
    const v=p.get('v')||'20260823-0055';
    location.href='./vaahak.html?v='+encodeURIComponent(v);
  }
  function bind(){
    const b=document.getElementById('dbestVaahakFloat');
    if(b){b.onclick=go;b.addEventListener('touchend',function(e){e.preventDefault();go()},{passive:false})}
    document.querySelectorAll('button,a').forEach(el=>{if(/vaahak partner/i.test(el.textContent||'')){el.onclick=go}})
  }
  const p=new URLSearchParams(location.search);
  if(p.get('portal')==='vaahak'){go();return}
  setTimeout(bind,500);setTimeout(bind,1500);setTimeout(bind,3000);
})();