import type { Evidence, World, WorldEvent } from './types';
export function addEvidence(w:World,actor:string,category:Evidence['category'],event:WorldEvent,context:string,text:string):void{
 const a=w.actors[actor];const id=`${category}:${context}`;if(a.evidence.some(e=>e.id===id))return;
 a.evidence.push({id,category,eventIds:[event.id],text});a.tendencies[category]=Math.min(5,(a.tendencies[category]??0)+1);
 const capability={care:'reassuring',honesty:'trusted_exchange',deception:'',vigilance:'watchful'}[category];
 if(capability&&a.tendencies[category]>=2&&!a.capabilities.includes(capability))a.capabilities.push(capability);
}
export function develop(w:World,event:WorldEvent):void{
 if(event.kind==='heal'&&event.target&&event.target!==event.actor&&!w.events.some(e=>e.kind==='injury'&&e.actor===event.actor&&e.target===event.target)){
  addEvidence(w,event.actor,'care',event,`heal:${event.target}`,`Restored ${event.target}'s health using a resource.`);
 }
 if(event.kind==='give'&&event.target&&event.subject&&event.target!==event.actor){
  const item=w.entities[event.subject];if(item.props.heal&&!w.issues.some(i=>i.entity===item.id&&i.status==='open'))addEvidence(w,event.actor,'care',event,`give:${event.target}`,`Gave a useful resource to ${event.target}.`);
 }
 if(event.kind==='settle'&&event.subject)addEvidence(w,event.actor,'honesty',event,event.subject,'Settled a specific obligation.');
 if(event.kind==='investigate')addEvidence(w,event.actor,'vigilance',event,event.subject??event.id,'Checked a sound and found no immediate threat; future distractions deserve scrutiny.');
 if((event.kind==='heal'||event.kind==='give')&&event.target&&event.witnesses.includes(event.target)){
  const target=w.actors[event.target];const rel=target.relationships[event.actor]??{trust:0,fear:0};
  if(!w.events.some(e=>e.id!==event.id&&e.kind===event.kind&&e.actor===event.actor&&e.target===event.target))rel.trust=Math.min(3,rel.trust+1);target.relationships[event.actor]=rel;
 }
}
