import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { createWorld, resolveAction, beginTick, finishTick, actorView, publicState, directAction, fallbackAction } from '../shared/engine';
import type { World, ModelResult, ActorView, ProviderInfo, DirectIntent, ActionResponse, PublicState, WorldEvent } from '../shared/types';
import { SessionStore } from './store';
import { initializeAwareness, scheduleReactions, followAction, acknowledgeCondition } from './reactions';
import { characterSchema, type CharacterRequest } from '../shared/appearance';

export interface Runtime {
  info(): ProviderInfo;
  interpret(view:ActorView,input:string):Promise<ModelResult>;
  decide(view:ActorView):Promise<ModelResult>;
}
export interface ActionRequest {requestId:string;worldId:string;version:number;input?:string;direct?:DirectIntent;}
export class RequestError extends Error { constructor(message:string,readonly status=400){super(message);} }

function requestFingerprint(request:ActionRequest):string {
  const payload=request.direct ? {direct:Object.fromEntries(Object.entries(request.direct).sort(([a],[b])=>a.localeCompare(b)))} : {input:request.input};
  return createHash('sha256').update(JSON.stringify({worldId:request.worldId,version:request.version,...payload})).digest('hex');
}

export class Coordinator {
  private world: World;
  private busy=false;
  private store: SessionStore;
  constructor(path:string,private runtime:Runtime) {
    this.store=new SessionStore(path);
    this.world=initializeAwareness(this.store.load() ?? createWorld());
    this.store.save(this.world);
  }
  state():PublicState {return publicState(this.world,this.busy);}
  info():ProviderInfo {return this.runtime.info();}
  private commit(next:World):void {this.store.save(next);this.world=next;}
  save():void {this.store.save(this.world);}
  newWorld(variant:'baseline'|'tired'|'asleep'='baseline'):PublicState {
    if(this.busy) throw new RequestError('The current action is still resolving.',409);
    const next=initializeAwareness(createWorld(variant));
    next.entities.player.name=this.world.entities.player.name;
    if(this.world.actors.player.appearance) next.actors.player.appearance=structuredClone(this.world.actors.player.appearance);
    this.commit(next); return this.state();
  }
  updateCharacter(request:CharacterRequest):PublicState {
    const draft=characterSchema.parse(request);
    if(draft.worldId!==this.world.id) throw new RequestError('That appearance belongs to a previous story.',409);
    if(this.busy || this.world.phase && !this.world.phase.finalized) throw new RequestError('Finish the current action before changing your appearance.',409);
    if(draft.version!==this.world.version) throw new RequestError('The world has changed. Review it before saving your appearance.',409);
    const next=structuredClone(this.world);
    next.entities.player.name=draft.name;
    next.actors.player.appearance=draft.appearance;
    next.version++;
    this.commit(next);
    return this.state();
  }
  async recover():Promise<void> {
    if(!this.world.phase || this.world.phase.finalized || this.busy) return;
    this.busy=true;
    try{await this.react();}finally{this.busy=false;}
  }
  async act(req:ActionRequest):Promise<ActionResponse> {
    if(req.worldId!==this.world.id) throw new RequestError('That action belongs to a previous story. Review the current world before acting.',409);
    if(this.busy) throw new RequestError('The world is still responding to your last action.',409);
    const prior=Object.hasOwn(this.world.receipts,req.requestId) ? this.world.receipts[req.requestId] : undefined;
    const fingerprint=requestFingerprint(req);
    if(prior) {
      // Old saved receipts have no payload hash. Preserve their retry semantics;
      // every newly accepted request is bound to its original content.
      if(prior.fingerprint && prior.fingerprint!==fingerprint) throw new RequestError('That request ID was already used for a different action.',409);
      await this.recover();
      return {state:this.state(),ok:prior.ok,message:prior.reason ?? 'That action is already recorded.',source:'saved',timing:{interpretationMs:0,reactionMs:0,totalMs:0},events:[]};
    }
    if(req.version!==this.world.version) throw new RequestError('The world has changed. Review it and try again.',409);
    if(this.world.phase && !this.world.phase.finalized) {await this.recover();throw new RequestError('An interrupted turn was recovered. Review the world before acting.',409);}
    if(this.world.objective.status!=='active') throw new RequestError('This chapter has ended. Begin another story to continue.',409);
    this.busy=true;
    const start=performance.now();
    let interpretationMs=0,source='direct';
    const eventStart=this.world.events.length;
    try {
      let action;
      if(req.direct) action=directAction(this.world,req.direct);
      else {
        const result=await this.runtime.interpret(actorView(this.world,'player'),req.input!);
        interpretationMs=result.latencyMs;source=result.provider;action=result.decision.action;
      }
      if(action.actor!=='player') throw new RequestError('That interpretation tried to control another character. Please rephrase.');
      const result=resolveAction(this.world,action);
      if(!result.ok) return {ok:false,state:publicState(this.world,false),message:result.reason ?? 'That action cannot happen here.',source,timing:{interpretationMs,reactionMs:0,totalMs:Math.round(performance.now()-start)},events:[]};
      const walking=action.ops.every(op=>op.kind==='move'&&op.entity==='player'&&(op.style==='walk'||op.style==='approach'));
      const inspecting=action.ops.every(op=>op.kind==='transform'&&op.rule==='inspect');
      let next=scheduleReactions(beginTick(result.world),walking||inspecting);
      if(walking){
        for(const actor of Object.values(next.actors)){
          if(actor.role!=='npc'||next.phase!.slots.includes(actor.id))continue;
          const follow=followAction(next,actor.id);
          if(follow){const step=resolveAction(next,follow);if(step.ok)next=step.world;}
        }
      }
      next.receipts={...next.receipts,[req.requestId]:{ok:true,version:next.version,fingerprint}};
      this.commit(next);
      const reactionStart=performance.now();
      const usedFallback=await this.react();
      if(usedFallback) source+=' · NPC fallback';
      const events=this.visibleNewEvents(eventStart);
      return {ok:true,state:publicState(this.world,false),message:result.events.map(e=>e.text).join(' ') || 'You wait and watch.',source,
        timing:{interpretationMs,reactionMs:Math.round(performance.now()-reactionStart),totalMs:Math.round(performance.now()-start)},events};
    } finally {this.busy=false;}
  }
  private visibleNewEvents(from:number):WorldEvent[] {
    const newIds=new Set(this.world.events.slice(from).map(e=>e.id));
    return publicState(this.world).events.filter(e=>newIds.has(e.id));
  }
  private async react():Promise<boolean> {
    const phase=this.world.phase;
    if(!phase || phase.finalized) return false;
    const batch=phase.batch;
    if(!phase.plans) {
      if(phase.completed.length) throw new Error('Interrupted NPC phase has completed slots but no saved plans. Preserve this save and begin a new encounter.');
      const snapshot=structuredClone(this.world);
      const results=await Promise.allSettled(phase.slots.map(id=>this.runtime.decide(actorView(snapshot,id))));
      if(this.world.phase?.batch!==batch) throw new Error('The NPC decision batch changed before it could be saved.');
      const next=structuredClone(this.world);
      next.phase!.plans=Object.fromEntries(phase.slots.map((id,i)=>{
        const result=results[i];
        return [id,result.status==='fulfilled' && result.value.decision.action.actor===id
          ? {action:result.value.decision.action,fallback:false}
          : {action:fallbackAction(snapshot,id),fallback:true}];
      }));
      // No slot may observe consequences from this batch until every original plan
      // is durable. A crash during inference retries from the unchanged snapshot.
      this.commit(next);
    }
    let usedFallback=Object.values(this.world.phase!.plans!).some(plan=>plan.fallback);
    for(const id of phase.slots) {
      if(this.world.phase?.batch!==batch || this.world.phase.completed.includes(id)) continue;
      const plan=this.world.phase.plans?.[id];
      if(!plan || plan.action.actor!==id) throw new Error('Saved NPC phase has a missing or mismatched actor plan.');
      // Physical validation uses current state, but a preceding report cannot cause
      // the next slot to replan from knowledge absent when the batch was chosen.
      let resolved=resolveAction(this.world,plan.action);
      let fallback=plan.fallback;
      if(!resolved.ok && !fallback) {
        fallback=true;
        resolved=resolveAction(this.world,fallbackAction(this.world,id));
      }
      const next=resolved.ok ? resolved.world : structuredClone(this.world);
      if(fallback) {usedFallback=true;next.phase!.plans![id].fallback=true;}
      next.phase!.completed.push(id);
      acknowledgeCondition(next,id);
      this.commit(next);
    }
    this.commit(finishTick(this.world));
    return usedFallback;
  }
}
