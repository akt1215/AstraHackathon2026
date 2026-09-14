import test from 'node:test';
import assert from 'node:assert/strict';
import {Encounters} from './encounters.js';
import {WorldSimulation} from './world-simulation.js';
const free=(p,dx,dy)=>({x:p.x+dx,y:p.y+dy});
function setup(){
 const simulation=new WorldSimulation({mover:free}), player={x:400,y:300};
 const specs=[{id:'rowan',name:'Rowan',attackable:false,x:350,y:300,hp:100},{id:'clover',name:'Clover',x:430,y:300,hp:90},{id:'mira',name:'Mira',x:420,y:330,hp:90}];
 const facts=[];const encounters=new Encounters({actors:specs,mover:free,onCombat:fact=>{facts.push(fact);simulation.recordCombat(fact);}});
 simulation.restoreBindings({player,actors:encounters.actors,encounters});simulation.sync({player,actors:encounters.actors,hp:280});
 simulation.state.actors.rowan.facing='east';return {simulation,encounters,player,facts};
}
const hit=(g,victim,damage=2,source='weapon')=>g.encounters.hit(g.encounters.actors.find(a=>a.id===victim),damage,{source,attackerPosition:g.player});
test('combat preserves initial provocation across retaliation and reports actual defeat without inventing death',()=>{
 const g=setup();hit(g,'clover');hit(g,'clover',2,'awakening');hit(g,'clover',100);
 assert.equal(g.facts.length,3);assert.equal(g.facts[0].unprovoked,true);assert.equal(g.facts[1].unprovoked,false);assert.equal(g.facts[1].targetWasHostile,true);assert.equal(g.facts[0].incidentId,g.facts[2].incidentId);assert.equal(g.facts[2].outcome,'defeat');
 assert.equal(g.simulation.state.behavior.incidents.length,1);assert.equal(g.simulation.publicState().behaviorTraits.some(t=>t.id==='killer'),false);
 hit(g,'clover');assert.equal(g.facts.length,3);
});
test('two identified peaceful victims change relationships and block Rowan support exactly once',()=>{
 const g=setup();hit(g,'clover');hit(g,'mira');
 assert.equal(g.simulation.publicState().behaviorTraits[0].id,'aggressor');assert.equal(g.simulation.view('rowan').knownBehavior.traits[0].id,'aggressor');
 assert.equal(g.simulation.state.actors.rowan.relationships.player.trust,-2);
 hit(g,'mira');assert.equal(g.simulation.state.actors.rowan.relationships.player.trust,-2);
 const result=g.simulation.apply({actor:'rowan',ops:[{kind:'transform',entity:'rowan',rule:'permit',target:'player'}]});assert.equal(result.ok,false);assert.match(result.reason,/violence|unprovoked/);
});
test('out of sight violence cannot enter Rowan knowledge or block support',()=>{
 const g=setup();Object.assign(g.encounters.actors.find(a=>a.id==='rowan'),{x:50,y:50});hit(g,'clover');hit(g,'mira');
 assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,0);assert.equal(g.simulation.state.actors.rowan.relationships.player,undefined);
 g.simulation.entity('rowan').location={kind:'ground',x:350,y:300,room:null};
 assert.equal(g.simulation.apply({actor:'rowan',ops:[{kind:'transform',entity:'rowan',rule:'permit',target:'player'}]}).ok,true);
});
test('throw and encounter callback share one committed injury; downed victims and Rowan cannot be farmed',()=>{
 const g=setup();g.encounters.actors.find(a=>a.id==='clover').hp=2;g.simulation.state.actors.clover.hp=2;g.simulation.entity('stone').location={kind:'held',actor:'player'};
 const action={actor:'player',ops:[{kind:'move',entity:'stone',x:460,y:300,style:'throw'}]};assert.equal(g.simulation.apply(action).ok,true);
 assert.equal(g.facts.length,1);assert.equal(g.facts[0].source,'throw');assert.equal(g.simulation.state.events.filter(e=>e.kind==='injury'&&e.target==='clover').length,1);assert.equal(g.simulation.state.behavior.incidents[0].origin.outcome,'defeat');
 g.simulation.entity('stone').location={kind:'held',actor:'player'};assert.equal(g.simulation.apply(action).ok,true);assert.equal(g.facts.length,1);
 hit(g,'rowan');assert.equal(g.facts.length,1);
});
test('saved incident and hostility resume without reclassifying retaliation as fresh aggression',()=>{
 const g=setup();hit(g,'clover');g.simulation.sync({player:g.player,actors:g.encounters.actors,hp:280});
 const saved=JSON.parse(JSON.stringify(g.simulation.state)),sim=new WorldSimulation({saved,mover:free});const restored=[];
 const encounters=new Encounters({actors:g.encounters.actors.map(a=>({...a,hp:a.maxHp})),mover:free,onCombat:fact=>{restored.push(fact);sim.recordCombat(fact);}});
 sim.restoreBindings({player:g.player,actors:encounters.actors,encounters});const clover=encounters.actors.find(a=>a.id==='clover');assert.equal(clover.hostile,true);encounters.hit(clover,100,{attackerPosition:g.player});
 assert.equal(restored[0].incidentId,g.facts[0].incidentId);assert.equal(restored[0].unprovoked,false);assert.equal(sim.state.behavior.incidents.length,1);
});
test('a sourced combat report carries only the reporter’s known incidents and can later affect Rowan',()=>{
 const g=setup();g.encounters.actors.find(a=>a.id==='rowan').x=50;g.encounters.actors.find(a=>a.id==='rowan').y=50;g.simulation.sync({player:g.player,actors:g.encounters.actors,hp:280});
 hit(g,'clover');hit(g,'mira');assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,0);
 const mira=g.encounters.actors.find(a=>a.id==='mira');mira.hostile=false;mira.x=350;mira.y=300;const rowan=g.encounters.actors.find(a=>a.id==='rowan');rowan.x=330;rowan.y=300;
 g.simulation.sync({player:g.player,actors:g.encounters.actors,hp:280});
 const evidence=g.simulation.view('mira').knownBehavior.facts.map(f=>f.eventId);
 const result=g.simulation.apply({actor:'mira',ops:[{kind:'emote',topic:'report',target:'rowan',text:'I saw the traveler attack two peaceful people.',evidence}]});assert.equal(result.ok,true,result.reason);
 const known=g.simulation.view('rowan').knownBehavior;assert.equal(known.traits[0].id,'aggressor');assert.equal(known.traits[0].knowledge,'reported');assert.ok(known.facts.every(f=>f.reporterId==='mira'));
});
test('combat perception uses current observer position and facing without a frame HP sync',()=>{
 const g=setup();const rowan=g.encounters.actors.find(a=>a.id==='rowan');rowan.x=50;rowan.y=50;hit(g,'clover');assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,0);
 rowan.x=350;rowan.y=300;rowan.direction='right';hit(g,'mira');assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,1);assert.equal(g.simulation.view('rowan').knownBehavior.traits.length,0);
});
test('hearing or seeing the victim without identifying the attacker never reveals global behavior',()=>{
 const g=setup();const rowan=g.encounters.actors.find(a=>a.id==='rowan');rowan.x=620;rowan.y=300;rowan.direction='left';
 hit(g,'clover');assert.ok(g.simulation.state.actors.rowan.memories.some(m=>m.kind==='injury'));assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,0);
});
test('committed combat immediately suspends model control and preserves a single incident across generated impacts',()=>{
 const g=setup();g.encounters.beginGenerated({style:'beam',damage:2,range:100,hits:3,color:'#edaa55'},'right',1000);
 for(let i=0;i<20;i++)g.encounters.step(50,g.player);
 assert.ok(g.facts.length>=3);assert.ok(g.facts.every(f=>f.source==='awakening'));
 const cloverFacts=g.facts.filter(f=>f.victimId==='clover');assert.equal(new Set(cloverFacts.map(f=>f.incidentId)).size,1);assert.equal(cloverFacts.filter(f=>f.unprovoked).length,1);
 assert.equal(g.simulation.canDecide('clover'),false);
});
test('an invalid action after a throw rolls back damage, facts and external combat',()=>{
 const g=setup();g.simulation.entity('stone').location={kind:'held',actor:'player'};const before=structuredClone(g.simulation.state);
 const result=g.simulation.apply({actor:'player',ops:[{kind:'move',entity:'stone',style:'throw',x:460,y:300},{kind:'transform',entity:'stone',rule:'eat'}]});
 assert.equal(result.ok,false);assert.deepEqual(g.simulation.state,before);assert.equal(g.facts.length,0);assert.equal(g.encounters.actors.find(a=>a.id==='clover').hp,90);
});
test('an explicitly confirmed later death changes known consequences without counting its victim twice',()=>{
 const g=setup();hit(g,'clover');const origin=g.facts[0];g.simulation.state.actors.player.permission=true;
 g.simulation.recordCombat({...origin,eventId:'confirmed-death',targetWasHostile:true,unprovoked:false,outcome:'death',hp:0});
 assert.equal(g.simulation.publicState().behaviorTraits[0].id,'killer');assert.equal(g.simulation.state.actors.player.permission,false);assert.equal(g.simulation.state.actors.rowan.relationships.player.trust,-1);
});
test('received combat reports can be relayed using their displayed fact or source citation without adding unseen incidents',()=>{
 const g=setup();Object.assign(g.encounters.actors.find(a=>a.id==='rowan'),{x:50,y:50});hit(g,'clover');hit(g,'mira');Object.assign(g.encounters.actors.find(a=>a.id==='rowan'),{x:330,y:300});g.simulation.sync({player:g.player,actors:g.encounters.actors,hp:280});
 const report=evidence=>({actor:'player',ops:[{kind:'emote',topic:'report',target:'rowan',text:'I attacked Clover.',evidence}]});
 assert.equal(g.simulation.apply(report([g.facts[0].eventId])).ok,true);assert.equal(g.simulation.view('rowan').knownBehavior.facts.length,1);
 g.simulation.registerActors([{id:'courier',name:'Courier',x:320,y:300,hp:100}]);
 for(const ref of [g.facts[0].eventId,g.simulation.view('rowan').knownBehavior.facts[0].sourceEventIds[0]]){
  const result=g.simulation.apply({actor:'rowan',ops:[{kind:'emote',topic:'report',target:'courier',text:'The traveler reported attacking Clover.',evidence:[ref]}]});assert.equal(result.ok,true,result.reason);
 }
 assert.deepEqual(g.simulation.view('courier').knownBehavior.facts.map(f=>f.victimId),['clover']);
});
