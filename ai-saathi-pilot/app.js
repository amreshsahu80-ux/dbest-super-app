(function () {
  "use strict";
  var role = "customer";
  var waiting = false, history = [], modelEligible = false;
  var roleLabels = {customer:"for Customers",partner:"for Partners",owner:"for Owners"};
  var samples = {
    customer:["Find hotels in Puri","How can I book a cab?","Explain DBest membership"],
    partner:["Show assigned jobs","How do vendor orders work?","Explain my payout status"],
    owner:["Give an operations overview","Check outreach health","What is needed before launch?"]
  };
  var welcomes = {
    customer:"Namaste! I'm AI Saathi, your DBest customer assistant demo. I can explain how hotel search, cabs, membership and support would work. This preview cannot access live prices or make bookings.",
    partner:"Welcome to the partner workspace demo. I can illustrate job updates, marketplace order flow and partner guidance. No real partner account, earnings or assignments are accessible here.",
    owner:"Welcome to the owner workspace demo. I can explain operational dashboards, launch controls and outreach monitoring. This preview has no access to actual DBest reports, credentials, customers or production controls."
  };
  var conversation=document.getElementById("conversation");
  var suggestions=document.getElementById("suggestions");
  var form=document.getElementById("chatForm");
  var input=document.getElementById("message");
  var send=document.getElementById("send");
  var reset=document.getElementById("reset");
  var consentLabel=document.createElement("label");
  consentLabel.className="qa-consent"; consentLabel.hidden=true;
  var consent=document.createElement("input");
  consent.type="checkbox";consent.id="qaModelConsent";
  consentLabel.append(consent,document.createTextNode(" I agree to send this test chat to an AI provider. Please do not include private or payment information."));
  form.insertAdjacentElement("afterend",consentLabel);
  fetch("/api/health",{cache:"no-store"}).then(function(r){return r.ok?r.json():null;})
    .then(function(d){modelEligible=Boolean(d&&d.modelCallsAllowed);consentLabel.hidden=!modelEligible;})
    .catch(function(){modelEligible=false;});
  function appendMessage(text,from){
    var row=document.createElement("div");row.className="message "+(from==="user"?"user":"bot");
    if(from!=="user"){var avatar=document.createElement("span");avatar.className="mini-avatar";avatar.textContent="✦";row.appendChild(avatar);}
    var bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;row.appendChild(bubble);
    conversation.appendChild(row);conversation.scrollTop=conversation.scrollHeight;
  }
  function rebuild(){
    history=[];
    conversation.replaceChildren();
    document.getElementById("roleLabel").textContent=roleLabels[role];
    document.querySelectorAll("[data-role]").forEach(function(button){
      var active=button.dataset.role===role;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
    });
    suggestions.replaceChildren();
    samples[role].forEach(function(prompt){
      var btn=document.createElement("button");btn.type="button";btn.className="quick";btn.textContent=prompt;
      btn.addEventListener("click",function(){input.value=prompt;sendMessage();});suggestions.appendChild(btn);
    });
    appendMessage(welcomes[role],"bot");
  }
  async function sendMessage(){
    if(waiting)return;
    var message=input.value.trim();
    if(!message)return;
    if(message.length>500){appendMessage("Message too long; please shorten it to 500 characters.","bot");return;}
    if(modelEligible && !consent.checked){appendMessage("Please check the AI test consent box before sending text to the model.","bot");return;}
    input.value="";appendMessage(message,"user");waiting=true;send.disabled=true;
    var requestedRole=role;
    try{
      var response=await fetch("/api/assist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:requestedRole,message:message,history:history.slice(-6),aiConsent:consent.checked}),cache:"no-store",credentials:"same-origin"});
      var data=await response.json();
      if(requestedRole!==role)return;
      var valid=response.ok&&["simulation","model-preview"].includes(data.mode)&&typeof data.reply==="string";
      var reply=valid?data.reply:"The isolated test assistant is unavailable. No DBest services were affected.";
      appendMessage(reply,"bot");
      if(valid){history.push({role:"user",content:message},{role:"assistant",content:reply.slice(0,500)});history=history.slice(-6);}
    }catch(error){if(requestedRole===role)appendMessage("The isolated demo could not respond. No DBest systems were affected.","bot");}
    finally{waiting=false;send.disabled=false;input.focus();}
  }
  document.querySelectorAll("[data-role]").forEach(function(button){button.addEventListener("click",function(){if(waiting)return;role=button.dataset.role;input.value="";consent.checked=false;rebuild();});});
  form.addEventListener("submit",function(event){event.preventDefault();sendMessage();});
  reset.addEventListener("click",function(){if(!waiting){input.value="";history=[];rebuild();}});
  rebuild();
})();