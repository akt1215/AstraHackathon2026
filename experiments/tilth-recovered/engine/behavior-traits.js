// Traits summarize committed physical facts. They neither infer actions from
// dialogue nor decide whether an encounter's zero HP means defeat or death.
const SOURCES=new Set(['weapon','throw','awakening']);
const OUTCOME_ORDER={hit:0,defeat:1,death:2};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160;
const clone=value=>structuredClone(value);

export const BEHAVIOR_THRESHOLDS=Object.freeze({aggressor:2,ruthless:3,killer:1,serialKiller:3,battleHardened:2});
export function initialBehaviorState(actorId='player'){
 if(!id(actorId))throw new TypeError('A valid actorId is required.');
 return {version:1,actorId,incidents:[]};
}
function validateState(state){
 if(state?.version!==1||!id(state.actorId)||!Array.isArray(state.incidents))throw new TypeError('Unsupported behavior state.');
 return state;
}
function combatFact(value,actorId){
 for(const field of ['eventId','incidentId','actorId','victimId'])if(!id(value?.[field]))throw new TypeError(`A valid ${field} is required.`);
 if(value.actorId!==actorId)throw new TypeError('Combat fact belongs to another actor.');
 if(value.victimId===actorId)throw new TypeError('A self hit cannot establish behavior toward others.');
 for(const field of ['targetWasEnemy','targetWasHostile','unprovoked'])if(typeof value[field]!=='boolean')throw new TypeError(`A boolean ${field} snapshot is required.`);
 if(!SOURCES.has(value.source))throw new TypeError('Unsupported combat source.');
 if(!Object.hasOwn(OUTCOME_ORDER,value.outcome))throw new TypeError('Unsupported combat outcome.');
 return {eventId:value.eventId,incidentId:value.incidentId,actorId:value.actorId,victimId:value.victimId,targetWasEnemy:value.targetWasEnemy,targetWasHostile:value.targetWasHostile,unprovoked:value.unprovoked,source:value.source,outcome:value.outcome};
}
function factsOf(incident){
 return [incident.origin,...Object.values(incident.milestones)].filter((fact,index,facts)=>facts.findIndex(f=>f.eventId===fact.eventId)===index);
}
/**
 * Record the first physical impact, then only meaningful outcome upgrades.
 * Repeated animation impacts cannot accumulate evidence. New encounters with the
 * same victim remain separate provenance, but do not increase distinct victims.
 */
export function recordCombatBehavior(previous,fact){
 const state=validateState(previous),event=combatFact(fact,state.actorId);
 const existing=state.incidents.flatMap(factsOf).find(f=>f.eventId===event.eventId);
 if(existing){
  if(JSON.stringify(existing)!==JSON.stringify(event))throw new TypeError('A combat eventId cannot be reused for different facts.');
  return clone(state);
 }
 const index=state.incidents.findIndex(incident=>incident.id===event.incidentId&&incident.victimId===event.victimId);
 const next=clone(state);
 if(index<0){next.incidents.push({id:event.incidentId,victimId:event.victimId,origin:event,milestones:{[event.outcome]:event}});return next;}
 const incident=next.incidents[index];
 const latest=Math.max(...Object.keys(incident.milestones).map(outcome=>OUTCOME_ORDER[outcome]));
 if(OUTCOME_ORDER[event.outcome]<=latest)return next;
 incident.milestones[event.outcome]=event;
 return next;
}
function disposition(origin){
 if(origin.targetWasEnemy)return 'battle';
 if(origin.unprovoked)return 'peaceful';
 if(origin.targetWasHostile)return 'battle';
 return 'unknown';
}
function evidenceFor(incidents,{deaths=false}={}){
 const victims=new Map();
 for(const incident of incidents){
  if(victims.has(incident.victimId))continue;
  const death=incident.milestones.death;
  if(deaths&&!death)continue;
  victims.set(incident.victimId,[incident.origin.eventId,...(deaths?[death.eventId]:[])]);
 }
 return {victimIds:[...victims.keys()],eventIds:[...new Set([...victims.values()].flat())]};
}
/** Highest reached label per track; care/honesty live alongside these tracks. */
export function behaviorTraits(value){
 const state=validateState(value),traits=[];
 const peaceful=state.incidents.filter(incident=>disposition(incident.origin)==='peaceful');
 const aggressive=evidenceFor(peaceful),deaths=evidenceFor(peaceful,{deaths:true});
 const battle=evidenceFor(state.incidents.filter(incident=>disposition(incident.origin)==='battle'));
 const add=(id,label,description,evidence)=>traits.push({id,label,description,...evidence});
 if(aggressive.victimIds.length>=BEHAVIOR_THRESHOLDS.ruthless)add('ruthless','Ruthless',`Initiated unprovoked attacks against ${aggressive.victimIds.length} distinct peaceful characters (threshold: 3).`,aggressive);
 else if(aggressive.victimIds.length>=BEHAVIOR_THRESHOLDS.aggressor)add('aggressor','Aggressor',`Initiated unprovoked attacks against ${aggressive.victimIds.length} distinct peaceful characters (threshold: 2).`,aggressive);
 if(deaths.victimIds.length>=BEHAVIOR_THRESHOLDS.serialKiller)add('serial-killer','Serial killer',`Caused confirmed deaths of ${deaths.victimIds.length} distinct peaceful characters in unprovoked encounters (threshold: 3).`,deaths);
 else if(deaths.victimIds.length>=BEHAVIOR_THRESHOLDS.killer)add('killer','Killer',`Caused a confirmed peaceful character death in an unprovoked encounter (threshold: 1).`,deaths);
 if(battle.victimIds.length>=BEHAVIOR_THRESHOLDS.battleHardened)add('battle-hardened','Battle-hardened',`Fought ${battle.victimIds.length} distinct hostile or enemy opponents (threshold: 2).`,battle);
 return traits;
}
/**
 * Build a particular observer's knowledge from actual observation references.
 * Never copy the player's complete trait list into an NPC prompt. A death seen
 * without the initial provocation does not reveal how that encounter began.
 * Reports remain marked as reports; callers should present them as allegations.
 */
export function knownBehaviorFacts(value,observations=[]){
 const state=validateState(value),knowledge=new Map();
 for(const observation of observations){
  if(!observation||['noise_heard','speech_heard'].includes(observation.kind))continue;
  const reported=observation.kind==='report'||observation.kind==='combat_report';
  if(reported&&(!id(observation.eventId)||!id(observation.source)))continue;
  const refs=reported?[observation.eventId,...(Array.isArray(observation.lineage)?observation.lineage:[])]:[observation.eventId];
  for(const ref of refs){
   if(!id(ref))continue;
   const previous=knowledge.get(ref);
   if(!previous||previous.knowledge==='reported'&&!reported)knowledge.set(ref,{knowledge:reported?'reported':'witnessed',sourceEventIds:[observation.eventId].filter(id),...(reported&&id(observation.source)?{reporterId:observation.source}:{})});
  }
 }
 const facts=[];let known=initialBehaviorState(state.actorId);
 for(const incident of state.incidents)for(const fact of factsOf(incident)){
  const source=knowledge.get(fact.eventId);if(!source)continue;
  facts.push({...clone(fact),...clone(source)});
  known=recordCombatBehavior(known,fact);
 }
 const traits=behaviorTraits(known).map(trait=>{const reported=trait.eventIds.some(ref=>knowledge.get(ref)?.knowledge==='reported');return {...trait,description:reported?`Reported allegation: ${trait.description}`:trait.description,knowledge:reported?'reported':'witnessed'};});
 return {facts,traits};
}
