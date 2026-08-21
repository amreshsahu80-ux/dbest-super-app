(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const url=cfg.supabaseUrl;
  const key=cfg.supabasePublishableKey;
  if(!url||!key){console.warn('DBest backend bridge: Supabase config missing');return;}

  const headers={
    'apikey':key,
    'Authorization':'Bearer '+key,
    'Content-Type':'application/json',
    'Prefer':'return=minimal'
  };

  async function post(path,body){
    const r=await fetch(url+path,{method:'POST',headers,body:JSON.stringify(body)});
    if(!r.ok){
      let m='Backend sync failed';
      try{const d=await r.json();m=d.message||d.msg||d.error_description||d.hint||m}catch(e){}
      throw new Error(m+' ('+r.status+')');
    }
    return true;
  }

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  async function findCreatedMember(email,mobile,tier){
    for(let i=0;i<25;i++){
      try{
        if(typeof users!=='undefined'&&Array.isArray(users)){
          const u=[...users].reverse().find(x=>
            String(x.email||'').toLowerCase()===email&&
            String(x.mobile||'')===mobile&&
            String(x.tier||'')===tier
          );
          if(u)return u;
        }
      }catch(e){}
      await sleep(200);
    }
    return null;
  }

  async function syncMemberRegistration(form,tier){
    const f=new FormData(form);
    const email=String(f.get('email')||'').trim().toLowerCase();
    const mobile=String(f.get('mobile')||'').trim();
    const name=String(f.get('name')||'').trim();
    const city=String(f.get('city')||'').trim();
    const upline=String(f.get('up')||'').trim().toUpperCase();
    if(!email||!mobile||!name)return;

    const member=await findCreatedMember(email,mobile,tier);
    if(!member){console.warn('DBest backend bridge: member created locally but not found for sync');return;}

    const amount=Number(member.paidAmount??(typeof tiers!=='undefined'&&tiers[tier]?tiers[tier].price:0))||0;
    const payload={
      city,
      upline:upline||member.upline||'',
      referral_code:member.ref||'',
      kyc_status:member.kyc||'Pending',
      card_issued:!!member.card,
      source:'dbest-super-app',
      integration_branch:cfg.integrationBranch||''
    };

    await post('/rest/v1/onboarding_records',{
      kind:'member',
      external_id:String(member.id||''),
      name:String(member.name||name),
      email,
      mobile,
      category:tier,
      status:String(member.status||'Pending'),
      payment_status:String(member.paymentStatus||'Pending Verification'),
      payment_amount:amount,
      payment_ref:String(member.paymentRef||''),
      payload
    });
    console.info('DBest backend bridge: member synced to Supabase',member.id);
  }

  document.addEventListener('submit',function(ev){
    try{
      const form=ev.target;
      if(!(form instanceof HTMLFormElement))return;
      const attr=form.getAttribute('onsubmit')||'';
      const m=attr.match(/regGo\(event,'([^']+)'\)/);
      if(!m)return;
      const tier=m[1];
      setTimeout(()=>syncMemberRegistration(form,tier).catch(err=>console.warn('DBest registration sync:',err.message)),0);
    }catch(err){console.warn('DBest backend bridge:',err);}
  },true);

  window.DBEST_BACKEND_BRIDGE={
    version:'1.0.0',
    syncMemberRegistration
  };
})();
