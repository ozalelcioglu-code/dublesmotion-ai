/**
 * TikFinity Desktop -> Duble-S LIVE Games adapter.
 * Event shape documented at https://tikfinity.zerody.one/de/tiktok/actionsandevents
 * This is a local streamer-computer connection only (ws://localhost:21213/).
 */
export type LiveEvent={kind:'join'|'like'|'gift';name:string;key:string};
type UnknownRecord=Record<string,unknown>;
const obj=(v:unknown):UnknownRecord=>v&&typeof v==='object'&&!Array.isArray(v)?v as UnknownRecord:{};
const string=(v:unknown)=>typeof v==='string'?v:'';
const allow=(s:string)=>s.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,32);
export function normalizeTikFinity(input:unknown):LiveEvent|null{
 const root=obj(input),data=obj(root.data),user=obj(data.user);
 const evt=string(root.event).toLowerCase();
 const nick=allow(string(data.uniqueId)||string(user.uniqueId)||string(data.nickname)||string(user.nickname)||string(data.userId));
 if(!nick)return null;
 let kind:LiveEvent['kind']|null=null;
 if(evt==='gift'){
   // TikTok gift streak updates can arrive repeatedly before a gift ends.
   if(data.repeatEnd===false||data.repeatEnd===0)return null;
   kind='gift';
 } else if(evt==='like')kind='like';
 else if(evt==='follow'||evt==='subscribe')kind='join';
 else if(evt==='chat'){
  const message=string(data.comment).toLocaleLowerCase('tr').trim();
  if(!['katıl','katil','join','oyna','play','+','1'].includes(message))return null;
  kind='join';
 }
 if(!kind)return null;
 const eventId=string(data.transactionId)||string(data.msgId)||string(data.eventId)||string(data.id);
 const key=eventId?evt+':'+eventId:'';
 return {kind,name:nick,key};
}
