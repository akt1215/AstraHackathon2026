import { describe, it, expect } from 'vitest';
import { createWorld, resolveAction, beginTick, finishTick, actorView, publicState, directAction } from './engine';
import type { Action, World } from './types';
const act = (world: World, ops: Action['ops'], actor = 'player') => resolveAction(world, { actor, intent: 'test', ops });
const at = (world: World, id: string, x: number, y: number) => { world.entities[id].location = {kind:'ground',x,y}; };
describe('shared authoritative rules', () => {
 it('rejects a composition atomically after an invalid second operation', () => {
  const w=createWorld(); at(w,'vase',3,4);
  const r=act(w,[{kind:'transfer',entity:'vase',to:'player'},{kind:'move',entity:'player',x:12,y:4,style:'walk'}]);
  expect(r.ok).toBe(false); expect(r.world).toEqual(w); expect(w.entities.vase.location.kind).toBe('ground');
 });
 it('preserves identity and lands a thrown durable item before walls', () => {
  const w=createWorld(); w.entities.key.location={kind:'held',actor:'player'};
  const r=act(w,[{kind:'move',entity:'key',x:0,y:4,style:'throw'}]);
  expect(r.ok).toBe(true); expect(r.world.entities.key.location).toEqual({kind:'ground',x:1,y:4});
  expect(Object.values(r.world.entities).filter(e=>e.id==='key')).toHaveLength(1); expect(r.events.some(e=>e.kind==='impact')).toBe(true);
 });
 it('makes quiet noise different from wake-up and prevents sleeper actions', () => {
  const w=createWorld('asleep'); at(w,'player',9,4); w.entities.key.location={kind:'held',actor:'player'};
  expect(act(w,[{kind:'transform',entity:'guard',rule:'rest'}],'guard').ok).toBe(false);
  const quiet=act(w,[{kind:'move',entity:'key',x:9,y:3,style:'throw'}]);
  expect(quiet.world.actors.guard.wakefulness).toBe('asleep');
  quiet.world.entities.vase.location={kind:'held',actor:'player'};
  const loud=act(quiet.world,[{kind:'move',entity:'vase',x:10,y:3,style:'throw'}]);
  expect(loud.world.actors.guard.wakefulness).toBe('awake');
  expect(beginTick(loud.world).phase?.slots).not.toContain('guard');
 });
 it('redacts unheard private claims and noise source behind the listener', () => {
  const w=createWorld(); at(w,'player',12,5); w.entities.vase.location={kind:'held',actor:'player'};
  const r=act(w,[{kind:'move',entity:'vase',x:12,y:3,style:'throw'}]);
  const heard=actorView(r.world,'guard').observations.find(o=>o.kind==='noise_heard');
  expect(heard).toBeDefined(); expect(heard?.actor).toBeUndefined(); expect(heard?.subject).toBeUndefined();
  expect(JSON.stringify(publicState(r.world))).not.toContain('memories');
 });
 it('requires witnessed report lineage before the guard knows a debt', () => {
  const w=createWorld(); at(w,'player',4,5); at(w,'companion',3,5); w.actors.companion.facing='east'; at(w,'guard',10,5); w.actors.guard.facing='east';
  const stolen=act(w,[{kind:'transfer',entity:'medicine',to:'player'}]); expect(stolen.ok).toBe(true);
  expect(actorView(stolen.world,'guard').knownIssues).toHaveLength(0);
  const obs=actorView(stolen.world,'companion').observations.find(o=>o.kind==='take'); expect(obs).toBeDefined();
  at(stolen.world,'companion',9,5); stolen.world.actors.guard.facing='west';
  const report=act(stolen.world,[{kind:'emote',topic:'report',text:'They took your medicine.',target:'guard',evidence:[obs!.id]}],'companion');
  expect(report.ok).toBe(true); expect(actorView(report.world,'guard').knownIssues).toHaveLength(1);
  expect(actorView(report.world,'guard').observations.some(o=>o.kind==='report'&&o.source==='companion')).toBe(true);
  const permit=act(report.world,[{kind:'transform',entity:'guard',rule:'permit',target:'player'}],'guard'); expect(permit.ok).toBe(false);
  at(report.world,'player',10,4); report.world.actors.player.coins=9;
  const paid=act(report.world,[{kind:'transform',entity:'medicine',rule:'settle',target:'guard'}]); expect(paid.ok).toBe(true);
  expect(act(paid.world,[{kind:'transform',entity:'guard',rule:'permit',target:'player'}],'guard').ok).toBe(true);
 });
 it('does not accept a report citing another actor private observation', () => {
  const w=createWorld(); const r=act(w,[{kind:'emote',topic:'report',target:'guard',text:'stolen',evidence:['invented']}],'companion'); expect(r.ok).toBe(false);
 });
 it('finalizes a tick once and keeps newly selected attention through next player action', () => {
  let w=beginTick(createWorld()); const r=act(w,[{kind:'transform',entity:'guard',rule:'look',x:10,y:2}],'guard'); expect(r.ok).toBe(true);
  w=finishTick(r.world); const twice=finishTick(w); expect(twice).toEqual(w); expect(w.actors.guard.attention).not.toBeNull();
  const next=act(w,[{kind:'transform',entity:'player',rule:'rest'}]); expect(next.world.actors.guard.attention).not.toBeNull(); expect(next.world.tick).toBe(w.tick);
 });
 it('makes direct approach one bounded step and rejects stepping onto actors', () => {
  const w=createWorld(); const d=directAction(w,{kind:'interact',entity:'gate'}); const r=resolveAction(w,d); expect(r.ok).toBe(true);
  const p=r.world.entities.player.location; expect(p.kind==='ground'&&Math.abs(p.x-2)+Math.abs(p.y-4)).toBe(1);
  at(w,'companion',3,4); expect(act(w,[{kind:'move',entity:'player',x:3,y:4,style:'walk'}]).ok).toBe(false);
 });
 it('grows care from distinct beneficial acts but not self-caused repair', () => {
  const w=createWorld(); at(w,'player',4,5); at(w,'companion',3,5); w.entities.medicine.location={kind:'held',actor:'player'}; w.entities.medicine.props.owner='player';
  let r=act(w,[{kind:'transform',entity:'medicine',rule:'heal',target:'companion'}]); expect(r.ok).toBe(true);
  r.world.entities.tonic.location={kind:'held',actor:'player'}; r.world.entities.tonic.props.owner='player';
  r=act(r.world,[{kind:'transfer',entity:'tonic',to:'companion'}]); expect(r.ok).toBe(true); expect(r.world.actors.player.capabilities).toContain('reassuring');
  const harmful=createWorld(); at(harmful,'player',4,5); harmful.entities.key.location={kind:'held',actor:'player'};
  const hit=act(harmful,[{kind:'move',entity:'key',x:3,y:5,style:'throw'}]); expect(hit.ok).toBe(true);
  hit.world.entities.medicine.location={kind:'held',actor:'player'};
  const repair=act(hit.world,[{kind:'transform',entity:'medicine',rule:'heal',target:'companion'}]); expect(repair.world.actors.player.tendencies.care??0).toBe(0);
 });
});

