/** QA-staged FCM payload builder. No network I/O; easy to regression-test. */
const cleanTarget=(x:string)=>/^\/(?!\/)[A-Za-z0-9_/?=&.%-]{0,300}$/.test(x)?x:"/";
export function buildFcmPayload(token:string,notice:Record<string,string>,device:Record<string,string>) {
  const isPartner=device.app_id==="com.dbest4u.partner";
  return {message:{
    token,
    // Android Partner generates its own role-gated PendingIntent; sending a
    // notification+data payload can bypass the receiver when backgrounded.
    ...(isPartner?{}:{notification:{title:notice.title,body:notice.body}}),
    data:{
      title:notice.title,body:notice.body,
      targetUrl:cleanTarget(notice.target_url),
      eventType:notice.event_type,eventKey:notice.event_key,
    },
    android:{
      priority:"HIGH",ttl:"300s",
      ...(isPartner?{}:{notification:{channel_id:"dbest_updates"}}),
    },
  }};
}
