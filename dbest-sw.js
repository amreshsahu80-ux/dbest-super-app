self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let d={};try{d=event.data?event.data.json():{}}catch(_){try{d={body:event.data.text()}}catch(__){}}
  const title=d.title||'DBest';
  const run=async()=>{
    let richImage=d.imageUrl||undefined;
    if(richImage){try{const r=await fetch(richImage,{cache:'no-store',mode:'cors'});if(!r.ok)richImage=undefined;else await r.blob()}catch(_){richImage=undefined}}
    const options={
    body:d.body||'You have a new DBest notification.',
    icon:'/dbest-logo.png',
    badge:'/dbest-logo.png',
    image:richImage,
    tag:d.notificationId||('dbest-'+Date.now()),
    renotify:true,
    requireInteraction:['order','ride','job','payment','intervention'].includes(String(d.category||'')),
    actions:d.cta?[{action:'open',title:d.cta}]:undefined,
    data:{targetUrl:d.targetUrl||'/',notificationId:d.notificationId||'',category:d.category||'',imageUrl:d.imageUrl||'',cta:d.cta||'',validTill:d.validTill||'',extra:d.data||{}}
    };
    return self.registration.showNotification(title,options);
  };
  event.waitUntil(run());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.targetUrl||'/',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.startsWith(self.location.origin)){c.focus();if('navigate'in c)c.navigate(target);return}}
    return clients.openWindow(target);
  }));
});