describe('goal and history controls',()=>{
 it('requires permission or a changed watch direction and checks both travelers at the exit',()=>{
  let w=createWorld(); at(w,'player',10,4);w.entities.key.location={kind:'held',actor:'player'};
  expect(act(w,[{kind:'transform',entity:'gate',rule:'open'}]).ok).toBe(false);
  const turn=act(w,[{kind:'transform',entity:'guard',rule:'look',x:10,y:7}],'guard'); expect(turn.ok).toBe(true);
  const open=act(turn.world,[{kind:'transform',entity:'gate',rule:'open'}]);expect(open.ok).toBe(true);
  w=act(open.world,[{kind:'move',entity:'player',x:11,y:4,style:'walk'}]).world;
  w=act(w,[{kind:'move',entity:'player',x:12,y:4,style:'walk'}]).world;
  w=finishTick(beginTick(w));expect(w.objective.status).toBe('active');
  at(w,'companion',10,4);w.actors.companion.facing='east';
  let follows=act(w,[{kind:'transform',entity:'companion',rule:'permit',target:'player'}],'companion');expect(follows.ok).toBe(true);expect(follows.world.actors.companion.following).toBe('player');
  follows=act(follows.world,[{kind:'move',entity:'companion',x:11,y:4,style:'walk'}],'companion');expect(follows.ok).toBe(true);
  at(follows.world,'player',12,3);
  follows=act(follows.world,[{kind:'move',entity:'companion',x:12,y:4,style:'walk'}],'companion');expect(follows.ok).toBe(true);
  const done=finishTick(beginTick(follows.world));expect(done.objective.status).toBe('complete');expect(finishTick(done)).toEqual(done);
 });
 it('transmits no accusation without a witness and does not multiply a repeated report',()=>{
  const w=createWorld();at(w,'player',4,5);w.actors.guard.facing='east';w.actors.companion.wakefulness='asleep';
  const taken=act(w,[{kind:'transfer',entity:'medicine',to:'player'}]);expect(taken.ok).toBe(true);
  expect(actorView(taken.world,'guard').knownIssues).toHaveLength(0);expect(actorView(taken.world,'companion').knownIssues).toHaveLength(0);
  taken.world.actors.companion.wakefulness='awake';at(taken.world,'companion',9,5);
  expect(act(taken.world,[{kind:'emote',topic:'report',text:'An accusation',target:'guard',evidence:[taken.events[0].id]}],'companion').ok).toBe(false);
  const witness=createWorld();at(witness,'player',4,5);witness.actors.guard.facing='east';
  const r=act(witness,[{kind:'transfer',entity:'medicine',to:'player'}]);at(r.world,'companion',9,5);
  const evidence=actorView(r.world,'companion').observations.find(o=>o.kind==='take')!.id;
  const once=act(r.world,[{kind:'emote',topic:'report',text:'I saw it.',target:'guard',evidence:[evidence]}],'companion');expect(once.ok).toBe(true);
  const twice=act(once.world,[{kind:'emote',topic:'report',text:'Again, I saw it.',target:'guard',evidence:[evidence]}],'companion');expect(twice.ok).toBe(true);
  expect(twice.world.actors.guard.memories.filter(o=>o.kind==='report')).toHaveLength(1);expect(twice.world.issues).toHaveLength(1);
 });
 it('learns vigilance from own sound investigations and carries it into a later social context',()=>{
  const w=createWorld();w.actors.guard.facing='west';at(w,'player',12,3);w.entities.vase.location={kind:'held',actor:'player'};
  let r=act(w,[{kind:'move',entity:'vase',x:12,y:5,style:'throw'}]);expect(r.ok).toBe(true);
  at(r.world,'guard',12,7);
  r=act(r.world,[{kind:'move',entity:'guard',x:12,y:6,style:'walk'}],'guard');expect(r.ok).toBe(true);
  expect(r.world.actors.guard.tendencies.vigilance).toBe(1);
  at(r.world,'guard',10,5);r.world.actors.guard.facing='west';r.world.entities.tonic.location={kind:'held',actor:'player'};
  r=act(r.world,[{kind:'move',entity:'tonic',x:12,y:6,style:'throw'}]);expect(r.ok).toBe(true);
  at(r.world,'guard',12,7);
  r=act(r.world,[{kind:'move',entity:'guard',x:12,y:6,style:'walk'}],'guard');expect(r.ok).toBe(true);
  expect(actorView(r.world,'guard').actor.capabilities).toContain('watchful');
  expect(actorView(r.world,'guard').actor.evidence.filter(e=>e.category==='vigilance')).toHaveLength(2);
  r=act(r.world,[{kind:'move',entity:'guard',x:12,y:7,style:'walk'}],'guard');
  expect(r.world.actors.guard.tendencies.vigilance).toBe(2);
 });
 it('does not leak speech contents or private event IDs through a heard noise',()=>{
  const w=createWorld();at(w,'player',12,5);
  const r=act(w,[{kind:'emote',topic:'talk',text:'A secret private code.'}]);expect(r.ok).toBe(true);
  const view=actorView(r.world,'guard');expect(view.observations.some(o=>o.kind==='noise_heard')).toBe(true);
  expect(JSON.stringify(view)).not.toContain('A secret private code.');
 });
});

