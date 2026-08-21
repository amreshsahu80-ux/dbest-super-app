(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  const H={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  const norm=v=>String(v||'').trim();
  const digits=v=>norm(v).replace(/\D/g,'').slice(-10);
  const email=v=>norm(v).toLowerCase();
  async function lookup(v){
    const raw=norm(v), up=raw.toUpperCase(), em=email(raw), mob=digits(raw);
    const ors=[];
    if(up) ors.push('external_id.eq.'+encodeURIComponent(up));
    if(em.includes('@')) ors.push('email.eq.'+encodeURIComponent(em));
    if(mob.length===10) ors.push('mobile.eq.'+encodeURIComponent(mob));
    if(!ors.length)return null;
    const q='/rest/v1/onboarding_records?kind=eq.member&or=('+ors.join(',')+')&status=eq.Active&payment_status=eq.Approved&deleted_at=is.null&order=updated_at.desc&limit=1';
    const r=await fetch(base+q,{headers:H});
    if(!r.ok)throw new Error('Member lookup failed');
    const rows=await r.json(); return rows&&rows[0]||null;
  }
  function hydrate(row){
    const p=row.payload||{};
    const tier=String(row.category||'guest').toLowerCase();
    const u={
      id:String(row.external_id||''), name:String(row.name||''), email:String(row.email||''), mobile:String(row.mobile||''),
      tier, status:'Active', paymentStatus:'Approved', paidAmount:Number(row.payment_amount||0), paymentRef:String(row.payment_ref||''),
      ref:String(p.referral_code||''), upline:String(p.upline||''), city:String(p.city||''), pan:String(p.pan||''), aadhaar:String(p.aadhaar||''),
      kyc:String(p.kyc_status||'Approved'), card:!!p.card_issued, emailVerified:!!row.email_verified
    };
    try{
      if(Array.isArray(users)){
        const i=users.findIndex(x=>String(x.id||'')===u.id);
        if(i>=0)users[i]={...users[i],...u}; else users.push(u);
      }
    }catch(e){}
    return u;
  }
  window.memberGo=async function(e){
    e.preventDefault();
    const form=e.target, btn=form.querySelector('button');
    if(btn){btn.disabled=true;btn.textContent='Checking…';}
    try{
      const v=new FormData(form).get('id');
      const row=await lookup(v);
      if(!row){ if(typeof toast==='function')toast('Active approved member not found.'); return; }
      const u=hydrate(row);
      session={role:u.tier,id:u.id};
      u.lastLoginAt=new Date().toLocaleString('en-IN');
      if(typeof save==='function')save();
      if(typeof render==='function')render();
      if(typeof memberDash==='function')memberDash(u.id);
      if(typeof toast==='function')toast('Login successful');
    }catch(err){console.error('DBest live member login',err); if(typeof toast==='function')toast('Login could not complete. Please retry.');}
    finally{if(btn){btn.disabled=false;btn.textContent='Login';}}
  };
})();
