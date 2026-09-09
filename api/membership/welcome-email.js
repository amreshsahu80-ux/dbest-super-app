module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  try{
    const body=req.body&&typeof req.body==='object'?req.body:{};
    const name=String(body.name||'DBest Member').slice(0,120);
    const email=String(body.email||'').trim().toLowerCase().slice(0,180);
    const memberId=String(body.memberId||'').slice(0,80);
    const tier=String(body.tier||'DBest Membership').slice(0,120);
    const referralCode=String(body.referralCode||'').slice(0,80);
    const profileUrl=String(body.profileUrl||'https://dbest4u.com').slice(0,500);
    if(!email||!email.includes('@'))return res.status(400).json({error:'Valid email is required'});
    const apiKey=process.env.RESEND_API_KEY||'';
    const from=process.env.DBEST_WELCOME_FROM||'';
    if(!apiKey||!from)return res.status(200).json({sent:false,configured:false});
    const subject='Welcome to DBest — Your Membership is Active';
    const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const html=`<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#17233c"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:linear-gradient(135deg,#155cff,#705bff);color:#fff;border-radius:22px 22px 0 0;padding:28px"><div style="font-size:13px;font-weight:700;opacity:.85">DBest</div><h1 style="margin:8px 0 6px;font-size:28px">Welcome, ${safe(name)}!</h1><p style="margin:0;opacity:.9">Your membership is active.</p></div><div style="background:#fff;border:1px solid #e3e8f2;border-top:0;border-radius:0 0 22px 22px;padding:24px"><p>Thank you for joining DBest.</p><div style="background:#f6f8fc;border-radius:14px;padding:14px;line-height:1.7"><b>Membership:</b> ${safe(tier)}<br><b>Member ID:</b> ${safe(memberId)}${referralCode?`<br><b>Referral Code:</b> ${safe(referralCode)}`:''}</div><h3 style="margin-top:24px">Complete your payout profile</h3><p>Your DBest access is already active. To receive eligible payouts, please complete Aadhaar/PAN and bank account proof from <b>My Profile → Payout & KYC</b>.</p><p style="margin:22px 0"><a href="${safe(profileUrl)}" style="display:inline-block;background:#155cff;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700">Open DBest & Complete Profile</a></p><p style="font-size:12px;color:#6b7485">Payouts remain on hold until the payout profile is submitted and verified. Your membership remains active.</p></div></div></body></html>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject,html})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){console.error('DBest welcome email error',r.status,data);return res.status(502).json({sent:false,error:'Email provider rejected request'});}
    return res.status(200).json({sent:true,id:data.id||''});
  }catch(err){console.error('DBest welcome email failure',err);return res.status(500).json({sent:false,error:'Unable to send welcome email'});}
};