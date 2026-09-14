import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRuntime} from './runtime.js';
import {initialCharacterMemory,observeCharacterEvent,restoreCharacterMemory,rowanGoal,rowanWaypoint,rowanConversation,ROWAN_HOME,ROWAN_RETREAT} from './character-memory.js';
import {drawVolcanic} from '../volcanic.js';
import {advance,canStand} from '../world.js';
import {nextGuidance} from './quest-guidance.js';
const combo = {id:'event-1',type:'combo_learned',target:'Cinder Cleave'};
const nearby = {player:{x:270,y:250},rowan:ROWAN_HOME,room:null};
test('only a nearby witnessed combo changes Rowan behavior and later speech',()=>{
  const result=observeCharacterEvent(initialCharacterMemory(),combo,nearby);
  assert.deepEqual(rowanGoal(result.memory),ROWAN_RETREAT);
  assert.deepEqual(nextGuidance({quests:[],jobs:[]},{x:400,y:335},null,ROWAN_RETREAT).target,ROWAN_RETREAT);
  assert.deepEqual(rowanConversation(result.memory)[0].sourceEventIds,['event-1']);
  assert.equal(result.lines.length,2);
  assert.equal(initialCharacterMemory().facts.length,0);
});
test('distant or indoor actions cannot become Rowan witness memories',()=>{
  for(const context of [{...nearby,room:'inn'},{...nearby,player:{x:500,y:500}}]) {
    const result=observeCharacterEvent(initialCharacterMemory(),combo,context);
    assert.equal(result.memory.facts.length,0);
    assert.deepEqual(rowanGoal(result.memory),ROWAN_HOME);
  }
});
test('a repeated combo is deduplicated without losing its first causal event',()=>{
  const first=observeCharacterEvent(initialCharacterMemory(),combo,nearby);
  const second=observeCharacterEvent(first.memory,{...combo,id:'event-2'},nearby);
  assert.equal(second.memory.facts.length,1);
  assert.equal(second.memory.facts[0].sourceEventId,'event-1');
  assert.equal(second.lines.length,0);
});
test('room thoughts are grounded and shown once; revisits still reach Tilth normally',()=>{
  const event={id:'visit-1',type:'room_entered',target:'smith'};
  const first=observeCharacterEvent(initialCharacterMemory(),event,nearby);
  assert.equal(first.lines[0].thought,true);
  assert.deepEqual(rowanConversation(first.memory)[0].sourceEventIds,['visit-1']);
  assert.equal(observeCharacterEvent(first.memory,{...event,id:'visit-2'},nearby).lines.length,0);
});
test('restored memories require matching ledger evidence and survive existing saves',()=>{
  const memory=observeCharacterEvent(initialCharacterMemory(),combo,nearby).memory;
  assert.deepEqual(rowanGoal(restoreCharacterMemory(memory,[combo])),ROWAN_RETREAT);
  assert.deepEqual(rowanGoal(restoreCharacterMemory(memory,[])),ROWAN_HOME);
  let saved; const storage={getItem:()=>saved,setItem:(key,value)=>{saved=value}};
  const runtime=new GameRuntime({storage});
  runtime.state.events.push(combo); runtime.state.characterMemory=memory; runtime.changed();
  assert.deepEqual(rowanGoal(new GameRuntime({storage}).state.characterMemory),ROWAN_RETREAT);
  assert.equal(new GameRuntime().state.characterMemory.facts.length,0);
});
test('Rowan can reach his retreat through the actual rendered fence geometry',()=>{
  const ctx=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(800*600*4)}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
  drawVolcanic(ctx);
  const memory=observeCharacterEvent(initialCharacterMemory(),combo,nearby).memory;
  let position={...ROWAN_HOME};
  for(let i=0;i<120;i++){
    const goal=rowanWaypoint(memory,position),dx=goal.x-position.x,dy=goal.y-position.y,distance=Math.hypot(dx,dy);
    if(distance>.2){const step=Math.min(distance,70/60);position=advance(position,dx/distance*step,dy/distance*step);}
    assert.equal(canStand(position.x,position.y),true);
  }
  assert.ok(Math.hypot(position.x-ROWAN_RETREAT.x,position.y-ROWAN_RETREAT.y)<.3);
});
