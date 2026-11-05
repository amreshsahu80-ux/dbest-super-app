(function () {
  "use strict";
  var role = "customer";
  var waiting = false;
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
  function appendMessage(text,from){
    var row=document.createElement("div");row.className="message "+(from==="user"?"user":"bot");
    if(from!=="user"){var avatar=document.createElement("span");avatar.className="mini-avatar";avatar.textContent="✦";row.appendChild(avatar);}
    var bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;row.appendChild(bubble);
    conversation.appendChild(row);conversation.scrollTop=conversation.scrollHeight;
  }
  function rebuild(){
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
    input.value="";appendMessage(message,"user");waiting=true;send.disabled=true;
    var requestedRole=role;
    try{
      var response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:requestedRole,message:message}),cache:"no-store",credentials:"same-origin"});
      var data=await response.json();
      if(requestedRole!==role)return;
      appendMessage(response.ok&&data.mode==="simulation"&&typeof data.reply==="string"?data.reply:"Demo service is unavailable. Please try again.","bot");
    }catch(error){if(requestedRole===role)appendMessage("The isolated demo could not respond. No DBest systems were affected.","bot");}
    finally{waiting=false;send.disabled=false;input.focus();}
  }
  document.querySelectorAll("[data-role]").forEach(function(button){button.addEventListener("click",function(){if(waiting)return;role=button.dataset.role;input.value="";rebuild();});});
  form.addEventListener("submit",function(event){event.preventDefault();sendMessage();});
  reset.addEventListener("click",function(){if(!waiting){input.value="";rebuild();}});
  rebuild();
})();