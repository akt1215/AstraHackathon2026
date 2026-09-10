import type { Action, ActorView, DirectIntent, Entity, Point, Primitive, PublicState, Resolution, World, WorldEvent } from './types';
import { createWorld } from './scenario';
import { actorView, canSee, distance, line, perceive, position } from './perception';
import { develop } from './development';
export { createWorld, actorView };
function fail(message:string):never {throw new Error(message);}
const ground=(p:Point)=>({kind:'ground' as const,x:p.x,y:p.y});
function entity(w:World,id:string):Entity{return w.entities[id]??fail(`Unknown entity: ${id}`);}
function pos(w:World,id:string):Point{return position(w,id)??fail(`${entity(w,id).name} is no longer present.`);}
function reachable(w:World,actor:string,id:string,range=1){if(distance(pos(w,actor),pos(w,id))>range)fail(`Move closer to ${entity(w,id).name}.`);}
function solid(w:World,p:Point,ignore?:string,size=2):boolean{
 if(p.x<0||p.y<0||p.x>=w.width||p.y>=w.height||w.walls.some(c=>c.x===p.x&&c.y===p.y))return true;
 return Object.values(w.entities).some(e=>e.id!==ignore&&e.location.kind==='ground'&&e.location.x===p.x&&e.location.y===p.y&&e.props.solid&&!e.props.open&&!(e.props.gap&&size<=e.props.gap));
}
function face(w:World,id:string,p:Point){const a=w.actors[id],from=pos(w,id),dx=p.x-from.x,dy=p.y-from.y;if(dx===0&&dy===0)return;a.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'east':'west'):(dy>0?'south':'north');}
function stepToward(w:World,id:string,target:Point,stop=0):Point|null{
 const start=pos(w,id),queue=[start],prev=new Map<string,Point|null>([[`${start.x},${start.y}`,null]]);let found:Point|undefined;
 while(queue.length){const p=queue.shift()!;if(distance(p,target)<=stop){found=p;break;}
  for(const n of [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}]){const key=`${n.x},${n.y}`;if(!prev.has(key)&&!solid(w,n,id)){prev.set(key,p);queue.push(n);}}
 }
 if(!found||distance(start,found)===0)return null;
 while(true){const before=prev.get(`${found.x},${found.y}`);if(!before)return null;if(before.x===start.x&&before.y===start.y)return found;found=before;}
}
function emit(w:World,actor:string,kind:string,text:string,location:Point,extra:Partial<WorldEvent>={}):WorldEvent{
 const e:WorldEvent={id:`event-${w.events.length+1}`,tick:w.tick,kind,actor,text,location:{...location},noise:0,witnesses:[],...extra};w.events.push(e);perceive(w,e);develop(w,e);return e;
}
function known(w:World,id:string,target:string){if(id==='player')return;const view=actorView(w,id);if(!view.entities.some(e=>e.id===target)&&!view.knownIssues.some(i=>i.id===target))fail('That target is outside this character’s knowledge.');}
function guarding(w:World,id:string,gate:Entity):boolean{
 const keeper=w.actors.guard;if(id==='guard'||w.actors[id].permission||keeper.wakefulness==='asleep'||distance(pos(w,'guard'),pos(w,gate.id))>2)return false;
 const keeperPos=pos(w,'guard'), visitor=pos(w,id);
 if(keeper.attention){const focus=keeper.attention;if((focus.x-keeperPos.x)*(visitor.x-keeperPos.x)+(focus.y-keeperPos.y)*(visitor.y-keeperPos.y)<0)return false;}
 return canSee(w,'guard',visitor);
}
function settleIssue(w:World,id:string,issueId:string,mode:string):void{
 const issue=w.issues.find(i=>i.id===issueId);if(!issue||issue.status==='settled')return;
 issue.status='settled';emit(w,id,'settle',`${entity(w,id).name} settled the obligation for ${entity(w,issue.entity).name} (${mode}).`,pos(w,id),{subject:issue.id,target:issue.owner});
}
function move(w:World,id:string,op:Extract<Primitive,{kind:'move'}>):void{
 const e=entity(w,op.entity);known(w,id,e.id);const dest={x:op.x,y:op.y};if(!Number.isInteger(dest.x)||!Number.isInteger(dest.y))fail('Use a whole grid position.');
 if(e.kind==='actor'){
  if(e.id!==id)fail('A character can only walk their own body.');
  if(op.style!=='walk'&&op.style!=='approach')fail('A person must walk, not be thrown.');
  const from=pos(w,id),next=op.style==='approach'?stepToward(w,id,dest,solid(w,dest,id)?1:0):dest;
  if(!next||distance(from,next)!==1)fail('Walking is one neighboring tile per reaction turn.');
  if(solid(w,next,id))fail('That space is blocked.');
  face(w,id,next);e.location=ground(next);w.actors[id].fatigue=Math.min(100,w.actors[id].fatigue+1);
  emit(w,id,'move',`${e.name} moved.`,next,{subject:id});
  const noise=w.actors[id].memories.slice().reverse().find(o=>o.kind==='noise_heard'&&distance(next,o.location)<=1&&!w.actors[id].evidence.some(v=>v.id===`vigilance:${o.eventId}`));
  if(noise&&!Object.values(w.actors).some(a=>a.id!==id&&a.hp<=0&&distance(pos(w,a.id),next)<=2))emit(w,id,'investigate',`${e.name} checked the source of a sound; no immediate threat was found.`,next,{subject:noise.eventId});
  return;
 }
 if(!e.props.portable||op.style==='walk'||op.style==='approach')fail('That object cannot move that way.');
 if(e.location.kind==='held'&&e.location.actor!==id)fail('That item is held by someone else.');
 reachable(w,id,e.id);const from=pos(w,e.id);
 if(distance(from,dest)<1||distance(from,dest)>6)fail('Objects can travel one to six tiles.');
 let landing=from,hit:Entity|undefined;
 for(const p of line(from,dest)){
  hit=Object.values(w.entities).find(v=>v.id!==e.id&&v.id!==id&&v.kind==='actor'&&v.location.kind==='ground'&&v.location.x===p.x&&v.location.y===p.y);
  if(hit||solid(w,p,e.id,e.props.size??1))break;
  landing=p;
 }
 if(solid(w,landing,e.id,e.props.size??1)&&distance(landing,pos(w,id))!==0)fail('There is no safe landing before the obstruction.');
 const beforeHolder=e.location.kind==='held'?e.location.actor:null;
 e.location=ground(landing);if(e.props.fragile&&op.style==='throw')e.location={kind:'removed'};
 if(hit&&op.style==='throw'){
  w.actors[hit.id].hp=Math.max(0,w.actors[hit.id].hp-2);
  emit(w,id,'injury',`${e.name} hit ${hit.name}, causing 2 damage.`,pos(w,hit.id),{subject:e.id,target:hit.id,noise:e.props.noise??3});
 }
 emit(w,id,'impact',`${e.name} ${e.location.kind==='removed'?'broke':'landed'} at (${landing.x}, ${landing.y}).`,landing,{subject:e.id,noise:op.style==='slide'?Math.max(1,(e.props.noise??3)-2):e.props.noise??3,data:{broken:e.location.kind==='removed',previousHolder:beforeHolder??'ground'}});
 w.actors[id].fatigue=Math.min(100,w.actors[id].fatigue+2);
}
function transfer(w:World,id:string,op:Extract<Primitive,{kind:'transfer'}>):void{
 const e=entity(w,op.entity);known(w,id,e.id);if(!e.props.portable)fail('That cannot be carried.');reachable(w,id,e.id);
 if(e.location.kind==='held'&&e.location.actor!==id)fail('You cannot take an item out of someone’s hands.');
 if(op.to==='ground'){
  if(e.location.kind!=='held'||e.location.actor!==id)fail('Hold the object before placing it.');
  const p={x:op.x??pos(w,id).x,y:op.y??pos(w,id).y};if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>=w.width||p.y>=w.height||distance(pos(w,id),p)>1||w.walls.some(c=>c.x===p.x&&c.y===p.y))fail('Place it on adjacent open ground.');
  if(Object.values(w.entities).some(v=>v.id!==e.id&&v.kind!=='actor'&&v.props.solid&&!v.props.open&&v.location.kind==='ground'&&v.location.x===p.x&&v.location.y===p.y&&!(v.props.gap&&(e.props.size??1)<=v.props.gap)))fail('That ground is occupied by a solid object.');
  const gate=Object.values(w.entities).find(g=>g.kind==='fixture'&&g.props.gap&&position(w,g.id)?.x===p.x&&position(w,g.id)?.y===p.y);
  if(gate&&!gate.props.open&&(e.props.size??1)>(gate.props.gap??0))fail('The closed gate has no clearance for that object.');
  if(e.props.solid&&Object.values(w.entities).some(v=>v.kind==='actor'&&position(w,v.id)?.x===p.x&&position(w,v.id)?.y===p.y))fail('The crate would block an occupied space.');
  e.location=ground(p);emit(w,id,'place',`${entity(w,id).name} placed ${e.name}.`,p,{subject:e.id});return;
 }
 const recipient=w.actors[op.to];if(!recipient)fail('Choose a character or ground as recipient.');known(w,id,op.to);reachable(w,id,op.to);
 if(recipient.wakefulness==='asleep'&&op.to!==id)fail('The recipient must be awake to receive it.');
 if(Object.values(w.entities).filter(v=>v.location.kind==='held'&&v.location.actor===op.to).length>=4)fail('The recipient is carrying too much.');
 const previous=e.location; if(previous.kind==='held'&&previous.actor===op.to)fail('They already hold that item.');e.location={kind:'held',actor:op.to};
 const taking=op.to===id;
 const ev=emit(w,id,taking?'take':'give',`${entity(w,id).name} ${taking?'took':`gave ${entity(w,op.to).name}`} ${e.name}.`,pos(w,id),{subject:e.id,target:op.to});
 if(taking&&e.props.owner&&e.props.owner!==id&&e.props.price&&!w.issues.some(i=>i.entity===e.id&&i.status==='open'))w.issues.push({id:`issue-${w.issues.length+1}`,actor:id,owner:e.props.owner,entity:e.id,amount:e.props.price,status:'open',eventId:ev.id,reportedTo:[],applied:[]});
 if(!taking&&e.props.owner===op.to){for(const issue of w.issues.filter(i=>i.entity===e.id&&i.actor===id&&i.status==='open'))settleIssue(w,id,issue.id,'returned');}
 else if(!taking&&e.props.owner===id&&e.props.price){
  const debts=actorView(w,op.to).knownIssues.filter(i=>i.actor===id&&i.owner===op.to&&i.status==='open');
  if(debts.length&&debts.reduce((sum,i)=>sum+i.amount,0)<=e.props.price){for(const debt of debts)settleIssue(w,id,debt.id,`collateral: ${e.name}`);e.props.owner=op.to;}
 }
}
function transform(w:World,id:string,op:Extract<Primitive,{kind:'transform'}>):void{
 const a=w.actors[id];
 if(op.rule==='settle'){
  const issues=w.issues.filter(i=>(i.id===op.entity||i.entity===op.entity)&&i.actor===id&&i.status==='open');if(!issues.length)fail('There is no outstanding obligation for that item.');
  for(const issue of issues){reachable(w,id,issue.owner);if(op.target&&op.target!==issue.owner)fail('Pay the rightful owner.');if(a.coins<issue.amount)fail(`You need ${issue.amount} coins, or return the item / offer sufficient collateral.`);a.coins-=issue.amount;w.actors[issue.owner].coins+=issue.amount;settleIssue(w,id,issue.id,'paid');w.entities[issue.entity].props.owner=id;}return;
 }
 const e=entity(w,op.entity);known(w,id,e.id);
 if(['rest','wake','look','permit'].includes(op.rule)&&e.id!==id)fail('That change is the other character’s own decision.');
 if(op.rule==='rest'){a.fatigue=Math.max(0,a.fatigue-12);a.mood='resting';emit(w,id,'rest',`${e.name} rested.`,pos(w,id));return;}
 if(op.rule==='wake'){a.wakefulness='awake';a.awakenedTick=w.phase&&!w.phase.finalized?w.tick:w.tick+1;emit(w,id,'wake',`${e.name} woke.`,pos(w,id));return;}
 if(op.rule==='look'){
  const p=op.target?pos(w,op.target):{x:op.x??NaN,y:op.y??NaN};if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x>=w.width||p.y>=w.height)fail('Choose a location in the room.');if(op.target)known(w,id,op.target);
  face(w,id,p);a.attention={...p,until:w.tick+1};a.mood='watching a new direction';emit(w,id,'look',`${e.name} turned toward (${p.x}, ${p.y}).`,pos(w,id));return;
 }
 if(op.rule==='permit'){
  const target=op.target??'player';if(!w.actors[target])fail('Permission needs a character.');known(w,id,target);reachable(w,id,target,6);
  if(id==='guard'){
   if(actorView(w,id).knownIssues.some(i=>i.actor===target&&i.status==='open'))fail('The keeper requires known unpaid supplies to be settled or secured first.');
   w.actors[target].permission=true;w.entities.gate.props.locked=false;w.entities.gate.props.open=true;
   if(target==='player')w.actors.companion.permission=true;
   emit(w,id,'permit',`${e.name} opened the gate and permitted ${entity(w,target).name} to pass.`,pos(w,id),{target});
  }else{a.following=target;a.goal=`Follow ${entity(w,target).name} through the gate to the refuge.`;emit(w,id,'follow',`${e.name} agreed to follow ${entity(w,target).name}.`,pos(w,id),{target});}return;
 }
 if(op.rule==='heal'){
  const target=op.target??id;known(w,id,target);reachable(w,id,target);
  if(!w.actors[target]||!e.props.heal||e.location.kind!=='held'||e.location.actor!==id)fail('Healing requires a held restorative and a nearby character.');
  const t=w.actors[target];if(t.hp>=t.maxHp)fail('They do not need healing.');const amount=Math.min(e.props.heal,t.maxHp-t.hp);t.hp+=amount;e.location={kind:'removed'};emit(w,id,'heal',`${entity(w,id).name} restored ${amount} HP to ${entity(w,target).name}.`,pos(w,target),{subject:e.id,target,data:{amount}});return;
 }
 if(op.rule==='open'||op.rule==='close'){
  if(e.kind!=='fixture'||e.props.open===undefined)fail('That fixture cannot open or close.');reachable(w,id,e.id);
  if(op.rule==='close'){
   const p=pos(w,e.id);if(Object.values(w.entities).some(v=>v.id!==e.id&&v.props.solid&&position(w,v.id)?.x===p.x&&position(w,v.id)?.y===p.y))fail('Something braces or occupies the gate.');e.props.open=false;
  }else{
   if(guarding(w,id,e))fail('Mara is watching this approach and blocks access. Seek permission or another opening.');
   if(e.props.locked){const key=Object.values(w.entities).find(v=>v.id===e.props.key&&v.location.kind==='held'&&v.location.actor===id);if(!key)fail('The locked gate needs its key or the keeper’s permission.');e.props.locked=false;}e.props.open=true;
  }
  emit(w,id,op.rule,`${entity(w,id).name} ${op.rule==='open'?'opened':'closed'} ${e.name}.`,pos(w,e.id),{subject:e.id,noise:2});return;
 }
 fail('That transition is not supported by this world.');
}
function emote(w:World,id:string,op:Extract<Primitive,{kind:'emote'}>):void{
 const a=w.actors[id];if(op.target){known(w,id,op.target);reachable(w,id,op.target,6);if(w.actors[op.target]?.wakefulness==='asleep')fail('They are asleep and cannot hear this conversation.');}
 if(op.topic==='report'||op.topic==='accuse'){
  if(!op.target||!w.actors[op.target]||!op.evidence?.length)fail('A report needs a nearby listener and your own observations.');
  const refs=op.evidence.map(ref=>a.memories.find(o=>o.id===ref||o.eventId===ref)??fail('The cited observation is not known to this character.'));
  const issues=w.issues.filter(i=>refs.some(o=>o.kind!=='noise_heard'&&o.lineage.includes(i.eventId)));if(!issues.length)fail('Those observations do not ground an allegation about supplies.');
  const knownClaims=actorView(w,id).knownIssues;
  const report=emit(w,id,'speech',`${entity(w,id).name}: ${op.text}`,pos(w,id),{target:op.target,noise:6,data:{speech:op.text}});
  const receiver=w.actors[op.target];
  if(!receiver.memories.some(o=>o.eventId===report.id&&(o.kind==='speech'||o.kind==='speech_heard')))fail('The listener cannot make out the report from here.');
  for(const issue of issues){
   const claim=knownClaims.find(i=>i.id===issue.id)!;
   const settlements=a.memories.flatMap(o=>o.lineage).filter(ref=>w.events.some(e=>e.id===ref&&e.kind==='settle'&&e.subject===issue.id));
   const receiverKnowsSettlement=receiver.memories.some(o=>o.lineage.some(ref=>settlements.includes(ref)));
   if(!issue.reportedTo.includes(op.target)||(claim.status==='settled'&&!receiverKnowsSettlement)){if(!issue.reportedTo.includes(op.target))issue.reportedTo.push(op.target);receiver.memories.push({id:`${report.id}:report:${issue.id}`,eventId:report.id,tick:w.tick,kind:'report',text:`${entity(w,id).name} reports that ${entity(w,issue.actor).name} took ${entity(w,issue.entity).name}; ${claim.status==='open'?'payment is unresolved':'the obligation was settled'}.`,location:pos(w,id),actor:issue.actor,subject:issue.entity,source:id,lineage:[issue.eventId,...settlements,report.id]});}
   if(op.topic==='accuse'&&issue.status==='open'&&!issue.applied.includes(`${id}:accuse`)){issue.applied.push(`${id}:accuse`);a.relationships[issue.actor]={trust:-1,fear:0};}
  }
  return;
 }
 emit(w,id,'speech',`${entity(w,id).name}: ${op.text}`,pos(w,id),{target:op.target,noise:6,data:{topic:op.topic,speech:op.text}});
}
export function resolveAction(world:World,action:Action):Resolution{
 const w=structuredClone(world);const start=w.events.length;
 try{
  const a=w.actors[action.actor];if(!a)fail('Unknown character.');if(a.hp<=0)fail('That character cannot act.');
  if(a.wakefulness==='asleep'&&!(action.ops.length===1&&action.ops[0].kind==='transform'&&action.ops[0].rule==='wake'&&action.ops[0].entity===a.id))fail('A sleeping character must wake before acting.');
  if(action.ops.length<1||action.ops.length>3)fail('An action needs one to three bounded operations.');
  if(action.ops.filter(o=>o.kind==='move').length>1||action.ops.filter(o=>o.kind==='transform').length>1)fail('Movement and significant changes each get one operation per reaction turn.');
  for(const op of action.ops){if(op.kind==='move')move(w,a.id,op);else if(op.kind==='transfer')transfer(w,a.id,op);else if(op.kind==='transform')transform(w,a.id,op);else if(op.kind==='emote')emote(w,a.id,op);else fail('Unsupported physical operation.');}
  w.version++;return {ok:true,world:w,events:w.events.slice(start)};
 }catch(error){return {ok:false,world,events:[],reason:error instanceof Error?error.message:'Action could not resolve.'};}
}
export function beginTick(world:World):World{
 const w=structuredClone(world);if(w.phase&&!w.phase.finalized)return w;
 w.tick++;
 w.phase={batch:`${w.id}:${w.tick}`,tick:w.tick,slots:Object.values(w.actors).filter(a=>a.role==='npc'&&a.hp>0&&a.wakefulness==='awake'&&(a.awakenedTick===undefined||a.awakenedTick<w.tick)).map(a=>a.id).sort(),completed:[],finalized:false};return w;
}
export function finishTick(world:World):World{
 const w=structuredClone(world);if(!w.phase||w.phase.finalized)return w;
 for(const a of Object.values(w.actors)){
  if(a.attention&&a.attention.until<w.tick)a.attention=null;
  if(a.wakefulness==='asleep')a.fatigue=Math.max(0,a.fatigue-8);
  else if(!w.events.some(e=>e.tick===(a.role==='player'?w.tick-1:w.tick)&&e.actor===a.id&&e.kind==='rest'))a.fatigue=Math.min(100,a.fatigue+1);
 }
 const p=pos(w,'player'),c=pos(w,'companion');
 if(w.actors.player.hp<=0||w.actors.companion.hp<=0){w.objective.status='failed';w.objective.step='A traveler was incapacitated. Start a new encounter to try another approach.';}
 else if(p.x>=12&&c.x>=12){w.objective.status='complete';w.objective.step='You and Ivo reached the refuge together.';emit(w,'player','objective','You and Ivo reached the refuge together.',p);}
 else if(p.x>=12)w.objective.step='You reached the refuge. Ivo still needs to cross.';
 else if(w.entities.gate.props.open)w.objective.step='The gate is open. Bring Ivo through to the refuge.';
 w.phase.finalized=true;w.version++;return w;
}
export function fallbackAction(w:World,id:string):Action{
 return {actor:id,intent:'Deterministic provider-outage rest fallback',ops:[{kind:'transform',entity:id,rule:'rest'}]};
}
export function directAction(w:World,intent:DirectIntent):Action{
 const id='player',wrap=(ops:Primitive[],label:string):Action=>({actor:id,intent:label,ops});
 if(intent.kind==='move')return wrap([{kind:'move',entity:id,x:intent.x,y:intent.y,style:'approach'}],'Walk toward the selected tile');
 if(intent.kind==='wait'||intent.kind==='rest')return wrap([{kind:'transform',entity:id,rule:'rest'}],'Wait / rest');
 if(!('entity' in intent))return wrap([{kind:'transform',entity:id,rule:'rest'}],'Rest');
 const e=entity(w,intent.entity);
 if(intent.kind==='drop'){
  const origin=pos(w,id);const free=[origin,{x:origin.x+1,y:origin.y},{x:origin.x-1,y:origin.y},{x:origin.x,y:origin.y+1},{x:origin.x,y:origin.y-1}].find(p=>!solid(w,p,e.id));
  return wrap([{kind:'transfer',entity:e.id,to:'ground',...(e.props.solid&&free?free:{})}],`Place ${e.name}`);
 }
 const p=pos(w,e.id);
 if(distance(pos(w,id),p)>1)return wrap([{kind:'move',entity:id,x:p.x,y:p.y,style:'approach'}],`Approach ${e.name}`);
 if(e.kind==='item'&&e.location.kind==='held'&&e.location.actor===id&&e.props.heal){const patient=Object.values(w.actors).find(a=>a.id!==id&&a.hp<a.maxHp&&distance(pos(w,id),pos(w,a.id))<=1)?.id??id;return wrap([{kind:'transform',entity:e.id,rule:'heal',target:patient}],`Use ${e.name}`);}
 if(e.kind==='item')return wrap([{kind:'transfer',entity:e.id,to:id}],`Take ${e.name}`);
 if(e.id==='bench')return wrap([{kind:'transform',entity:id,rule:'rest'}],'Rest by the bench');
 if(e.props.open!==undefined)return wrap([{kind:'transform',entity:e.id,rule:e.props.open?'close':'open'}],`Interact with ${e.name}`);
 return wrap([{kind:'emote',topic:'appeal',target:e.kind==='actor'?e.id:undefined,text:e.id==='companion'?'Will you come with me to the refuge?':e.id==='guard'?'Will you let us through the gate?':'We are trying to reach the refuge together.'}],`Talk to ${e.name}`);
}
export function publicState(w:World,busy=false):PublicState{
 const p=w.actors.player;
 return structuredClone({id:w.id,version:w.version,tick:w.tick,width:w.width,height:w.height,walls:w.walls,
 entities:Object.values(w.entities).filter(e=>e.location.kind!=='removed'&&(e.location.kind!=='held'||e.location.actor==='player')),
 actors:Object.values(w.actors).map(a=>({id:a.id,hp:a.hp,maxHp:a.maxHp,fatigue:a.fatigue,wakefulness:a.wakefulness,attention:a.attention,facing:a.facing,mood:a.mood})),
 player:{hp:p.hp,maxHp:p.maxHp,coins:p.coins,fatigue:p.fatigue,evidence:p.evidence,capabilities:p.capabilities,tendencies:p.tendencies},objective:w.objective,
 events:w.events.flatMap(e=>{if(e.witnesses.includes('player')){const {data:_,...visible}=e;return [{...visible,witnesses:[]}];}const heard=p.memories.find(o=>o.eventId===e.id&&(o.kind==='noise_heard'||o.kind==='speech_heard'));return heard?[{id:e.id,tick:e.tick,kind:heard.kind,actor:heard.actor??'unknown',text:heard.text,location:heard.location,noise:e.noise,witnesses:[]}]:[];}).slice(-24),
 issues:w.issues.filter(i=>i.actor==='player').map(i=>({...i,reportedTo:[],applied:[]})),busy});
}
