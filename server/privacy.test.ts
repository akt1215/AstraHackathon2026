import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Coordinator, type Runtime } from './coordinator';
import { SessionStore } from './store';
import { createWorld } from '../shared/engine';

describe('HTTP turn event projection',()=>{
 it('returns the same redacted heard event in the action receipt as the public state',async()=>{
  const path=join(mkdtempSync(join(tmpdir(),'astra-privacy-')),'session.json');
  const world=createWorld();
  world.entities.guard.location={kind:'ground',x:5,y:4};world.actors.player.facing='west';
  world.actors.companion.wakefulness='asleep';
  new SessionStore(path).save(world);
  const runtime:Runtime={info:()=>({provider:'offline',available:false,model:'test',label:'test'}),interpret:async()=>{throw Error('unused');},decide:async(view)=>({provider:'test',latencyMs:0,decision:{explanation:'A nearby voice.',action:{actor:view.actor.id,intent:'Speak',ops:[{kind:'emote',topic:'talk',text:'Is someone there?'}]}}})};
  const coordinator=new Coordinator(path,runtime);
  const req={worldId:world.id,requestId:'redaction',version:world.version,direct:{kind:'wait' as const}};
  const result=await coordinator.act(req);
  const heard=result.state.events.find(e=>e.kind==='speech_heard');
  expect(heard).toBeDefined();expect(heard!.actor).toBe('unknown');
  expect(result.events.find(e=>e.id===heard!.id)).toEqual(heard);
  expect(result.events.every(e=>e.witnesses.length===0&&e.data===undefined)).toBe(true);
 });
});
