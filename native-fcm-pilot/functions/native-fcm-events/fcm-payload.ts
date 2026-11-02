// Non-secret FCM envelope builder. Pure function for isolated QA tests.
export type FcmNotice = {
  title:string;body:string;target_url:string;event_type:string;
  event_key:string;offer_ttl_seconds?:string;
};
export function fcmPayload(
  token:string, notice:FcmNotice, appId:string,
  safeTarget:(value:string)=>string
) {
  const ride = notice.event_type === "vaahak_ride_offer" &&
    appId === "com.dbest4u.partner";
  const ttl = ride
    ? (Number(notice.offer_ttl_seconds||0)>0 ?
      Math.min(300,Math.max(10,Math.floor(Number(notice.offer_ttl_seconds))))+"s" : "20s")
    : "300s";
  const data = {
    title:notice.title, body:notice.body,
    targetUrl:safeTarget(notice.target_url),
    eventType:notice.event_type,eventKey:notice.event_key
  };
  return {message:{
    token,
    // Data-only for Vaahak offers to allow Android's own notification tap
    // routing even when the app is backgrounded. Other existing alerts
    // retain their previous notification + data behavior.
    ...(!ride ? {notification:{title:notice.title,body:notice.body}} : {}),
    data,
    android:{
      priority:"HIGH",ttl,
      ...(!ride ? {notification:{
        channel_id:appId==="com.dbest4u.partner" ?
          "dbest_partner_updates" : "dbest_updates"
      }} : {})
    }
  }};
}
