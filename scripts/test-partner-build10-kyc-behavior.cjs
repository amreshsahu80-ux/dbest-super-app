// Isolated behavioral contract for Build 10 KYC persistence; no network or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('partner-kyc-registration-upload-v2.js','utf8');
async function scenario({uploadOk=true,listed=true,complete=true,uploadResponseType='pan',listOk=true,listDocumentsValid=true,uploadHttpOk=true,listHttpOk=true,retry=false,token='test-token',kind='vendor',filesOverride=null}){
 const calls=[];let uploadCount=0;
 const sandbox={
   window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'test-public-key'}},
   document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
   location:{pathname:'/test'},
   setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,
   console,alert:()=>{},
   FileReader:class{readAsDataURL(){this.result='data:application/pdf;base64,VEVTVA==';this.onload();}},
   fetch:async(url,opts)=>{
     const body=JSON.parse(opts.body);calls.push(body.action);
     const data=body.action==='upload'?{ok:Array.isArray(uploadOk)?uploadOk[uploadCount++]:uploadOk,document:{doc_type:uploadResponseType}}:
       {ok:listOk,documents:listDocumentsValid?(listed?[{doc_type:'pan'}]:[]):null,kyc:{complete}};
     const httpOk=body.action==='upload'?uploadHttpOk:listHttpOk;
     return {ok:httpOk,status:httpOk?200:503,json:async()=>httpOk?data:{error:'temporarily_unavailable'}};
   }
 };
 vm.runInNewContext(source,sandbox,{filename:'partner-kyc-registration-upload-v2.js'});
 const file={name:'pan.pdf',type:'application/pdf',size:4};
 let error=null;const errors=[];
 for(let attempt=0;attempt<(retry?2:1);attempt++){
  try{await sandbox.window.DBEST_PARTNER_KYC_REGISTRATION_V2.upload(kind,token,filesOverride===null?[{docType:'pan',file}]:filesOverride);errors.push(null);}
  catch(e){error=String(e.message);errors.push(error);}
 }
 return {calls,error:errors[errors.length-1],errors};
}
(async()=>{
 const missingSession=await scenario({token:''});
 assert.match(missingSession.error,/kyc_partner_session_missing/);
 assert.deepEqual(missingSession.calls,[]);
 const missingDocuments=await scenario({filesOverride:[]});
 assert.match(missingDocuments.error,/kyc_documents_missing/);
 assert.deepEqual(missingDocuments.calls,[]);
 const invalidKind=await scenario({kind:'service_partner'});
 assert.match(invalidKind.error,/kyc_partner_kind_invalid/);
 assert.deepEqual(invalidKind.calls,[]);
 const malformed=await scenario({filesOverride:[{docType:'pan'}]});
 assert.match(malformed.error,/kyc_documents_invalid_or_duplicate/);
 assert.deepEqual(malformed.calls,[]);
 const fakeFile={name:'pan.pdf',type:'application/pdf',size:4};
 const duplicate=await scenario({filesOverride:[{docType:'pan',file:fakeFile},{docType:'pan',file:fakeFile}]});
 assert.match(duplicate.error,/kyc_documents_invalid_or_duplicate/);
 assert.deepEqual(duplicate.calls,[]);
 const good=await scenario({});
 assert.equal(good.error,null);assert.deepEqual(good.calls,['upload','list_own']);
 const rejected=await scenario({uploadOk:false});
 assert.match(rejected.error,/kyc_upload_unconfirmed_pan/);
 assert.deepEqual(rejected.calls,['upload']);
 const wrongType=await scenario({uploadResponseType:'aadhaar'});
 assert.match(wrongType.error,/kyc_upload_unconfirmed_pan/);
 assert.deepEqual(wrongType.calls,['upload']);
 const unconfirmedList=await scenario({listOk:false});
 assert.match(unconfirmedList.error,/kyc_document_list_unconfirmed/);
 assert.deepEqual(unconfirmedList.calls,['upload','list_own']);
 const missingListAck=await scenario({listOk:null});
 assert.match(missingListAck.error,/kyc_document_list_unconfirmed/);
 assert.deepEqual(missingListAck.calls,['upload','list_own']);
 const invalidListShape=await scenario({listDocumentsValid:false});
 assert.match(invalidListShape.error,/kyc_document_list_unconfirmed/);
 assert.deepEqual(invalidListShape.calls,['upload','list_own']);
 const failedUploadHttp=await scenario({uploadHttpOk:false});
 assert.match(failedUploadHttp.error,/temporarily_unavailable/);
 assert.deepEqual(failedUploadHttp.calls,['upload']);
 const failedListHttp=await scenario({listHttpOk:false});
 assert.match(failedListHttp.error,/temporarily_unavailable/);
 assert.deepEqual(failedListHttp.calls,['upload','list_own']);
 const absent=await scenario({listed:false});
 assert.match(absent.error,/kyc_documents_not_persisted_pan/);
 const incomplete=await scenario({complete:false});
 assert.match(incomplete.error,/kyc_required_documents_missing_/);
 const retried=await scenario({uploadOk:[false,true],retry:true});
 assert.match(retried.errors[0],/kyc_upload_unconfirmed_pan/);
 assert.equal(retried.errors[1],null);
 assert.deepEqual(retried.calls,['upload','upload','list_own']);
 console.log('PASS: HTTP failures, upload rejection, mismatched document response, persistence absence, incomplete KYC, confirmed KYC');
})().catch(e=>{console.error(e);process.exitCode=1;});
