import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { actorView, beginTick, createWorld, resolveAction } from '../shared/engine';
import type { Action, ModelResult, World } from '../shared/types';
import { decideNpc, interpret, providerInfo } from './model';

type Result = { name: string; expected: string; passed: boolean; latencyMs?: number; decision?: ModelResult['decision']; actual: unknown; error?: string };
const checks: Result[]=[];
const startedAt=new Date().toISOString();
function record(check:Result):void {
  checks.push(check);
  mkdirSync(resolve('artifacts'),{recursive:true});
  writeFileSync(resolve('artifacts/live-acceptance.json'),JSON.stringify({started:startedAt,inProgress:true,provider:providerInfo(),checks},null,2)+'\n');
}
const at=(world:World,id:string,x:number,y:number)=>{world.entities[id].location={kind:'ground',x,y};};
function fixtureAction(world:World,action:Action):World {
  const resolved=resolveAction(world,action);
  if(!resolved.ok) throw new Error(`Fixture failed: ${resolved.reason}`);
  return resolved.world;
}
function summarize(world:World) {
  return {version:world.version,tick:world.tick,gateOpen:world.entities.gate.props.open,permission:world.actors.player.permission,
    actors:Object.fromEntries(Object.values(world.actors).map(a=>[a.id,{hp:a.hp,fatigue:a.fatigue,wakefulness:a.wakefulness,location:world.entities[a.id].location,attention:a.attention,relationships:a.relationships}])),
    issues:world.issues.map(i=>({id:i.id,status:i.status,reportedTo:i.reportedTo,applied:i.applied}))};
}
async function live(name:string,expected:string,world:World,actor:string,input:string|undefined,judge:(before:World,after:World)=>boolean):Promise<World> {
  try {
    const result=input===undefined?await decideNpc(actorView(world,actor)):await interpret(actorView(world,actor),input);
    const resolved=resolveAction(world,result.decision.action);
    const passed=resolved.ok&&judge(world,resolved.world);
    record({name,expected,passed,latencyMs:result.latencyMs,decision:result.decision,actual:{accepted:resolved.ok,reason:resolved.reason,events:resolved.events,before:summarize(world),after:summarize(resolved.world)}});
    console.log(JSON.stringify({name,passed,accepted:resolved.ok,latencyMs:result.latencyMs,reason:resolved.reason}));
    return resolved.world;
  } catch(error) {
    const message=error instanceof Error?error.message:'Model failed';
    record({name,expected,passed:false,actual:summarize(world),error:message});console.log(JSON.stringify({name,passed:false,error:message}));return world;
  }
}
function keyFixture():World {
  const world=createWorld();at(world,'companion',3,4);world.entities.key.location={kind:'held',actor:'player'};
  return world;
}
async function main():Promise<void> {
  const started=new Date().toISOString();
  for(const [name,input] of [
    ['gentle-handoff','Toss the brass key gently into Ivo’s waiting hands.'],
    ['gentle-handoff-paraphrase','Send the little brass key over to Ivo for an easy catch.'],
  ]) await live(name,'Same key ends held by companion; companion HP unchanged; no injury.',keyFixture(),'player',input,(before,after)=>after.entities.key.location.kind==='held'&&after.entities.key.location.actor==='companion'&&after.actors.companion.hp===before.actors.companion.hp&&!after.events.some(e=>e.kind==='injury'));
  await live('intentional-impact','Key hits companion through throw physics; HP decreases.',keyFixture(),'player','Hurl the brass key directly into Ivo’s face to hurt him.',(before,after)=>after.actors.companion.hp<before.actors.companion.hp&&after.events.some(e=>e.kind==='injury'));

  const soundWorlds:Record<string,World>={};
  for(const variant of ['baseline','tired','asleep'] as const) {
    let world=createWorld(variant);at(world,'player',7,4);world.actors.guard.facing='east';world.entities.key.location={kind:'held',actor:'player'};
    world=fixtureAction(world,{actor:'player',intent:'Identical quiet sound fixture',ops:[{kind:'move',entity:'key',x:9,y:4,style:'throw'}]});
    const view=actorView(world,'guard');const heard=view.observations.filter(o=>o.kind==='noise_heard');
    world=beginTick(world);soundWorlds[variant]=world;
    const expected=variant==='baseline'?'Awake guard hears quiet sound without learning maker.':variant==='tired'?'Tired guard misses this weak sound.':'Sleeping guard stays asleep and gets no decision slot.';
    const passed=variant==='baseline'?heard.length===1&&heard[0].actor===undefined:variant==='tired'?heard.length===0:heard.length===0&&world.actors.guard.wakefulness==='asleep'&&!world.phase!.slots.includes('guard');
    record({name:`sound-perception-${variant}`,expected,passed,actual:{observations:view.observations,wakefulness:world.actors.guard.wakefulness,slots:world.phase!.slots}});
  }
  const soundAfter:Record<string,World>={};
  for(const variant of ['baseline','tired']) soundAfter[variant]=await live(`sound-decision-${variant}`,'A real NPC proposal commits under its own state and perception; no fabricated impact or identity.',soundWorlds[variant],'guard',undefined,(_before,after)=>after.actors.guard.hp===soundWorlds[variant].actors.guard.hp);

  const baseline=createWorld();at(baseline,'player',9,5);at(baseline,'companion',9,6);baseline.actors.companion.facing='north';
  let reported=createWorld('asleep');at(reported,'player',4,5);reported.actors.companion.facing='east';
  reported=fixtureAction(reported,{actor:'player',intent:'Witnessed taking of unpaid supplies',ops:[{kind:'transfer',entity:'medicine',to:'player'}]});
  at(reported,'player',5,5);
  reported=fixtureAction(reported,{actor:'player',intent:'Second witnessed taking of unpaid supplies',ops:[{kind:'transfer',entity:'tonic',to:'player'}]});
  at(reported,'player',9,5);at(reported,'companion',9,6);reported.actors.companion.facing='north';reported.actors.guard.wakefulness='awake';reported.actors.guard.fatigue=baseline.actors.guard.fatigue;reported.actors.guard.mood=baseline.actors.guard.mood;
  const withheld=structuredClone(reported);
  const witness=actorView(reported,'companion');
  reported=fixtureAction(reported,{actor:'companion',intent:'Deliver witnessed supply allegation',ops:[{kind:'emote',topic:'report',target:'guard',text:'I saw the traveler take both supplies. Payment is unresolved.',evidence:witness.observations.filter(o=>o.kind==='take').map(o=>o.id)}]});
  record({name:'report-fixture',expected:'Guard knows both witnessed supply issues only after an actual sourced report.',passed:actorView(baseline,'guard').knownIssues.length===0&&actorView(reported,'guard').knownIssues.length===2,actual:{baselineKnownIssues:actorView(baseline,'guard').knownIssues,reportedKnownIssues:actorView(reported,'guard').knownIssues,delivered:actorView(reported,'guard').observations.filter(o=>o.kind==='report')}});
  const sentence='Mara, please let Ivo and me through the gate. We need to reach the refuge.';
  let appeal:Action|undefined;
  try {
    const result=await interpret(actorView(baseline,'player'),sentence);appeal=result.decision.action;
    const a=resolveAction(baseline,appeal),b=resolveAction(reported,appeal);
    record({name:'same-negotiation-intent',expected:'One fresh interpretation of the same appeal commits as speech in both cloned encounters; no permission granted by player narration.',passed:a.ok&&b.ok&&!a.world.actors.player.permission&&!b.world.actors.player.permission,latencyMs:result.latencyMs,decision:result.decision,actual:{baselineAccepted:a.ok,reportedAccepted:b.ok,baselineReason:a.reason,reportedReason:b.reason,comparisonMethod:'One live interpretation replayed into both fixtures controls interpretation variability.'}});
  }catch(error){record({name:'same-negotiation-intent',expected:'Live interpretation available.',passed:false,actual:null,error:error instanceof Error?error.message:'Model failed'});}
  const negotiation:Record<string,World>={};
  for(const [name,world] of [['baseline',baseline],['reported',reported]] as const) {
    const prepared=appeal?resolveAction(world,appeal).world:world;
    negotiation[name]=await live(`negotiation-${name}`,'Guard chooses a valid response grounded in its own available history; reported unpaid debts cannot be bypassed.',prepared,'guard',undefined,(_before,after)=>name!=='reported'||!after.actors.player.permission);
  }
  const baselineChoice=checks.find(check=>check.name==='negotiation-baseline')?.decision?.action;
  if(appeal&&baselineChoice) {
    const prepared=fixtureAction(withheld,appeal);
    const control=resolveAction(prepared,baselineChoice);
    record({name:'withheld-report-replay-control',expected:'With identical actual debts and supply possession but no delivered report, the baseline live permission action remains mechanically legal.',passed:actorView(prepared,'guard').knownIssues.length===0&&control.ok&&control.world.actors.player.permission,actual:{method:'Replay of the already recorded baseline live guard action, not an additional model call.',knownIssues:actorView(prepared,'guard').knownIssues,accepted:control.ok,reason:control.reason,after:summarize(control.world)}});
  }
  const materiallyDifferent=negotiation.baseline.actors.player.permission!==negotiation.reported.actors.player.permission||negotiation.baseline.entities.gate.props.open!==negotiation.reported.entities.gate.props.open||JSON.stringify(negotiation.baseline.actors.guard.relationships)!==JSON.stringify(negotiation.reported.actors.guard.relationships);
  record({name:'history-material-difference',expected:'Same negotiation after different observed histories changes permission, gate access, or guard relationship.',passed:materiallyDifferent,actual:{baseline:summarize(negotiation.baseline),reported:summarize(negotiation.reported)}});
  const report={started,finished:new Date().toISOString(),provider:providerInfo(),liveCallBudget:8,comparisonNotes:['Fixtures establish physical state through deterministic setup; model decisions are live and uncached.','A sleeping guard is not asked to act.','History comparison replays one live player appeal into both fixtures, then requests independent live guard decisions. The baseline and reported play paths differ in actual supply possession; a separate withheld-report replay controls this mechanically, not as a fresh model decision.','This is a scripted acceptance exercise. Uncoached play and broader semantic reliability remain untested.'],checks};
  mkdirSync(resolve('artifacts'),{recursive:true});writeFileSync(resolve('artifacts/live-acceptance.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:'artifacts/live-acceptance.json',passed:checks.filter(c=>c.passed).length,total:checks.length,failed:checks.filter(c=>!c.passed).map(c=>c.name)}));
  if(checks.some(c=>!c.passed)) process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Acceptance failed');process.exitCode=1;});
