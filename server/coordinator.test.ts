import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Coordinator } from './coordinator';
import { SessionStore } from './store';
import type { World, ModelResult, ActorView } from '../shared/types';

const result = (view: ActorView): ModelResult => ({ decision: { action: { actor: view.actor.id, intent: 'Hold position', ops: [{kind:'emote', text:'I keep watch.',topic:'talk'}] }, explanation: 'Holding position.' }, latencyMs: 1, provider:'test' });
const runtime = () => ({ info:()=>({provider:'offline' as const,model:'test',available:false,label:'Test runtime'}), interpret:vi.fn(), decide:vi.fn(async(view:ActorView)=>result(view)) });
const setup=()=> { const dir=mkdtempSync(join(tmpdir(),'astra-store-')); const model=runtime(); return {dir,model, coordinator:new Coordinator(join(dir,'session.json'),model)}; };
describe('authoritative coordinator',()=> {
 it('rejects a delayed action from a previous run even when the new version matches',async()=>{
  const {coordinator:c,model}=setup();const before=c.state();
  const delayed={requestId:'previous-run',worldId:before.id,version:before.version,direct:{kind:'wait' as const}};
  c.newWorld();const fresh=c.state();
  expect(fresh.id).not.toBe(before.id);expect(fresh.version).toBe(before.version);
  await expect(c.act(delayed)).rejects.toThrow(/story|world|run/i);
  expect(c.state()).toEqual(fresh);expect(model.decide).not.toHaveBeenCalled();
 });
 it('recovers a lost action response using its original identity without a second move',async()=>{
  const {coordinator:c,model}=setup();const before=c.state();
  const request={requestId:'lost-response',worldId:before.id,version:before.version,direct:{kind:'move' as const,x:3,y:4}};
  await c.act(request); // The server commits, but the browser does not receive this response.
  const committed=c.state();const decisions=model.decide.mock.calls.length;
  const recovered=await c.act(request);
  expect(recovered.source).toBe('saved');expect(recovered.state).toEqual(committed);
  expect(recovered.state.events.filter(e=>e.kind==='move'&&e.actor==='player')).toHaveLength(1);
  expect(model.decide).toHaveBeenCalledTimes(decisions);
 });
 it('persists an accepted action, deduplicates retry before stale-version validation',async()=>{
  const {coordinator:c,dir,model}=setup(); const before=c.state();
  const req={requestId:'retry-1',worldId:before.id,version:before.version,direct:{kind:'wait' as const}};
  const first=await c.act(req); const calls=model.decide.mock.calls.length;
  const again=await c.act(req);
  expect(first.ok).toBe(true); expect(again.state.version).toBe(first.state.version);
  expect(again.state.tick).toBe(first.state.tick); expect(model.decide).toHaveBeenCalledTimes(calls);
  const disk=JSON.parse(readFileSync(join(dir,'session.json'),'utf8'));
  expect(disk.receipts['retry-1'].ok).toBe(true); expect(disk.phase.finalized).toBe(true);
 });
 it('rejects stale requests before interpreting or changing state',async()=>{
  const {coordinator:c,model}=setup(); const before=c.state();
  await expect(c.act({requestId:'stale',worldId:before.id,version:before.version-1,input:'anything'})).rejects.toThrow(/changed|version|stale/i);
  expect(model.interpret).not.toHaveBeenCalled(); expect(c.state().version).toBe(before.version);
 });
 it('retains the world when free text has no live interpretation',async()=>{
  const {coordinator:c,model}=setup(); model.interpret.mockRejectedValue(new Error('Provider unavailable'));
  const before=c.state(); await expect(c.act({requestId:'offline',worldId:before.id,version:before.version,input:'Juggle the vase'})).rejects.toThrow('Provider unavailable');
  expect(c.state()).toEqual(before);
 });
 it('does not roll back an accepted player action when an NPC provider fails',async()=>{
  const {coordinator:c,model}=setup(); model.decide.mockRejectedValue(new Error('timeout'));
  const before=c.state(); const r=await c.act({requestId:'npc-failure',worldId:before.id,version:before.version,direct:{kind:'wait'}});
  expect(r.ok).toBe(true); expect(r.state.tick).toBe(before.tick+1); expect(r.source).toContain('fallback');
 });
 it('loads the committed world rather than replacing it on restart',async()=>{
  const {coordinator:c,model,dir}=setup(); await c.act({requestId:'saved',worldId:c.state().id,version:c.state().version,direct:{kind:'wait'}});
  const copy=new Coordinator(join(dir,'session.json'),model);
  expect(copy.state()).toEqual(c.state());
 });
});