describe('adversarial privacy and placement',()=>{
 it('rejects a held-item drop outside the room or inside a solid fixture atomically',()=>{
  const w=createWorld();at(w,'player',1,4);w.entities.key.location={kind:'held',actor:'player'};
  const outside=act(w,[{kind:'transfer',entity:'key',to:'ground',x:-1,y:4}]);expect(outside.ok).toBe(false);
  at(w,'player',10,4);w.entities.vase.location={kind:'held',actor:'player'};
  w.entities.gate.props.gap=0;
  const fixture=act(w,[{kind:'transfer',entity:'vase',to:'ground',x:11,y:4}]);expect(fixture.ok).toBe(false);expect(fixture.world).toEqual(w);
 });
 it('retains a witnessed claim as unresolved until its settlement is perceived',()=>{
  const w=createWorld();at(w,'player',4,5);
  let r=act(w,[{kind:'transfer',entity:'medicine',to:'player'}]);expect(actorView(r.world,'guard').knownIssues[0].status).toBe('open');
  // A remote observer sees the take, but not the later return to a different owner.
  r.world.issues[0].owner='companion';at(r.world,'player',4,5);r.world.actors.guard.facing='east';r.world.actors.player.coins=8;
  r=act(r.world,[{kind:'transform',entity:'medicine',rule:'settle',target:'companion'}]);expect(r.ok).toBe(true);expect(r.world.issues[0].status).toBe('settled');
  expect(actorView(r.world,'guard').knownIssues[0].status).toBe('open');
 });
 it('shows the player a heard sound without disclosing its unseen maker or words',()=>{
  const w=createWorld();w.actors.player.facing='west';at(w,'player',10,4);at(w,'guard',12,4);
  const r=act(w,[{kind:'emote',topic:'talk',text:'Secret hidden message'}],'guard');expect(r.ok).toBe(true);
  const heard=publicState(r.world).events.find(e=>e.kind==='noise_heard');expect(heard).toBeDefined();expect(heard!.actor).toBe('unknown');expect(heard!.text).not.toContain('Secret hidden message');
 });
});

