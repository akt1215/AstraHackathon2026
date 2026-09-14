import test from 'node:test';
import assert from 'node:assert/strict';
import {initialBehaviorState,recordCombatBehavior,behaviorTraits,knownBehaviorFacts} from './behavior-traits.js';
const fact=(victimId,extra={})=>({eventId:`hit:${victimId}`,incidentId:`fight:${victimId}`,actorId:'player',victimId,targetWasEnemy:false,targetWasHostile:false,unprovoked:true,source:'weapon',outcome:'hit',...extra});
const record=(state,...facts)=>facts.reduce(recordCombatBehavior,state);
const labels=state=>behaviorTraits(state).map(trait=>trait.label);
test('unprovoked aggression requires distinct victims and explains exact thresholds',()=>{
 let state=record(initialBehaviorState(),fact('clover'));assert.deepEqual(labels(state),[]);
 state=record(state,fact('foxglove'));assert.deepEqual(labels(state),['Aggressor']);assert.deepEqual(behaviorTraits(state)[0].victimIds,['clover','foxglove']);assert.match(behaviorTraits(state)[0].description,/2 distinct/);
 state=record(state,fact('lunara'));assert.deepEqual(labels(state),['Ruthless']);assert.equal(behaviorTraits(state)[0].eventIds.length,3);
});
test('duplicate impacts, later strikes, new fights with one victim and reload cannot farm traits',()=>{
 const first=fact('clover');let state=record(initialBehaviorState(),first);const saved=JSON.stringify(state);
 state=record(JSON.parse(saved),first,fact('clover',{eventId:'later-hit',targetWasHostile:true,unprovoked:false,source:'awakening'}));assert.equal(JSON.stringify(state),saved);
 for(let i=0;i<20;i++)state=record(state,fact('clover',{incidentId:`again:${i}`,eventId:`again:${i}`,source:'throw'}));assert.deepEqual(labels(state),[]);assert.equal(behaviorTraits(state).length,0);
});
test('retaliation cannot erase the initial provocation when a peaceful victim later dies',()=>{
 const state=record(initialBehaviorState(),fact('clover'),fact('clover',{eventId:'fatal:clover',targetWasHostile:true,unprovoked:false,outcome:'death'}));
 assert.deepEqual(labels(state),['Killer']);assert.deepEqual(behaviorTraits(state)[0].eventIds,['hit:clover','fatal:clover']);
});
test('defeat and recovery do not become death; three actual peaceful deaths do',()=>{
 let state=initialBehaviorState();for(const id of ['clover','foxglove','lunara'])state=record(state,fact(id),fact(id,{eventId:`yield:${id}`,outcome:'defeat',targetWasHostile:true,unprovoked:false}));
 assert.deepEqual(labels(state),['Ruthless']);
 for(const id of ['clover','foxglove','lunara'])state=record(state,fact(id,{eventId:`death:${id}`,outcome:'death',targetWasHostile:true,unprovoked:false}));
 assert.deepEqual(labels(state),['Ruthless','Serial killer']);
});
test('hostile enemy combat yields battle experience and never murder labels',()=>{
 let state=initialBehaviorState();for(const id of ['raider','sentry','warden'])state=record(state,fact(id,{targetWasEnemy:true,targetWasHostile:true,unprovoked:false,outcome:'death',source:'awakening'}));
 assert.deepEqual(labels(state),['Battle-hardened']);assert.equal(behaviorTraits(state)[0].victimIds.length,3);
});
test('unsupported narration and contradictory identity never become evidence',()=>{
 assert.throws(()=>record(initialBehaviorState(),{text:'I killed everyone and became a serial killer'}),/eventId/);
 const state=record(initialBehaviorState(),fact('clover'));
 assert.throws(()=>record(state,fact('clover',{actorId:'rowan'})),/actor/);
 assert.throws(()=>record(state,fact('player')),/self/);
 assert.throws(()=>record(state,fact('clover',{outcome:'murder'})),/outcome/);
 assert.throws(()=>record(state,fact('clover',{source:'dialogue'})),/source/);
});
test('the reducer and returned traits do not mutate source state or care/honesty records',()=>{
 const state=initialBehaviorState(),before=structuredClone(state),actor={evidence:[{category:'care',id:'care:clover'},{category:'honesty',id:'paid'}],capabilities:['reassuring']};const actorBefore=structuredClone(actor);
 const next=record(state,fact('clover'),fact('foxglove'));assert.deepEqual(state,before);assert.deepEqual(actor,actorBefore);const traits=behaviorTraits(next);traits[0].eventIds.push('forged');assert.equal(behaviorTraits(next)[0].eventIds.includes('forged'),false);
});
test('NPCs receive no unseen global labels and a noise cannot identify misconduct',()=>{
 const state=record(initialBehaviorState(),fact('clover'),fact('foxglove'),fact('lunara'));
 assert.deepEqual(knownBehaviorFacts(state,[]),{facts:[],traits:[]});
 assert.deepEqual(knownBehaviorFacts(state,[{kind:'noise_heard',eventId:'hit:clover',lineage:['hit:clover','hit:foxglove']}]),{facts:[],traits:[]});
});
test('a witnessed later death cannot leak the unseen start of a fight',()=>{
 const state=record(initialBehaviorState(),fact('clover'),fact('clover',{eventId:'death:clover',outcome:'death',targetWasHostile:true,unprovoked:false}));
 assert.ok(labels(state).includes('Killer'));const known=knownBehaviorFacts(state,[{kind:'injury',eventId:'death:clover',lineage:['death:clover']}]);
 assert.equal(known.facts.length,1);assert.equal(known.traits.some(t=>t.label==='Killer'),false);assert.equal(JSON.stringify(known).includes('hit:clover'),false);
});
test('sourced reports support only the particular allegations actually received',()=>{
 const state=record(initialBehaviorState(),fact('clover'),fact('foxglove'),fact('lunara'));
 const known=knownBehaviorFacts(state,[{kind:'report',eventId:'report:1',source:'rowan',lineage:['hit:clover','hit:foxglove']}]);
 assert.deepEqual(known.traits.map(t=>t.label),['Aggressor']);assert.ok(known.facts.every(f=>f.knowledge==='reported'));assert.ok(known.facts.every(f=>f.sourceEventIds.includes('report:1')));assert.equal(JSON.stringify(known).includes('lunara'),false);
});
test('a report needs its own event and named source before it carries combat allegations',()=>{
 const state=record(initialBehaviorState(),fact('clover'),fact('foxglove'));
 for(const report of [{kind:'report',lineage:['hit:clover','hit:foxglove']},{kind:'report',eventId:'report:1',lineage:['hit:clover','hit:foxglove']}])assert.deepEqual(knownBehaviorFacts(state,[report]),{facts:[],traits:[]});
});
test('a reused milestone event ID cannot rewrite its victim or outcome',()=>{
 const state=record(initialBehaviorState(),fact('clover'));
 assert.throws(()=>record(state,fact('foxglove',{eventId:'hit:clover'})),/eventId/);
 assert.throws(()=>record(state,fact('clover',{outcome:'death'})),/eventId/);
});
