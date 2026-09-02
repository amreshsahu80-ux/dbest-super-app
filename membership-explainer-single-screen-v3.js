(function(){
'use strict';
if(window.DBEST_MEMBERSHIP_SINGLE_SCREEN_V3)return;
window.DBEST_MEMBERSHIP_SINGLE_SCREEN_V3=true;
var st=document.createElement('style');
st.id='dbestMembershipSingleScreenV3';
st.textContent=`
#dbestMembershipPlanModal{padding:8px!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
#dbestMembershipPlanModal .dbmShell{width:min(1180px,calc(100vw - 16px))!important;height:min(94vh,760px)!important;max-height:94vh!important;overflow:hidden!important;padding:14px!important;border-radius:22px!important;display:grid!important;grid-template-rows:auto 1fr auto!important;box-sizing:border-box!important}
#dbestMembershipPlanModal .dbmHead{margin:0 0 8px!important;gap:9px!important;min-height:0!important}
#dbestMembershipPlanModal .dbmCrown{width:38px!important;height:38px!important;border-radius:12px!important;font-size:21px!important;flex:0 0 auto!important}
#dbestMembershipPlanModal .dbmHead h2{font-size:clamp(15px,2vw,21px)!important;line-height:1.15!important}
#dbestMembershipPlanModal .dbmHead p{font-size:clamp(9px,1.2vw,12px)!important;line-height:1.2!important;margin-top:2px!important}
#dbestMembershipPlanModal .dbmClose{width:36px!important;height:36px!important;font-size:23px!important;flex:0 0 auto!important;z-index:3!important}
#dbestMembershipPlanModal .dbmGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;min-height:0!important;overflow:hidden!important}
#dbestMembershipPlanModal .dbmPlan{min-height:0!important;height:100%!important;padding:10px 9px!important;border-radius:15px!important;overflow:hidden!important;box-sizing:border-box!important}
#dbestMembershipPlanModal .dbmIcon{font-size:clamp(18px,2.4vw,26px)!important;line-height:1!important}
#dbestMembershipPlanModal .dbmPlan h3{font-size:clamp(13px,1.8vw,18px)!important;margin:4px 0 0!important;line-height:1.1!important}
#dbestMembershipPlanModal .dbmPrice{font-size:clamp(16px,2vw,22px)!important;margin:3px 0!important;line-height:1.1!important}
#dbestMembershipPlanModal .dbmPrice small{font-size:clamp(7px,1vw,10px)!important}
#dbestMembershipPlanModal .dbmBest{font-size:clamp(8px,1.15vw,11px)!important;line-height:1.22!important;min-height:0!important;margin-top:2px!important}
#dbestMembershipPlanModal .dbmList{margin:7px 0 8px!important;gap:4px!important;min-height:0!important;overflow:hidden!important}
#dbestMembershipPlanModal .dbmList li{font-size:clamp(8px,1.05vw,10.5px)!important;line-height:1.22!important;padding-left:13px!important}
#dbestMembershipPlanModal .dbmList li:before{font-size:10px!important}
#dbestMembershipPlanModal .dbmChoose{min-height:34px!important;border-radius:10px!important;font-size:clamp(9px,1.15vw,12px)!important;padding:5px!important;margin-top:auto!important}
#dbestMembershipPlanModal .dbmFoot{margin-top:7px!important;gap:6px!important}
#dbestMembershipPlanModal .dbmTrust{padding:5px 4px!important;border-radius:9px!important;font-size:8px!important;line-height:1.12!important}
#dbestMembershipPlanModal .dbmTrust b{font-size:9px!important;margin-bottom:1px!important}
@media(max-width:700px){
 #dbestMembershipPlanModal{padding:4px!important;align-items:center!important}
 #dbestMembershipPlanModal .dbmShell{width:calc(100vw - 8px)!important;height:calc(100dvh - 8px)!important;max-height:calc(100dvh - 8px)!important;padding:8px 5px!important;border-radius:16px!important;grid-template-rows:auto 1fr!important}
 #dbestMembershipPlanModal .dbmHead{margin-bottom:5px!important;gap:5px!important}
 #dbestMembershipPlanModal .dbmCrown{display:none!important}
 #dbestMembershipPlanModal .dbmHead h2{font-size:13px!important}
 #dbestMembershipPlanModal .dbmHead p{font-size:8px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 #dbestMembershipPlanModal .dbmClose{width:31px!important;height:31px!important;font-size:21px!important}
 #dbestMembershipPlanModal .dbmGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important}
 #dbestMembershipPlanModal .dbmPlan{padding:6px 3px!important;border-radius:10px!important;text-align:left!important}
 #dbestMembershipPlanModal .dbmIcon{font-size:17px!important;text-align:center!important}
 #dbestMembershipPlanModal .dbmPlan h3{font-size:10px!important;text-align:center!important;white-space:nowrap!important}
 #dbestMembershipPlanModal .dbmPrice{font-size:12px!important;text-align:center!important;white-space:nowrap!important}
 #dbestMembershipPlanModal .dbmPrice small{display:none!important}
 #dbestMembershipPlanModal .dbmBest{font-size:7px!important;line-height:1.15!important;text-align:center!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
 #dbestMembershipPlanModal .dbmList{gap:3px!important;margin:5px 0!important}
 #dbestMembershipPlanModal .dbmList li{font-size:7px!important;line-height:1.15!important;padding-left:9px!important;overflow-wrap:anywhere!important}
 #dbestMembershipPlanModal .dbmList li:before{font-size:8px!important}
 #dbestMembershipPlanModal .dbmList li:nth-child(n+4){display:none!important}
 #dbestMembershipPlanModal .dbmChoose{min-height:29px!important;font-size:7.5px!important;padding:3px 1px!important;border-radius:7px!important;white-space:normal!important;line-height:1.05!important}
 #dbestMembershipPlanModal .dbmFoot{display:none!important}
}
@media(max-width:390px){
 #dbestMembershipPlanModal .dbmHead p{display:none!important}
 #dbestMembershipPlanModal .dbmPlan{padding:5px 2px!important}
 #dbestMembershipPlanModal .dbmBest{font-size:6.6px!important;-webkit-line-clamp:2!important}
 #dbestMembershipPlanModal .dbmList li{font-size:6.5px!important}
 #dbestMembershipPlanModal .dbmList li:nth-child(n+4){display:none!important}
}
@media(max-height:650px){
 #dbestMembershipPlanModal .dbmBest{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
 #dbestMembershipPlanModal .dbmList li:nth-child(n+4){display:none!important}
 #dbestMembershipPlanModal .dbmFoot{display:none!important}
}
`;
document.head.appendChild(st);
})();
