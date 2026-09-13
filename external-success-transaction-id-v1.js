(function(){
  'use strict';
  function install(){
    var api=window.DBEST_EXTERNAL_SUCCESS_CLAIMS;
    if(!api||typeof api.open!=='function'||api.__txIdAutofill)return false;
    var original=api.open;
    api.open=function(txid){
      var result=original.apply(this,arguments);
      setTimeout(function(){
        var form=document.getElementById('dbestExternalSuccessForm');
        if(!form||form.querySelector('[name="dbestTransactionId"]'))return;
        var first=form.querySelector('.f');
        if(!first)return;
        var box=document.createElement('div');
        box.className='f';
        box.innerHTML='<label>DBest Transaction ID *</label><input name="dbestTransactionId" readonly value="'+String(txid||'').replace(/["&<>]/g,'')+'" style="background:#f3f6fb;font-weight:700">';
        form.insertBefore(box,first);
      },0);
      return result;
    };
    api.__txIdAutofill=true;
    return true;
  }
  var tries=0,t=setInterval(function(){tries++;if(install()||tries>40)clearInterval(t)},100);
  setTimeout(install,0);
})();