import { describe,it,expect,vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Coordinator, type Runtime } from './coordinator';
import { SessionStore } from './store';
import { createWorld, resolveAction } from '../shared/engine';
import type { World } from '../shared/types';
const at=(w:World,id:string,x:number,y:number)=>{w.entities[id].location={kind:'ground',x,y};};
function setup(world=createWorld()){
 const path=join(mkdtempSync(join(tmpdir(),'astra-walking-')),'save.json');new SessionStore(path).save(world);
 const decide=vi.fn<Runtime['decide']>(async v=>({provider:'test',latencyMs:0,decision:{explanation:'Keep watch.',action:{actor:v.actor.id,intent:'Wait',ops:[{kind:'transform',entity:v.actor.id,rule:'rest'}]}}}));
 const runtime:Runtime={info:()=>({provider:'claude-cli',model:'test',available:true,label:'test'}),interpret:vi.fn(),decide};
 const c=new Coordinator(path,runtime);
 const walk=async(x:number,y:number,target=c)=>target.act({requestId:crypto.randomUUID(),worldId:target.state().id,version:target.state().version,direct:{kind:'move',x,y}});
 return {c,walk,decide,path,runtime};
}
describe('walking reaction cadence',()=>{
 it('walks without invoking any model while nobody newly notices anything',async()=>{
  const {c,walk,decide}=setup();const before=c.state();const result=await walk(3,4);
  expect(result.ok).toBe(true);expect(result.state.entities.find(e=>e.id==='player')!.location).toEqual({kind:'ground',x:3,y:4});
  expect(result.state.tick).toBe(before.tick+1);expect(decide).not.toHaveBeenCalled();
 });
 it('calls only the guard on first sight, then never for repeated ordinary visible steps or reload',async()=>{
  const {c,walk,decide,path,runtime}=setup();await walk(3,4);await walk(4,4);
  expect(decide.mock.calls.map(([v])=>v.actor.id)).toEqual(['guard']);
  await walk(5,4);await walk(4,4);await walk(3,4);await walk(4,4);
  expect(decide).toHaveBeenCalledTimes(1);
  const reload=new Coordinator(path,runtime);await walk(5,4,reload);expect(decide).toHaveBeenCalledTimes(1);
  expect(reload.state().tick).toBe(c.state().tick+1);
 });
 it('reacts once to first sight gained by turning during its previous decision',async()=>{
  const w=createWorld();at(w,'player',6,4);w.actors.guard.facing='east';
  const {c,walk,decide}=setup(w);
  decide.mockImplementationOnce(async v=>({provider:'test',latencyMs:0,decision:{explanation:'Wait',action:{actor:v.actor.id,intent:'Wait',ops:[{kind:'transform',entity:v.actor.id,rule:'rest'}]}}}));
  decide.mockImplementationOnce(async v=>({provider:'test',latencyMs:0,decision:{explanation:'Turn west',action:{actor:v.actor.id,intent:'Look',ops:[{kind:'transform',entity:v.actor.id,rule:'look',x:5,y:5}]}}}));
  await c.act({requestId:'turn-around',worldId:c.state().id,version:c.state().version,direct:{kind:'wait'}});
  decide.mockClear();await walk(7,4);
  expect(decide.mock.calls.map(([v])=>v.actor.id)).toEqual(['guard']);
  await walk(8,4);expect(decide).toHaveBeenCalledTimes(1);
 });
 it('keeps unseen movement and sleeping guards free of model calls',async()=>{
  const w=createWorld('asleep');w.actors.companion.wakefulness='asleep';const {walk,decide}=setup(w);
  await walk(3,4);await walk(4,4);await walk(5,4);expect(decide).not.toHaveBeenCalled();
 });
 it('continues an accepted follow decision locally without walking through walls or occupied cells',async()=>{
  const w=createWorld('asleep');at(w,'guard',12,7);at(w,'companion',2,5);w.actors.companion.facing='north';w.actors.companion.following='player';
  const {walk,decide,path,runtime}=setup(w);const r=await walk(3,4);
  expect(r.state.entities.find(e=>e.id==='companion')!.location).toEqual({kind:'ground',x:3,y:5});expect(decide).not.toHaveBeenCalled();
  const reload=new Coordinator(path,runtime);const r2=await walk(4,4,reload);
  expect(r2.state.entities.find(e=>e.id==='companion')!.location).toEqual({kind:'ground',x:4,y:5});expect(decide).not.toHaveBeenCalled();
 });
 it('does not give a follower the player’s current hidden location',async()=>{
  const w=createWorld('asleep');w.actors.companion.following='player';w.actors.companion.facing='east';
  const {walk,decide}=setup(w);const r=await walk(1,4);
  expect(r.state.entities.find(e=>e.id==='companion')!.location).toEqual(w.entities.companion.location);expect(decide).not.toHaveBeenCalled();
 });
 it('responds to an unprocessed sourced report on the next walk, exactly once',async()=>{
  const initial=createWorld();initial.actors.guard.relationships.player={trust:0,fear:0};
  const {path,runtime,decide,walk}=setup(initial);const store=new SessionStore(path);let w=store.load()!;
  at(w,'player',4,5);w.actors.guard.facing='east';
  let r=resolveAction(w,{actor:'player',intent:'Take',ops:[{kind:'transfer',entity:'medicine',to:'player'}]});expect(r.ok).toBe(true);w=r.world;
  at(w,'companion',9,5);w.actors.guard.facing='west';
  const obs=w.actors.companion.memories.find(o=>o.kind==='take')!;
  r=resolveAction(w,{actor:'companion',intent:'Report',ops:[{kind:'emote',topic:'report',text:'I saw the taking.',target:'guard',evidence:[obs.id]}]});expect(r.ok).toBe(true);
  store.save(r.world);const reload=new Coordinator(path,runtime);await walk(4,4,reload);
  expect(decide.mock.calls.some(([v])=>v.actor.id==='guard'&&v.knownIssues.length===1)).toBe(true);
  const count=decide.mock.calls.filter(([v])=>v.actor.id==='guard').length;await walk(5,4,reload);
  expect(decide.mock.calls.filter(([v])=>v.actor.id==='guard')).toHaveLength(count);
 });
});

