import test from 'node:test';
import assert from 'node:assert/strict';
import {worldScene,regionActorSpecs,resolveWorldPosition} from './region-world.js';
import {WorldSimulation} from './world-simulation.js';
const content={name:'Glasswood',seed:10,landmarks:[{x:8,y:8}],houses:[{name:'Glass House',kind:'home',resident:'Mara',greeting:'Welcome.',request:'Help the roads.',thanks:'Thank you.'},{name:'Pine House',kind:'home',resident:'Edda',greeting:'Hello.',request:'Clear the patrol.',thanks:'Good work.'}],enemies:[{name:'Glass Reaver',kind:'raider',hp:70,color:'#a65639',taunt:'Leave!'}]};
const mover=(p,dx,dy)=>({x:p.x+dx,y:p.y+dy});
test('scene IDs distinguish each region and identical house interiors while preserving hub saves',()=>{
 assert.equal(worldScene().sceneId,null);assert.equal(worldScene('0,0','inn').sceneId,'inn');
 const ids=[worldScene('1,0').sceneId,worldScene('2,0').sceneId,worldScene('1,0','home','house-0').sceneId,worldScene('1,0','home','house-1').sceneId,worldScene('2,0','home','house-0').sceneId];
 assert.equal(new Set(ids).size,5);assert.equal(worldScene('1,0','home','house-0').terrainRoom,'home');
});
test('generated enemy and resident identities are stable and contain actual encounter metadata',()=>{
 const specs=regionActorSpecs('1,0',content,{defeated:['foe-0']});
 assert.deepEqual(specs.map(a=>a.id),['1,0:foe-0','1,0:house-0:resident','1,0:house-1:resident']);
 assert.equal(specs[0].name,'Glass Reaver');assert.equal(specs[0].persistentDefeat,true);assert.equal(specs[0].enemy,true);
 assert.equal(specs[1].name,'Mara');assert.equal(specs[1].enemy,false);assert.equal(specs[1].x,510);assert.equal(specs[1].y,280);assert.notEqual(specs[1].sceneId,specs[2].sceneId);
 assert.deepEqual(regionActorSpecs('1,0',content),regionActorSpecs('1,0',structuredClone(content)));
});
test('registration preserves existing memories and health and perception never leaks across scenes',()=>{
 const sim=new WorldSimulation({mover}),specs=regionActorSpecs('1,0',content);sim.registerActors(specs);
 const resident=specs[1];sim.state.actors[resident.id].hp=42;sim.state.actors[resident.id].memories.push({id:'known',text:'We met.'});
 sim.registerActors(regionActorSpecs('1,0',content));assert.equal(sim.state.actors[resident.id].hp,42);assert.equal(sim.state.actors[resident.id].memories.length,1);
 sim.sync({player:{x:500,y:300,direction:'up'},room:'home',sceneId:resident.sceneId,regionId:'1,0',actors:[resident]});
 assert.deepEqual(sim.publicState().entities.filter(e=>e.kind==='actor').map(e=>e.id),['player',resident.id]);
 assert.equal(sim.view('player').entities.some(e=>e.id==='rowan'),false);assert.equal(sim.reactions().includes(specs[2].id),false);
});
test('scene-aware collision forwards the physical room and never an opaque scene ID',()=>{
 const rooms=[],sim=new WorldSimulation({mover:(p,dx,dy,room)=>{rooms.push(room);return mover(p,dx,dy)}}),specs=regionActorSpecs('1,0',content),resident=specs[1];sim.registerActors(specs);
 sim.sync({player:{x:500,y:300},room:'home',sceneId:resident.sceneId,regionId:'1,0',actors:[resident]});
 assert.equal(sim.apply({actor:'player',ops:[{kind:'move',entity:'player',x:504,y:300,style:'walk'}]}).ok,true);
 assert.ok(rooms.includes('home'));assert.ok(rooms.every(room=>room==='home'));assert.equal(sim.state.room,resident.sceneId);
});
test('restoring an active region preserves positions, residents and persistent defeat state',()=>{
 const sim=new WorldSimulation({mover}),specs=regionActorSpecs('1,0',content,{defeated:['foe-0']});sim.registerActors(specs);sim.state.entities[specs[1].id].location.x=522;sim.state.actors[specs[1].id].fatigue=65;
 const live=structuredClone(specs);sim.restoreActors(live);assert.equal(live[1].x,522);assert.equal(live[1].hp,100);assert.equal(live[0].hp,0);assert.equal(live[0].persistentDefeat,true);assert.equal(live[0].downUntil,Infinity);
 const wrong={...live[1],sceneId:worldScene('2,0','home','house-0').sceneId,x:1};sim.restoreActors([wrong]);assert.equal(wrong.x,1);
});
test('saved atlas location restores known houses and falls back safely for missing regions',()=>{
 const regions={'1,0':{content}},saved={regionId:'1,0',room:'home',houseId:'house-1',returnPoint:{x:600,y:430}};
 const restored=resolveWorldPosition(saved,regions);assert.equal(restored.regionId,'1,0');assert.equal(restored.houseId,'house-1');assert.equal(restored.sceneId,worldScene('1,0','home','house-1').sceneId);assert.deepEqual(restored.returnPoint,saved.returnPoint);
 assert.equal(resolveWorldPosition({...saved,regionId:'9,9'},regions).regionId,'0,0');assert.equal(resolveWorldPosition({room:'inn',returnPoint:{x:260,y:330}},regions).sceneId,'inn');
 assert.equal(resolveWorldPosition({...saved,houseId:'missing'},regions).terrainRoom,null);
});
test('a saved regional defeat reconciles an older actor snapshot without creating a new attack',()=>{
 const sim=new WorldSimulation({mover});sim.registerActors(regionActorSpecs('1,0',content));sim.registerActors(regionActorSpecs('1,0',content,{defeated:['foe-0']}));
 assert.equal(sim.state.actors['1,0:foe-0'].hp,0);assert.equal(sim.state.events.length,0);
});
test('reload restores the correct interior and coordinates without moving hub residents',()=>{
 const sim=new WorldSimulation({mover}),specs=regionActorSpecs('1,0',content),resident=specs[1];sim.registerActors(specs);sim.sync({player:{x:501,y:304},sceneId:resident.sceneId,regionId:'1,0',room:'home',actors:[resident]});
 const restored=new WorldSimulation({saved:JSON.parse(JSON.stringify(sim.state)),mover}),player={x:1,y:1},hub=[{id:'rowan',x:1,y:1,hp:100}],point=restored.restoreBindings({player,actors:hub});
 assert.deepEqual(player,{x:501,y:304});assert.equal(point.regionId,'1,0');assert.equal(point.sceneId,resident.sceneId);assert.equal(point.room,'home');assert.equal(hub[0].x,268);
 assert.equal(restored.publicState().entities.some(e=>e.id==='rowan'),false);
});
