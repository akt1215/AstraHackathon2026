import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasViewport,clientToWorld,entitiesInViewport,entityPosition,playerViewForViewport} from './world-viewport.js';

const entity=(id,x,y,room=null)=>({id,kind:'actor',location:{kind:'ground',x,y,room}});
test('mobile cover crop excludes off-screen characters and includes the visible far edge',()=>{
 const view=canvasViewport({bounds:{left:0,top:0,width:390,height:844},position:{x:400,y:300},viewport:{width:390,height:844}});
 const entities=[entity('near',400,300),entity('cropped',150,300),entity('far-edge',530,300),entity('other-room',400,300,'inn')];
 assert.deepEqual(entitiesInViewport(entities,view,null).map(e=>e.id),['near','far-edge']);
 assert.ok(Math.abs(view.left-261.3744075829384)<.001);
 const center=clientToWorld({x:195,y:422},view);assert.ok(Math.abs(center.x-400)<.001);assert.equal(center.y,300);
});
test('desktop includes every displayed entity without a proximity count limit',()=>{
 const view=canvasViewport({bounds:{left:0,top:0,width:1200,height:900},position:{x:400,y:300},viewport:{width:1200,height:900}});
 const entities=Array.from({length:12},(_,i)=>entity(`person-${i}`,20+i*65,550));
 assert.equal(entitiesInViewport(entities,view,null).length,12);
});
test('window clipping and player-anchored object position share the click mapping',()=>{
 const view=canvasViewport({bounds:{left:0,top:-100,width:800,height:600},position:{x:100,y:100},viewport:{width:800,height:400}});
 assert.equal(view.top,100);assert.equal(view.bottom,500);
 assert.deepEqual(clientToWorld({x:350,y:250},view),{x:350,y:350});
 assert.equal(clientToWorld({x:350,y:450},view),null);
 const shifted=canvasViewport({bounds:{left:0,top:0,width:300,height:600},position:{x:160,y:300},viewport:{width:300,height:600}});
 assert.equal(shifted.left,100);assert.deepEqual(clientToWorld({x:60,y:300},shifted),{x:160,y:300});
});
test('a partially drawn sprite remains visible while held and contained items stay separate',()=>{
 const view=canvasViewport({bounds:{left:0,top:0,width:300,height:600},position:{x:400,y:300},viewport:{width:300,height:600}});
 const items=[entity('edge',245,300),entity('outside',230,300),{id:'held',location:{kind:'held',actor:'player'}},{id:'note',location:{kind:'contained',container:'chest'}}];
 assert.deepEqual(entitiesInViewport(items,view,null,()=>({left:-10,right:10,top:-10,bottom:5})).map(e=>e.id),['edge']);
});
test('contained contents use the container location for direct-action range without appearing on the floor',()=>{
 const chest=entity('chest',270,370,'inn'),note={id:'note',location:{kind:'contained',container:'chest'}};
 assert.deepEqual(entityPosition(note,[chest,note],{x:1,y:2}),{x:270,y:370,room:'inn'});
 assert.equal(entityPosition(note,[{...chest,location:{kind:'contained',container:'note'}},note],{x:1,y:2}),null);
});
test('player proposal includes displayed entities and accessible contents, while preserving its own knowledge',()=>{
 const view=canvasViewport({bounds:{left:0,top:0,width:300,height:600},position:{x:400,y:300},viewport:{width:300,height:600}});
 const self=entity('player',400,300),chest={...entity('chest',450,300),kind:'fixture',props:{container:true,open:true}};
 const state={room:null,entities:[self,chest,entity('far-edge',530,300),entity('cropped',100,300),entity('other-room',400,300,'inn'),{id:'held',location:{kind:'held',actor:'player'}},{id:'note',location:{kind:'contained',container:'chest'}},{id:'private',location:{kind:'held',actor:'rowan'}}]};
 const base={actor:{id:'player',memories:[{text:'I saw this.'}]},self,entities:[self],knownIssues:[],width:800,height:600};
 const projected=playerViewForViewport(base,state,view);
 assert.deepEqual(projected.entities.map(e=>e.id),['player','chest','far-edge','held','note']);
 assert.deepEqual(projected.actor,base.actor);assert.equal(projected.entities.some(e=>e.actor),false);
 assert.deepEqual(base.entities,[self]);
});
