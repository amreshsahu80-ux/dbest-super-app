/**
 * Pure policy functions reused by the staged worker and offline end-to-end QA.
 * These helpers make no I/O, and cannot send Firebase messages.
 */
type Recipient = {recipient_type:string;recipient_id:string;event_key:string};
export function isCurrentRecipient(item:Recipient, latest:Recipient|null):boolean {
  return !!latest && latest.event_key===item.event_key &&
    latest.recipient_id===item.recipient_id &&
    latest.recipient_type===item.recipient_type;
}
export function selectedForCanary(
  mode:string, permitted:Set<string>, recipient_type:string, recipient_id:string
):boolean {
  return mode==="all" || (mode==="canary" &&
    permitted.has(recipient_type+":"+recipient_id));
}
export function dispatchGate(enabled:boolean,mode:string,fullApproved:boolean):string|null {
  if(!enabled)return "sending_disabled";
  if(mode!=="canary"&&mode!=="all")return "rollout_mode_off";
  if(mode==="all"&&!fullApproved)return "full_rollout_not_approved";
  return null;
}
