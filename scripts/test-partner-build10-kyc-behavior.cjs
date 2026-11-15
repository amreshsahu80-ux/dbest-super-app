// Isolated behavioral contract for Build 10 KYC persistence; no network or production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('partner-kyc-registration-upload-v2.js','utf8');
async function scenario({uploadOk=true,listed=true,complete=true,uploadResponseType='pan'}){
 const calls=[];
 const sandbox={
   window:{DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'test-public-key'}},
   document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}},
   location:{pathname:'/test'},
   setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,
   console,alert:()=>{},
   FileReader:class{readAsDataURL(){this.result='data:application/pdf;base64,VEVTVA==';this.onload();}},
   fetch:async(url,opts)=>{
     const body=JSON.parse(opts.body);calls.push(body.action);
     const data=body.action==='upload'?{ok:uploadOk,document:{doc_type:uploadResponseType}}:
       {documents:listed?[{doc_type:'pan'}]:[],kyc:{complete}};
     return {ok:true,status:200,json:async()=>data};
   }
 };
 vm.runInNewContext(source,sandbox,{filename:'partner-kyc-registration-upload-v2.js'});
 const file={name:'pan.pdf',type:'application/pdf',size:4};
 let error=null;
 try{await sandbox.window.DBEST_PARTNER_KYC_REGISTRATION_V2.upload('vendor','test-token',[{docType:'pan',file}]);}
 catch(e){error=String(e.message);}
 return {calls,error};
}
(async()=>{
 const good=await scenario({});
 assert.equal(good.error,null);assert.deepEqual(good.calls,['upload','list_own']);
 const rejected=await scenario({uploadOk:false});
 assert.match(rejected.error,/kyc_upload_unconfirmed_pan/);
 assert.deepEqual(rejected.calls,['upload']);
 const wrongType=await scenario({uploadResponseType:'aadhaar'});
 assert.match(wrongType.error,/kyc_upload_unconfirmed_pan/);
 assert.deepEqual(wrongType.calls,['upload']);
 const absent=await scenario({listed:false});
 assert.match(absent.error,/kyc_documents_not_persisted_pan/);
 const incomplete=await scenario({complete:false});
 assert.match(incomplete.error,/kyc_required_documents_missing_/);
 console.log('PASS: upload rejection, mismatched document response, persistence absence, incomplete KYC, confirmed KYC');
})().catch(e=>{console.error(e);process.exitCode=1;});