describe('wake reaction boundary',()=>{
 it('waking during another NPC reaction consumes that tick, not the following tick too',()=>{
  let w=beginTick(createWorld('asleep'));at(w,'companion',9,4);w.entities.vase.location={kind:'held',actor:'companion'};
  const r=act(w,[{kind:'move',entity:'vase',x:10,y:3,style:'throw'}],'companion');expect(r.ok).toBe(true);expect(r.world.actors.guard.wakefulness).toBe('awake');expect(r.world.phase!.slots).not.toContain('guard');
  w=finishTick(r.world);expect(beginTick(w).phase!.slots).toContain('guard');
 });
});

describe('spoken language and recognized voices',()=>{
 it('lets a companion hear an invitation from a familiar unseen speaker and choose following',()=>{
  const w=createWorld();
  const spoken=act(w,[{kind:'emote',topic:'promise',target:'companion',text:'Ivo, I will get us safely to the refuge. Will you come with me?'}]);expect(spoken.ok).toBe(true);
  const view=actorView(spoken.world,'companion');
  expect(view.observations.find(o=>o.kind==='speech_heard')?.text).toContain('Will you come with me?');
  expect(view.observations.find(o=>o.kind==='speech_heard')?.actor).toBe('player');
  expect(view.entities.some(e=>e.id==='player')).toBe(true);
  const follow=act(spoken.world,[{kind:'transform',entity:'companion',rule:'permit',target:'player'}],'companion');expect(follow.ok).toBe(true);expect(follow.world.actors.companion.following).toBe('player');
 });
 it('allows intelligible nearby speech without claiming an unfamiliar voice identity',()=>{
  const w=createWorld();at(w,'guard',4,4);w.actors.player.facing='west';
  const r=act(w,[{kind:'emote',topic:'talk',text:'The gate is closed.'}],'guard');const obs=actorView(r.world,'player').observations.find(o=>o.kind==='speech_heard');
  expect(obs?.text).toContain('The gate is closed.');expect(obs?.actor).toBeUndefined();
 });
});

describe('observation grounding',()=>{
 it('sees an impact without identifying a thrower hidden behind the gate',()=>{
  const w=createWorld();at(w,'player',12,4);w.entities.key.location={kind:'held',actor:'player'};
  const r=act(w,[{kind:'move',entity:'key',x:10,y:4,style:'throw'}]);expect(r.ok).toBe(true);
  const impact=actorView(r.world,'guard').observations.find(o=>o.kind==='impact');expect(impact).toBeDefined();expect(impact?.actor).toBeUndefined();
 });
 it('does not deliver allegations through a closed gate that blocks intelligible speech',()=>{
  const w=createWorld();at(w,'player',4,5);w.actors.guard.facing='east';
  const r=act(w,[{kind:'transfer',entity:'medicine',to:'player'}]);const obs=actorView(r.world,'companion').observations.find(o=>o.kind==='take')!;
  at(r.world,'companion',12,4);at(r.world,'guard',10,4);r.world.actors.companion.facing='west';
  r.world.actors.companion.memories.push({id:'prior-voice',eventId:'prior',tick:0,kind:'speech_heard',text:'Mara spoke before.',location:{x:10,y:4},actor:'guard',lineage:[]});
  const report=act(r.world,[{kind:'emote',topic:'report',target:'guard',text:'They took medicine.',evidence:[obs.id]}],'companion');expect(report.ok).toBe(false);expect(actorView(report.world,'guard').knownIssues).toHaveLength(0);
 });
});