describe('significant walking interruptions',()=>{
 it('gives an already familiar guard one new decision on entering the guarded threshold',async()=>{
  const w=createWorld();at(w,'player',7,4);const {walk,decide}=setup(w);
  await walk(8,4);expect(decide).not.toHaveBeenCalled();
  await walk(9,4);expect(decide.mock.calls.map(([v])=>v.actor.id)).toEqual(['guard']);
  await walk(10,4);expect(decide).toHaveBeenCalledTimes(1);
 });
 it('does not lose a heard impact just because the next player action is walking',async()=>{
  const w=createWorld();at(w,'player',7,4);w.actors.guard.facing='east';w.entities.key.location={kind:'held',actor:'player'};
  const {path,runtime,decide,walk}=setup(w);const store=new SessionStore(path);
  const r=resolveAction(store.load()!,{actor:'player',intent:'A quiet impact behind the keeper',ops:[{kind:'move',entity:'key',x:9,y:4,style:'throw'}]});expect(r.ok).toBe(true);
  store.save(r.world);const reload=new Coordinator(path,runtime);await walk(7,3,reload);
  expect(decide.mock.calls.some(([v])=>v.actor.id==='guard'&&v.observations.some(o=>o.kind==='noise_heard'))).toBe(true);
 });
 it('keeps a follower outside a closed gate even with a remembered leader beyond it',async()=>{
  const w=createWorld('asleep');at(w,'player',12,4);at(w,'companion',10,4);w.actors.companion.facing='east';w.actors.companion.following='player';
  w.actors.companion.memories.push({id:'earlier-voice',eventId:'earlier-voice',tick:0,kind:'speech_heard',actor:'player',text:'Come here.',location:{x:12,y:4},lineage:['earlier-voice']});
  const {walk,decide}=setup(w);const r=await walk(12,3);
  expect(r.state.entities.find(e=>e.id==='companion')!.location).toEqual({kind:'ground',x:10,y:4});
  expect(decide).not.toHaveBeenCalled();
 });
});
