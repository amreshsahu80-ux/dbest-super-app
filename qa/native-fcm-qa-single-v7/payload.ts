/** Pure, data-only Firebase payload for ONE explicitly authenticated Vaahak installation.
 * Never creates a ride/order. Never sends a message or reads account secrets.
 * Mirrors DBest Partner v1.0.3 receiver allowlist and eventKey validation.
 */
export function buildOneDeviceVaahakQaPayload(fcmToken:string, attemptId:string) {
  if (!fcmToken || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    throw new Error("invalid_single_device_qa_payload_input");
  }
  const eventType="vaahak_ride_offer";
  const eventKey=eventType+":qa-only:"+attemptId;
  return {message:{
    token:fcmToken,
    data:{
      title:"QA Only · DBest Vaahak notification",
      body:"One-device notification test. No ride, booking, dispatch or payment was created.",
      targetUrl:"/vaahak",
      eventType,
      eventKey,
    },
    android:{priority:"HIGH",ttl:"120s"},
  }};
}
