import type { ActorView, Entity, Point, World, WorldEvent } from './types';
export const distance=(a:Point,b:Point)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function position(w:World,id:string):Point|null {
 const l=w.entities[id]?.location;
 if(l?.kind==='ground')return {x:l.x,y:l.y};
 if(l?.kind==='held'){const holder=w.entities[l.actor]?.location;return holder?.kind==='ground'?{x:holder.x,y:holder.y}:null;}
 return null;
}
export function line(a:Point,b:Point):Point[]{
 const out:Point[]=[];let x=a.x,y=a.y; const dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y),sx=a.x<b.x?1:-1,sy=a.y<b.y?1:-1;let err=dx-dy;
 while(x!==b.x||y!==b.y){const twice=2*err;if(twice>-dy){err-=dy;x+=sx;}if(twice<dx){err+=dx;y+=sy;}out.push({x,y});}return out;
}
export function canSee(w:World,id:string,p:Point):boolean{
 const a=w.actors[id],origin=position(w,id);if(!a||!origin||a.wakefulness==='asleep')return false;
 if(distance(origin,p)>(a.fatigue>=75?4:7))return false;
 if(distance(origin,p)>1){const dx=p.x-origin.x,dy=p.y-origin.y;if(a.facing==='north'&&dy>0||a.facing==='south'&&dy<0||a.facing==='east'&&dx<0||a.facing==='west'&&dx>0)return false;}
 return !line(origin,p).slice(0,-1).some(c=>w.walls.some(v=>v.x===c.x&&v.y===c.y)||Object.values(w.entities).some(e=>e.kind==='fixture'&&e.props.solid&&!e.props.open&&position(w,e.id)?.x===c.x&&position(w,e.id)?.y===c.y));
}
export function perceive(w:World,event:WorldEvent):void{
 for(const a of Object.values(w.actors)){
  const p=position(w,a.id);if(!p)continue;
  const visible=a.id===event.actor||canSee(w,a.id,event.location);
  const heard=event.noise>=distance(p,event.location)+(a.fatigue>=75?2:0);
  const wasAsleep=a.wakefulness==='asleep';
  if(wasAsleep){if(event.noise<7||!heard)continue;a.wakefulness='awake';a.awakenedTick=w.phase&&!w.phase.finalized?w.tick:w.tick+1;a.mood='startled awake';}
  if(a.memories.some(o=>o.eventId===event.id))continue;
  if(visible&&!wasAsleep){event.witnesses.push(a.id);a.memories.push({id:`${event.id}:${a.id}`,eventId:event.id,tick:w.tick,kind:event.kind,text:event.text,location:{...event.location},...(a.id===event.actor||Boolean(position(w,event.actor)&&canSee(w,a.id,position(w,event.actor)!))?{actor:event.actor}:{}),subject:event.subject,lineage:[event.id]});}
  else if(heard&&event.kind==='speech'&&typeof event.data?.speech==='string'&&!line(p,event.location).slice(0,-1).some(c=>w.walls.some(v=>v.x===c.x&&v.y===c.y)||Object.values(w.entities).some(e=>e.kind==='fixture'&&e.props.solid&&!e.props.open&&position(w,e.id)?.x===c.x&&position(w,e.id)?.y===c.y))){
   const recognized=Boolean(a.relationships[event.actor])||a.memories.some(o=>o.actor===event.actor&&o.kind!=='report');
   a.memories.push({id:`${event.id}:${a.id}`,eventId:event.id,tick:w.tick,kind:'speech_heard',text:`${recognized?w.entities[event.actor].name:'Someone'}: ${event.data.speech}`,location:{...event.location},...(recognized?{actor:event.actor}:{}),lineage:[event.id]});
  }
  else if(heard)a.memories.push({id:`${event.id}:${a.id}`,eventId:event.id,tick:w.tick,kind:'noise_heard',text:`A ${event.noise>=7?'loud':'faint'} sound came from (${event.location.x}, ${event.location.y}).`,location:{...event.location},lineage:[event.id]});
 }
}
export function actorView(w:World,id:string):ActorView{
 const a=w.actors[id];if(!a)throw new Error('Unknown actor');
 const entities=Object.values(w.entities).filter(e=>e.location.kind!=='removed'&&(e.id===id||e.location.kind==='held'&&e.location.actor===id||Boolean(position(w,e.id)&&canSee(w,id,position(w,e.id)!)))).map(e=>{
  const copy=structuredClone(e);if(copy.location.kind==='held'&&copy.location.actor!==id)return null;return copy;
 }).filter((e):e is Entity=>e!==null);
 for(const observed of a.memories.slice().reverse()){
  if(observed.kind==='speech_heard'&&observed.actor&&w.entities[observed.actor]&&!entities.some(e=>e.id===observed.actor)){const remembered=structuredClone(w.entities[observed.actor]);remembered.location={kind:'ground',...observed.location};remembered.description+=' Last heard at this location; recheck movement before contact.';entities.push(remembered);}
 }
 const knownIssues=w.issues.filter(i=>i.actor===id||a.memories.some(o=>o.lineage.includes(i.eventId)&&o.kind!=='noise_heard'));
 return structuredClone({actor:a,self:w.entities[id],entities,observations:a.memories.slice(-24),width:w.width,height:w.height,walls:w.walls,tick:w.tick,version:w.version,knownIssues:knownIssues.map(i=>({...i,status:a.memories.some(o=>(o.kind==='settle'&&o.subject===i.id)||o.lineage.some(ref=>w.events.some(e=>e.id===ref&&e.kind==='settle'&&e.subject===i.id)))?'settled' as const:'open' as const,reportedTo:i.reportedTo.filter(v=>v===id),applied:i.applied.filter(v=>v.startsWith(`${id}:`))}))});
}