describe('interrupted NPC batches',()=> {
 it('persists all original plans before applying slots and resumes without a new decision',async()=>{
  const {coordinator:c,model,dir}=setup();
  model.decide.mockImplementation(async(view:ActorView)=>({ ...result(view), decision:{...result(view).decision, action:{ actor:view.actor.id,intent:'Original batch choice',ops:[{kind:'emote',text:`Original ${view.actor.id} choice`,topic:'talk'}]}}}));
  const original=SessionStore.prototype.save;
  let plansSavedBeforeFirstSlot=false;
  const save=vi.spyOn(SessionStore.prototype,'save').mockImplementation(function(this:SessionStore,world:World){
    if(world.phase?.completed.length===1) {
      const previous=JSON.parse(readFileSync(this.path,'utf8')) as World;
      plansSavedBeforeFirstSlot=Boolean(previous.phase?.completed.length===0 && previous.phase.plans?.guard && previous.phase.plans.companion);
    }
    original.call(this,world);
    if(world.phase?.completed.length===1) throw new Error('simulated crash after first slot persisted');
  });
  await expect(c.act({requestId:'crash',worldId:c.state().id,version:c.state().version,direct:{kind:'wait'}})).rejects.toThrow('simulated crash');
  save.mockRestore();
  const saved=JSON.parse(readFileSync(join(dir,'session.json'),'utf8')) as World;
  expect(plansSavedBeforeFirstSlot).toBe(true);
  expect(Object.keys(saved.phase?.plans ?? {}).sort()).toEqual(['companion','guard']);
  const resumedRuntime=runtime();
  resumedRuntime.decide.mockRejectedValue(new Error('A stored batch must never replan'));
  const resumed=new Coordinator(join(dir,'session.json'),resumedRuntime);
  await resumed.recover();
  expect(resumedRuntime.decide).not.toHaveBeenCalled();
  const after=JSON.parse(readFileSync(join(dir,'session.json'),'utf8')) as World;
  expect(after.events.filter(e=>e.kind==='speech'&&e.text.includes('Original companion choice'))).toHaveLength(1);
  expect(after.events.filter(e=>e.kind==='speech'&&e.text.includes('Original guard choice'))).toHaveLength(1);
  expect(after.phase?.completed.sort()).toEqual(['companion','guard']);
  expect(after.phase?.finalized).toBe(true);
  const version=after.version;await resumed.recover();expect(resumed.state().version).toBe(version);
 });
 it('really applies a safe fallback after a physically rejected NPC decision',async()=>{
  const {coordinator:c,model,dir}=setup();
  model.decide.mockImplementation(async(view:ActorView)=>({ ...result(view),decision:{...result(view).decision,action:{actor:view.actor.id,intent:'Invalid long walk',ops:[{kind:'move',entity:view.actor.id,x:0,y:0,style:'walk'}]}}}));
  const response=await c.act({requestId:'invalid-npc',worldId:c.state().id,version:c.state().version,direct:{kind:'wait'}});
  expect(response.source).toContain('fallback');
  const saved=JSON.parse(readFileSync(join(dir,'session.json'),'utf8')) as World;
  for(const id of ['guard','companion']) expect(saved.events.filter(e=>e.actor===id&&e.kind==='rest')).toHaveLength(1);
 });
 it('does not finalize or replay slots after a crash just before finalization',async()=>{
  const {coordinator:c,dir}=setup();const original=SessionStore.prototype.save;
  const save=vi.spyOn(SessionStore.prototype,'save').mockImplementation(function(this:SessionStore,world:World){
    if(world.phase?.finalized) throw new Error('crash before finalization'); original.call(this,world);
  });
  await expect(c.act({requestId:'before-finish',worldId:c.state().id,version:c.state().version,direct:{kind:'wait'}})).rejects.toThrow('crash before finalization');save.mockRestore();
  const model=runtime();const resumed=new Coordinator(join(dir,'session.json'),model);
  await resumed.recover();expect(model.decide).not.toHaveBeenCalled();
  const saved=JSON.parse(readFileSync(join(dir,'session.json'),'utf8')) as World;
  expect(saved.events.filter(e=>e.kind==='speech')).toHaveLength(2);
  expect(saved.phase?.finalized).toBe(true);expect(saved.tick).toBe(1);
 });
});

describe('receipt and saved-phase validation',()=> {
 it('treats prototype-like request IDs as ordinary deduplicated commands',async()=>{
  const {coordinator:c,dir}=setup();
  for(const requestId of ['toString','__proto__']) {
    const request={requestId,worldId:c.state().id,version:c.state().version,direct:{kind:'wait' as const}};
    const first=await c.act(request);expect(first.ok).toBe(true);expect(first.state.tick).toBeGreaterThan(0);
    const again=await c.act(request);expect(again.state.tick).toBe(first.state.tick);
    const disk=JSON.parse(readFileSync(join(dir,'session.json'),'utf8')) as World;
    expect(Object.hasOwn(disk.receipts,requestId)).toBe(true);
  }
 });
 it('rejects a corrupted completed-slot list before loading it as a valid world',()=>{
  const {coordinator:c,dir}=setup();const store=new SessionStore(join(dir,'session.json'));
  const world=store.load()!;world.phase={batch:'invalid',tick:world.tick,slots:['guard'],completed:['player'],finalized:false};
  store.save(world);
  expect(()=>new Coordinator(join(dir,'session.json'),runtime())).toThrow(/format|phase/i);
 });
});
