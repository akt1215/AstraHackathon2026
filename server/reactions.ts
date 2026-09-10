import { actorView, canSee, distance, position } from '../shared/perception';
import type { Action, NpcAwareness, World } from '../shared/types';

function visibleActors(world:World,id:string):string[] {
 return Object.keys(world.actors).filter(other=>other!==id&&position(world,other)&&canSee(world,id,position(world,other)!));
}
function atGate(world:World,id:string):boolean {
 const gate=position(world,'gate'),player=position(world,'player');
 return id==='guard'&&!world.actors.player.permission&&Boolean(gate&&player&&distance(gate,player)<=2&&canSee(world,id,player));
}
function baseline(world:World,id:string):NpcAwareness {
 const actor=world.actors[id];
 return {noticed:[...new Set([...visibleActors(world,id),...Object.keys(actor.relationships),...actor.memories.flatMap(o=>o.actor?[o.actor]:[])])],
  cursor:actor.memories.length,hp:actor.hp,tired:actor.fatigue>=75,wakefulness:actor.wakefulness,atGate:atGate(world,id)};
}
/** Seed established awareness once; preserve it across saves and temporary loss of sight. */
export function initializeAwareness(world:World):World {
 world.awareness??={};
 for(const actor of Object.values(world.actors))if(actor.role==='npc'&&!world.awareness[actor.id]){
  const record=baseline(world,actor.id);
  // Old saves can contain reports delivered after the last batch was planned.
  if(world.phase){const pending=actor.memories.findIndex(o=>o.tick>=world.phase!.tick);if(pending>=0)record.cursor=pending;}
  world.awareness[actor.id]=record;
 }
 return world;
}
const significant=new Set(['take','give','place','heal','injury','impact','open','close','settle','report','wake']);
/** Select costly decisions from this actor's observations, never a global incident summary. */
export function scheduleReactions(world:World,walking:boolean):World {
 const w=structuredClone(world);initializeAwareness(w);
 if(!w.phase||w.phase.finalized)return w;
 w.phase.slots=w.phase.slots.filter(id=>{
  const actor=w.actors[id],previous=w.awareness![id],visible=visibleActors(w,id);
  const newSight=visible.some(other=>!previous.noticed.includes(other));
  const newEvent=actor.memories.slice(previous.cursor).some(o=>{
   if(o.actor===id)return false;
   if(significant.has(o.kind))return true;
   // Muffled conversation/ordinary footfalls do not create an endless chatter loop.
   return o.kind==='noise_heard'&&w.events.some(e=>e.id===o.eventId&&['impact','injury','open','close'].includes(e.kind));
  });
  const gate=atGate(w,id);
  const changed=actor.hp!==previous.hp||(actor.fatigue>=75)!==previous.tired||actor.wakefulness!==previous.wakefulness||gate&&!previous.atGate;
  w.awareness![id]={...baseline(w,id),noticed:[...new Set([...previous.noticed,...visible])],atGate:gate};
  return !walking||newSight||newEvent||changed;
 });
 return w;
}
/** Continue consent already selected by the NPC; fresh choices still require its controller. */
export function followAction(world:World,id:string):Action|null {
 const actor=world.actors[id];
 if(!actor?.following||actor.hp<=0||actor.wakefulness!=='awake'||(actor.awakenedTick!==undefined&&actor.awakenedTick>=world.tick))return null;
 const target=actorView(world,id).entities.find(e=>e.id===actor.following);
 const from=position(world,id);
 if(!from||target?.location.kind!=='ground'||distance(from,target.location)<=1)return null;
 return {actor:id,intent:'Continue following the agreed companion',ops:[{kind:'move',entity:id,style:'approach',x:target.location.x,y:target.location.y}]};
}
/** Do not treat the result of one's own decision as a new reason to reconsider it. */
export function acknowledgeCondition(world:World,id:string):void {
 const previous=world.awareness?.[id];if(!previous)return;
 const actor=world.actors[id];
 previous.hp=actor.hp;previous.tired=actor.fatigue>=75;previous.wakefulness=actor.wakefulness;
}
