// Isolated behavioral contract for Build 10 KYC persistence; no network or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('partner-kyc-registration-upload-v2.js','utf8');
async function scenario({uploadOk=true,listed=true,complete=true,uploadResponseType=null,listTypes=null,listOk=true,listDocumentsValid=true,listMalformed=false,uploadHttpOk=true,listHttpOk=true,retry=false,readFailureOn=null,readAbortOn=null,token='test-token',kind='vendor',filesOverride=null}){
 const calls=[];const headersSeen=[];let uploadCount=0;const uploadedTypes=[];
 const sandbox={
   window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'test-public-key'}},
   document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
   location:{pathname:'/test'},
   setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,
   console,alert:()=>{},
   FileReader:class{readAsDataURL(file){if(file.name===readFailureOn){this.onerror();return;}if(file.name===readAbortOn){this.onabort();return;}this.result='data:application/pdf;base64,VEVTVA==';this.onload();}},
   fetch:async(url,opts)=>{
     const body=JSON.parse(opts.body);calls.push(body.action);headersSeen.push(opts.headers);if(body.action==='upload')uploadedTypes.push(body.docType);
     const data=body.action==='upload'?{ok:Array.isArray(uploadOk)?uploadOk[uploadCount++]:uploadOk,document:{doc_type:uploadResponseType||body.docType}}:
       {ok:listOk,documents:listDocumentsValid?(listed?(listMalformed?[null]:((listTypes||uploadedTypes).map(doc_type=>({doc_type})))):[]):null,kyc:{complete}};
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
 return {calls,headersSeen,error:errors[errors.length-1],errors};
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
 const crossRole=await scenario({filesOverride:[{docType:'driving_licence',file:fakeFile}]});
 assert.match(crossRole.error,/kyc_documents_invalid_or_duplicate/);
 assert.deepEqual(crossRole.calls,[]);
 const crossRoleVaahak=await scenario({kind:'vaahak',filesOverride:[{docType:'pan',file:fakeFile}]});
 assert.match(crossRoleVaahak.error,/kyc_documents_invalid_or_duplicate/);
 assert.deepEqual(crossRoleVaahak.calls,[]);
 const zeroByteLater=await scenario({filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'empty.pdf',type:'application/pdf',size:0}}]});
 assert.match(zeroByteLater.error,/kyc_file_empty/);
 assert.deepEqual(zeroByteLater.calls,[],'Zero-byte later document must fail preflight before any backend upload');
 const oversizedLater=await scenario({filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'large.pdf',type:'application/pdf',size:9*1024*1024}}]});
 assert.match(oversizedLater.error,/file_too_large/);
 assert.deepEqual(oversizedLater.calls,[],'Preflight must reject later invalid files before any upload');
 const unsupportedLater=await scenario({filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'malware.exe',type:'application/x-msdownload',size:4}}]});
 assert.match(unsupportedLater.error,/kyc_file_type_invalid_bank_proof/);
 assert.deepEqual(unsupportedLater.calls,[],'Unsupported later document must fail preflight before uploading earlier files');
 const unnamedLater=await scenario({filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'',type:'application/pdf',size:4}}]});
 assert.match(unnamedLater.error,/kyc_file_type_invalid_bank_proof/);
 assert.deepEqual(unnamedLater.calls,[],'Unnamed later document must not cause a partial upload');
 const unreadableLater=await scenario({readFailureOn:'unreadable.pdf',filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'unreadable.pdf',type:'application/pdf',size:4}}]});
 assert.match(unreadableLater.error,/file_read_failed/);
 assert.deepEqual(unreadableLater.calls,[],'Preflight must reject an unreadable later file without uploading earlier files');
 const abortedLater=await scenario({readAbortOn:'cancelled.pdf',filesOverride:[{docType:'pan',file:fakeFile},{docType:'bank_proof',file:{name:'cancelled.pdf',type:'application/pdf',size:4}}]});
 assert.match(abortedLater.error,/file_read_aborted/);
 assert.deepEqual(abortedLater.calls,[],'Aborted second file read must fail before any backend upload');
 const secondUploadRejected=await scenario({kind:'vaahak',uploadOk:[true,false],filesOverride:[{docType:'id_proof',file:{name:'id.pdf',type:'application/pdf',size:4}},{docType:'driving_licence',file:{name:'licence.pdf',type:'application/pdf',size:4}}]});
 assert.match(secondUploadRejected.error,/kyc_upload_unconfirmed_driving_licence/);
 assert.deepEqual(secondUploadRejected.calls,['upload','upload'],'A failed second upload must not be reported as persisted or invoke list_own');
 const vaahakRetry=await scenario({kind:'vaahak',retry:true,uploadOk:[true,false,true,true],filesOverride:[{docType:'id_proof',file:{name:'id.pdf',type:'application/pdf',size:4}},{docType:'driving_licence',file:{name:'licence.pdf',type:'application/pdf',size:4}}]});
 assert.match(vaahakRetry.errors[0],/kyc_upload_unconfirmed_driving_licence/);
 assert.equal(vaahakRetry.errors[1],null,'Retry must succeed only after both Vaahak uploads and persistence check');
 assert.deepEqual(vaahakRetry.calls,['upload','upload','upload','upload','list_own'],'First failed attempt must not call persistence confirmation; retry must verify both documents');
 const vaahakGood=await scenario({kind:'vaahak',filesOverride:[{docType:'id_proof',file:{name:'id.pdf',type:'application/pdf',size:4}},{docType:'driving_licence',file:{name:'licence.pdf',type:'application/pdf',size:4}}]});
 assert.equal(vaahakGood.error,null,'Vaahak multiple document upload must confirm persisted types');
 assert.deepEqual(vaahakGood.calls,['upload','upload','list_own']);
 assert.ok(vaahakGood.headersSeen.every(h=>h['x-vaahak-token']==='test-token'&&!('x-vendor-token' in h)),'Vaahak KYC must use only Vaahak session credentials');
 const vaahakMissingPersistence=await scenario({kind:'vaahak',listTypes:['id_proof'],filesOverride:[{docType:'id_proof',file:{name:'id.pdf',type:'application/pdf',size:4}},{docType:'driving_licence',file:{name:'licence.pdf',type:'application/pdf',size:4}}]});
 assert.match(vaahakMissingPersistence.error,/kyc_documents_not_persisted_driving_licence/);
 assert.deepEqual(vaahakMissingPersistence.calls,['upload','upload','list_own']);
 const good=await scenario({});
 assert.equal(good.error,null);assert.deepEqual(good.calls,['upload','list_own']);
 assert.ok(good.headersSeen.every(h=>h['x-vendor-token']==='test-token'&&!('x-vaahak-token' in h)),'Vendor KYC must use only Vendor session credentials');
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
 const malformedListRecord=await scenario({listMalformed:true});
 assert.match(malformedListRecord.error,/kyc_document_list_malformed/);
 assert.deepEqual(malformedListRecord.calls,['upload','list_own'],'Malformed persistence records must fail closed');
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
 const repeatedFailedPersistence=await scenario({retry:true,listed:false});
 assert.deepEqual(repeatedFailedPersistence.errors,['kyc_documents_not_persisted_pan','kyc_documents_not_persisted_pan'],'Retries must never claim success when the backend still cannot confirm persisted documents');
 assert.deepEqual(repeatedFailedPersistence.calls,['upload','list_own','upload','list_own']);
 const repeatedIncomplete=await scenario({retry:true,complete:false});
 assert.deepEqual(repeatedIncomplete.errors,['kyc_required_documents_missing_','kyc_required_documents_missing_'],'Repeated incomplete KYC must remain blocked');
 assert.deepEqual(repeatedIncomplete.calls,['upload','list_own','upload','list_own']);
 const retried=await scenario({uploadOk:[false,true],retry:true});
 assert.match(retried.errors[0],/kyc_upload_unconfirmed_pan/);
 assert.equal(retried.errors[1],null);
 assert.deepEqual(retried.calls,['upload','upload','list_own']);
 console.log('PASS: HTTP failures, upload rejection, mismatched document response, persistence absence, incomplete KYC, confirmed KYC');
})().catch(e=>{console.error(e);process.exitCode=1;});
