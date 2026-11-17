'use strict';
// Offline behavioral contract for the real KYC uploader. No production network or secrets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../partner-kyc-registration-upload-v2.js'),'utf8');
const DOCS=['shop_photo','owner_photo','pan','establishment','bank_proof'];
function harness(mode){
 const requests=[];
 const window={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://test.invalid',supabasePublishableKey:'public-test-only'}};
 const ctx={window,console,document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
  setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,localStorage:{setItem:()=>{}},
  fetch:async(url,opts)=>{
   const b=JSON.parse(opts.body);requests.push({action:b.action,docType:b.docType,headers:opts.headers});
   let data;
   if(b.action==='upload')data={ok:mode!=='upload-unconfirmed',document:{doc_type:b.docType}};
   else if(b.action==='list_own')data={ok:true,documents:DOCS.map(doc_type=>({doc_type})),
    kyc:{complete:mode!=='incomplete',missing:mode==='incomplete'?['bank_proof']:[]}};
   else throw Error('unexpected action '+b.action);
   if(mode==='missing'&&b.action==='list_own')data.documents=data.documents.filter(x=>x.doc_type!=='pan');
   return {ok:mode!=='http-failure',status:mode==='http-failure'?503:200,json:async()=>mode==='http-failure'?{error:'temporary_unavailable'}:data};
  },
  FileReader:class {readAsDataURL(){this.result='data:application/pdf;base64,QQ==';this.onload()}},
  alert:()=>{},FormData:class {},File:class {},location:{pathname:'/vendor.html'}};
 vm.runInNewContext(source,ctx,{filename:'partner-kyc-registration-upload-v2.js'});
 return {upload:window.DBEST_PARTNER_KYC_REGISTRATION_V2.upload,requests};
}
const docs=DOCS.map(docType=>({docType,file:{name:docType+'.pdf',type:'application/pdf',size:10}}));
(async()=>{
 let h=harness('complete');
 assert.equal(await h.upload('vendor','test-session',docs),5);
 assert.equal(h.requests.filter(x=>x.action==='upload').length,5);
 assert.equal(h.requests.at(-1).action,'list_own');
 assert.ok(h.requests.every(x=>x.headers['x-vendor-token']==='test-session'));
 h=harness('http-failure');
 await assert.rejects(h.upload('vendor','test-session',docs),/temporary_unavailable/);
 assert.equal(h.requests.length,1,'HTTP failure must stop subsequent document uploads');
 h=harness('upload-unconfirmed');
 await assert.rejects(h.upload('vendor','test-session',docs),/kyc_upload_unconfirmed_shop_photo/);
 assert.equal(h.requests.length,1,'unconfirmed upload must stop subsequent writes');
 h=harness('missing');
 await assert.rejects(h.upload('vendor','test-session',docs),/kyc_documents_not_persisted_pan/);
 h=harness('incomplete');
 await assert.rejects(h.upload('vendor','test-session',docs),/kyc_required_documents_missing_bank_proof/);
 h=harness('complete');
 await assert.rejects(h.upload('vendor','',docs),/kyc_partner_session_missing/);
 await assert.rejects(h.upload('vendor','test-session',[docs[0],docs[0]]),/kyc_documents_invalid_or_duplicate/);
 await assert.rejects(h.upload('vendor','test-session',[{docType:'pan',file:{name:'x.exe',type:'application/octet-stream',size:10}}]),/kyc_file_type_invalid_pan/);
 assert.equal(h.requests.length,0,'preflight failures must not upload');
 h=harness('complete');
 await assert.rejects(h.upload('vendor','test-session',[...docs.slice(0,4),{docType:'bank_proof',file:{name:'bad.exe',type:'application/octet-stream',size:10}}]),/kyc_file_type_invalid_bank_proof/);
 assert.equal(h.requests.length,0,'invalid final document must prevent all earlier writes');
 h=harness('complete');
 await assert.rejects(h.upload('vendor','test-session',[...docs.slice(0,4),{docType:'bank_proof',file:{name:'huge.pdf',type:'application/pdf',size:8*1024*1024+1}}]),/file_too_large/);
 assert.equal(h.requests.length,0,'oversized final document must prevent all earlier writes');

 console.log('PASS: authenticated upload, persisted list, incomplete KYC rejection, preflight fail-closed (offline)');
})().catch(e=>{console.error(e);process.exitCode=1});
