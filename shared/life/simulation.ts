import type { ActivityKind, LifeActivity, LifeCommandEnvelope, LifeEvent, LifePoint, LifeProvider, LifeResident, LifeResponse, LifeState, NeedKey } from '../life-types';
import { approachResident, distance, route, walkable } from './navigation';
import { createLifeWorld, DURATIONS, LABELS, NEEDS, SOCIAL } from './world';
import { HARM, HURT_THRESHOLD, hurtAfterRecovery, refusesContact, traitsAfterHarm, type HarmLevel } from './harm';
import { conversationMemories, retainMemories } from './memory';

export type ReactionAction = 'accept_chat' | 'share' | 'decline' | 'walk_away';
/**
 * The model classifies what the player did and proposes a reply; it never sets the consequence.
 * `harm` is a report about the player's own words, so a resident cannot be argued out of an injury.
 */
export interface ReactionDecision { action: ReactionAction; speech: string; harm?: HarmLevel }
export interface TalkRequest {
  id: string; worldId: string; activityId: string; targetActivityId: string; targetId: string; text: string;
  context: { name: string; traits: string[]; needs: LifeResident['needs']; relationship: number; memories: LifeResident['memories']; playerName: string; hour: number; activity: string | null };
}
interface Receipt { worldId: string; fingerprint: string; message: string }
export interface LifeSnapshot { format: 1; state: LifeState; receipts: [string, Receipt][] }
export class LifeError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const DECAY: Record<NeedKey, number> = { hunger: .13, energy: .08, social: .06, fun: .1 };
const GAINS: Partial<Record<ActivityKind, Partial<Record<NeedKey, number>>>> = { eat: { hunger: 5 }, sleep: { energy: 3 }, relax: { energy: 1, fun: 2 }, read: { fun: 3.5 }, paint: { fun: 4 }, water: { fun: 2 }, coffee: { energy: 3 }, chat: { social: 2.8 }, share: { social: 2.5, hunger: 2 }, compliment: { social: 2 }, apologize: { social: 1 } };

export class LifeSimulation {
  private world: LifeState;
  private receipts: Map<string, Receipt>;
  private paths = new Map<string, LifePoint[]>();
  private pendingTalk: TalkRequest | null = null;
  private outbox: TalkRequest[] = [];
  constructor(saved?: LifeSnapshot) {
    this.world = saved ? structuredClone(saved.state) : createLifeWorld();
    this.receipts = new Map(saved?.receipts ?? []);
    this.world.provider.busy = false;
    if (saved) {
      // Saves own progress; the current room definition owns physical geometry.
      let adjusted = false;
      for (const definition of createLifeWorld().objects) {
        const object = this.world.objects.find(o => o.id === definition.id);
        if (!object) throw new LifeError('The saved home is missing a required furnishing.');
        if (object.x !== definition.x || object.z !== definition.z || object.width !== definition.width || object.depth !== definition.depth || distance(object.approach, definition.approach) > .001) adjusted = true;
        Object.assign(object, { x: definition.x, z: definition.z, width: definition.width, depth: definition.depth, approach: definition.approach });
      }
      for (const resident of this.world.residents) {
        const object = this.world.objects.find(o => o.id === resident.activity?.targetId);
        if (resident.activity && object) resident.activity.destination = { ...object.approach };
        if (!walkable(this.world, resident)) {
          const floor: LifePoint[] = [];
          for (let x = .5; x < this.world.width; x += .5) for (let z = .5; z < this.world.depth; z += .5) if (walkable(this.world, { x, z })) floor.push({ x, z });
          floor.sort((a, b) => distance(a, resident) - distance(b, resident));
          const destination = object && walkable(this.world, object.approach) ? object.approach : floor[0];
          if (!destination) throw new LifeError('The saved home has no safe floor position.');
          resident.x = destination.x; resident.z = destination.z; adjusted = true;
        }
      }
      if (adjusted) this.world.version++;
    }
    // Provider work cannot survive a process restart; release only that conversation.
    const interrupted = this.world.residents.find(r => r.activity?.label === 'Considering a reply');
    if (interrupted) {
      const player = this.resident('player');
      if (player.activity?.targetId === interrupted.id && player.activity.kind === 'chat') this.clear(player, false);
      this.clear(interrupted);
    }
  }
  state(): LifeState { return structuredClone(this.world); }
  snapshot(): LifeSnapshot { return { format: 1, state: this.state(), receipts: [...this.receipts.entries()] }; }
  commandRecorded(requestId: string): boolean { return this.receipts.has(requestId); }
  provider(info: LifeProvider): void { this.world.provider = { ...info }; }
  takeTalkRequests(): TalkRequest[] { const requests = this.outbox; this.outbox = []; return requests; }
  private resident(id: string): LifeResident { const r = this.world.residents.find(r => r.id === id); if (!r) throw new LifeError('That resident is not here.'); return r; }
  private event(actor: string, text: string, kind: string, targetId: string | null = null): LifeEvent {
    const event: LifeEvent = { id: crypto.randomUUID(), at: this.world.elapsed, actor, text, kind, targetId };
    this.world.events.push(event); this.world.events = this.world.events.slice(-80);
    // Only the participants and nearby residents remember this interaction.
    const origin = this.resident(actor);
    for (const r of this.world.residents) if (kind !== 'provider-unavailable' && (r.id === actor || r.id === targetId || distance(origin, r) <= 2.5)) {
      r.memories.push({ ...event }); r.memories = retainMemories(r.memories);
    }
    return event;
  }
  private say(r: LifeResident, speech: string): void { r.speech = speech; r.speechUntil = this.world.elapsed + 9; }
  private clear(r: LifeResident, queue = true): void {
    if (r.activity) this.paths.delete(r.activity.id);
    r.activity = null;
    if (queue) r.queue = [];
    for (const o of this.world.objects) if (o.occupiedBy === r.id) o.occupiedBy = null;
    if (r.id === 'player' && this.pendingTalk) {
      const target = this.resident(this.pendingTalk.targetId);
      this.pendingTalk = null;
      if (target.activity?.label === 'Considering a reply') this.clear(target, false);
    }
  }
  private make(kind: ActivityKind, targetId: string | null, destination: LifePoint | null, autonomous: boolean): LifeActivity {
    return { id: crypto.randomUUID(), kind, label: LABELS[kind], targetId, destination, phase: destination ? 'walking' : 'doing', elapsed: 0, duration: DURATIONS[kind], autonomous };
  }
  private start(r: LifeResident, activity: LifeActivity): void {
    const object = this.world.objects.find(o => o.id === activity.targetId);
    if (object && object.occupiedBy && object.occupiedBy !== r.id) throw new LifeError(`${object.name} is in use by ${this.resident(object.occupiedBy).name}.`);
    let destination = object?.approach ?? activity.destination;
    if (activity.targetId && SOCIAL.has(activity.kind)) {
      const target = this.resident(activity.targetId);
      if (target.activity?.kind === 'sleep' && target.activity.phase === 'doing') throw new LifeError(`${target.name} is asleep. Let them rest.`);
      destination = approachResident(this.world, r, target);
      if (!destination) throw new LifeError('There is no room to approach them.');
    }
    const path = destination ? route(this.world, r, destination) : [];
    if (!path) throw new LifeError('That destination cannot be reached.');
    this.clear(r, false);
    activity.destination = destination;
    activity.phase = destination ? 'walking' : 'doing';
    activity.elapsed = 0;
    r.activity = activity;
    if (object) object.occupiedBy = r.id;
    this.paths.set(activity.id, path);
  }
  private schedule(r: LifeResident, activity: LifeActivity, queued = false): void {
    if (queued && r.activity) {
      if (r.queue.length >= 5) throw new LifeError('The queue already has five activities.');
      r.queue.push(activity); return;
    }
    this.start(r, activity); r.queue = [];
  }
  command(envelope: LifeCommandEnvelope): LifeResponse {
    const { worldId, requestId, command } = envelope;
    if (!requestId || requestId.length > 100) throw new LifeError('An action needs a valid request ID.');
    const fingerprint = JSON.stringify(Object.fromEntries(Object.entries(command).sort(([a], [b]) => a.localeCompare(b))));
    const prior = this.receipts.get(requestId);
    if (prior) {
      if (prior.worldId !== worldId || prior.fingerprint !== fingerprint) throw new LifeError('That request ID was already used for a different command.', 409);
      return { state: this.state(), message: prior.message };
    }
    if (worldId !== this.world.id) throw new LifeError('This command belongs to an earlier home. Refresh and try again.', 409);
    const before = this.state();
    let message = 'Done.';
    try {
      const player = this.resident('player');
      switch (command.kind) {
        case 'walk': {
          const destination = { x: command.x, z: command.z };
          if (!walkable(this.world, destination)) throw new LifeError('Choose open floor away from furniture.');
          this.schedule(player, this.make('walk', null, destination, false)); message = 'Walking there.'; break;
        }
        case 'use': {
          const object = this.world.objects.find(o => o.id === command.objectId);
          if (!object || !object.actions.includes(command.action)) throw new LifeError('That object does not support this activity.');
          this.schedule(player, this.make(command.action, object.id, object.approach, false), command.queue);
          message = `${command.queue && player.queue.length ? 'Queued' : 'Next'}: ${LABELS[command.action].toLowerCase()}.`; break;
        }
        case 'social': {
          if (!SOCIAL.has(command.action) || command.targetId === 'player') throw new LifeError('Choose another resident and a social activity.');
          this.resident(command.targetId);
          this.schedule(player, this.make(command.action, command.targetId, null, false), command.queue);
          message = `${LABELS[command.action]} with ${this.resident(command.targetId).name}.`; break;
        }
        case 'cancel': this.clear(player); message = 'Activities canceled.'; break;
        case 'speed': if (![0, 1, 3].includes(command.speed)) throw new LifeError('Choose pause, normal, or fast.'); this.world.speed = command.speed; message = command.speed === 0 ? 'Life paused.' : `Life at ${command.speed}× speed.`; break;
        case 'theme': if (!['loft', 'lantern', 'comic'].includes(command.theme)) throw new LifeError('Unknown visual preset.'); this.world.theme = command.theme; message = 'Visual preset changed; your home and relationships continue.'; break;
        case 'reset': {
          const provider = this.world.provider; this.world = createLifeWorld(); this.world.provider = { ...provider, busy: false }; this.paths.clear(); this.pendingTalk = null; this.outbox = [];
          message = 'A fresh day begins.'; break;
        }
        case 'talk': this.outbox.push(this.beginTalk(command.targetId, command.text)); message = `${this.resident(command.targetId).name} is considering your words. Life keeps moving.`; break;
        default: throw new LifeError('Unknown command.');
      }
      this.world.version++;
      this.receipts.set(requestId, { worldId, fingerprint, message });
      while (this.receipts.size > 256) this.receipts.delete(this.receipts.keys().next().value!);
      return { state: this.state(), message };
    } catch (error) { this.world = before; this.paths.clear(); throw error; }
  }
  tick(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1) throw new LifeError('A simulation tick must be between zero and one second.');
    const dt = seconds * this.world.speed;
    if (!dt) return;
    this.world.elapsed += dt;
    const totalMinutes = 16 * 60 + 20 + Math.floor(this.world.elapsed * 2);
    this.world.day = 1 + Math.floor(totalMinutes / 1440); this.world.hour = Math.floor(totalMinutes / 60) % 24; this.world.minute = totalMinutes % 60;
    for (const r of this.world.residents) {
      for (const need of NEEDS) r.needs[need] = clamp(r.needs[need] - DECAY[need] * dt);
      if (r.speechUntil <= this.world.elapsed) r.speech = null;
      this.advance(r, dt);
      if (!r.activity && r.queue.length) {
        const next = r.queue.shift()!;
        try { this.start(r, next); } catch (error) { this.event(r.id, `${r.name}: ${error instanceof Error ? error.message : 'That activity is unavailable.'}`, 'activity-unavailable'); }
      }
      if (!r.activity && r.role === 'npc') this.autonomy(r);
      const lowest = NEEDS.reduce((a, b) => r.needs[a] < r.needs[b] ? a : b);
      r.hurt = hurtAfterRecovery(r.hurt, dt);
      r.mood = r.hurt > HURT_THRESHOLD ? 'Hurt' : r.activity?.phase === 'doing' && r.activity.kind === 'sleep' ? 'Asleep' : r.needs[lowest] < 25 ? ({ hunger: 'Hungry', energy: 'Exhausted', social: 'Lonely', fun: 'Bored' })[lowest] : r.activity?.kind === 'paint' ? 'Inspired' : r.activity?.kind === 'chat' || r.activity?.kind === 'share' ? 'Connected' : r.needs[lowest] > 65 ? 'Content' : 'Comfortable';
    }
    this.world.version++;
  }
  private advance(r: LifeResident, dt: number): void {
    const activity = r.activity; if (!activity) return;
    if (activity.phase === 'walking') {
      if (SOCIAL.has(activity.kind) && activity.targetId) {
        const target = this.resident(activity.targetId);
        if (distance(r, target) <= 1.55) { activity.phase = 'doing'; activity.elapsed = 0; this.beginSocial(r, target, activity); return; }
        if (!activity.destination || distance(activity.destination, target) > 2) {
          const next = approachResident(this.world, r, target);
          if (!next) { this.clear(r, false); return; }
          activity.destination = next; this.paths.delete(activity.id);
        }
      }
      if (!activity.destination) { activity.phase = 'doing'; return; }
      let path = this.paths.get(activity.id);
      if (!path) { path = route(this.world, r, activity.destination) ?? []; this.paths.set(activity.id, path); }
      let remaining = dt * 1.7;
      while (path.length && remaining > 0) {
        const next = path[0], d = distance(r, next); r.facing = Math.atan2(next.x - r.x, next.z - r.z);
        if (d <= remaining) { r.x = next.x; r.z = next.z; path.shift(); remaining -= d; }
        else { r.x += (next.x - r.x) / d * remaining; r.z += (next.z - r.z) / d * remaining; remaining = 0; }
      }
      activity.elapsed += dt;
      if (activity.elapsed > 35) { this.event(r.id, `${r.name} could not reach the activity.`, 'activity-unavailable'); this.clear(r, false); return; }
      if (!path.length) {
        if (activity.kind === 'walk') { this.clear(r, false); return; }
        if (SOCIAL.has(activity.kind) && activity.targetId) {
          if (distance(r, this.resident(activity.targetId)) > 1.65) { this.paths.delete(activity.id); return; }
          this.beginSocial(r, this.resident(activity.targetId), activity);
        }
        if (r.activity?.id === activity.id) { activity.phase = 'doing'; activity.elapsed = 0; }
      }
      return;
    }
    activity.elapsed += dt;
    const awaitingReply = this.pendingTalk && (r.id === 'player' || r.id === this.pendingTalk.targetId);
    if (!awaitingReply) for (const [need, rate] of Object.entries(GAINS[activity.kind] ?? {})) r.needs[need as NeedKey] = clamp(r.needs[need as NeedKey] + rate * dt);
    if (activity.elapsed >= activity.duration) {
      this.event(r.id, `${r.name} finished ${LABELS[activity.kind].toLowerCase()}.`, 'activity-complete', activity.targetId);
      this.clear(r, false);
    }
  }
  private beginSocial(actor: LifeResident, target: LifeResident, activity: LifeActivity): void {
    if (target.activity?.label === 'Considering a reply') {
      this.clear(actor, false);
      return;
    }
    if (activity.autonomous && target.role === 'player' && target.activity) {
      this.clear(actor, false);
      return;
    }
    if (target.activity?.kind === 'sleep' && target.activity.phase === 'doing') { this.say(actor, 'They are resting. I will come back.'); this.clear(actor, false); return; }
    const relationship = target.relationships[actor.id] ?? 0;
    if (activity.kind === 'insult') {
      this.relationship(actor, target, -18); this.say(target, 'That hurt. I need some space.');
      this.applyHarm(actor, target, 'threat', target.traits.includes('Warm') ? 'That was cruel.' : 'Do not speak to me like that.'); return;
    }
    if (activity.kind === 'apologize') {
      this.relationship(actor, target, 9); this.say(target, relationship < -15 ? 'Thank you. I still need time.' : 'Thank you for saying that.');
      this.event(actor.id, `${actor.name} apologized to ${target.name}.`, 'apology', target.id); return;
    }
    if (refusesContact(target.hurt, relationship) || relationship < -12 || target.needs.energy < 18) {
      this.say(target, target.hurt > HURT_THRESHOLD ? 'Stay away from me.' : relationship < -12 ? 'After what happened, I need some space.' : 'I am too tired right now.');
      this.event(target.id, `${target.name} declined ${actor.name}'s invitation${relationship < -12 ? ' because of their recent history' : ' to rest'}.`, 'declined', actor.id);
      this.walkAway(target, actor); this.clear(actor, false); return;
    }
    this.relationship(actor, target, activity.kind === 'compliment' ? 7 : activity.kind === 'share' ? 6 : 3);
    this.clear(target);
    const reply = this.make(activity.kind === 'share' ? 'share' : 'chat', actor.id, null, true); reply.duration = activity.duration; target.activity = reply;
    actor.facing = Math.atan2(target.x - actor.x, target.z - actor.z); target.facing = actor.facing + Math.PI;
    this.say(target, activity.kind === 'share' ? 'There is always room for one more.' : activity.kind === 'compliment' ? 'That means a lot. Thank you!' : target.traits.includes('Creative') ? 'I have been working on something new.' : 'I am glad you came over.');
    this.event(actor.id, `${actor.name} and ${target.name} ${activity.kind === 'share' ? 'shared a meal' : activity.kind === 'compliment' ? 'shared a kind moment' : 'spent time together'}.`, 'social', target.id);
  }
  /**
   * Apply a harmful act. Every number comes from the engine's own table, never from the model, and
   * the reputation it leaves on the actor is permanent state rather than a line of dialogue.
   */
  private applyHarm(actor: LifeResident, target: LifeResident, level: Exclude<HarmLevel, 'none'>, said: string): void {
    const rule = HARM[level];
    target.hurt = clamp(target.hurt + rule.hurt);
    for (const need of NEEDS) if (rule.needs[need as keyof typeof rule.needs] !== undefined) target.needs[need] = clamp(target.needs[need] + rule.needs[need as keyof typeof rule.needs]);
    target.mood = rule.mood;
    this.relationship(actor, target, rule.relationship);
    actor.harmDone += 1;
    const earned = traitsAfterHarm(actor.traits, actor.harmDone);
    const gained = earned.filter(trait => !actor.traits.includes(trait));
    actor.traits = earned;
    if (said.trim()) this.say(target, said.trim().slice(0, 400));
    this.event(actor.id, `${actor.name} ${rule.verb} ${target.name}.`, 'insult', target.id);
    if (level === 'physical') this.event(target.id, `${target.name} is hurt and does not want ${actor.name} near them.`, 'insult', actor.id);
    // Anyone else in the home saw it and thinks less of whoever did it.
    for (const witness of this.world.residents) {
      if (witness.id === actor.id || witness.id === target.id) continue;
      this.relationship(actor, witness, rule.witness);
    }
    for (const trait of gained) this.event(actor.id, `${actor.name} is now known as ${trait}.`, 'insult', target.id);
    this.walkAway(target, actor);
  }
  private relationship(a: LifeResident, b: LifeResident, delta: number): void { a.relationships[b.id] = clamp((a.relationships[b.id] ?? 0) + delta, -100); b.relationships[a.id] = clamp((b.relationships[a.id] ?? 0) + delta, -100); }
  private walkAway(r: LifeResident, away: LifeResident): void {
    const candidates = [{ x: 6, z: 7.8 }, { x: 7.8, z: 4.5 }, { x: 3.6, z: 3.5 }].sort((a, b) => distance(b, away) - distance(a, away));
    const dest = candidates.find(p => distance(p, r) > .6 && route(this.world, r, p));
    if (dest) this.schedule(r, this.make('walk', null, dest, true));
  }
  private autonomy(r: LifeResident): void {
    const choices: { action: ActivityKind; targetId: string; score: number }[] = [];
    for (const o of this.world.objects) {
      if (o.occupiedBy && o.occupiedBy !== r.id) continue;
      for (const action of o.actions) {
        const gains = GAINS[action] ?? {};
        const score = Math.max(0, ...Object.keys(gains).map(key => 100 - r.needs[key as NeedKey])) + (action === 'paint' && r.traits.includes('Creative') ? 10 : 0) + (action === 'eat' && r.traits.includes('Food lover') ? 5 : 0);
        choices.push({ action, targetId: o.id, score });
      }
    }
    if (r.needs.social < 55) for (const target of this.world.residents) {
      if (target.id !== r.id && !target.activity && (r.relationships[target.id] ?? 0) >= -12) choices.push({ action: 'chat', targetId: target.id, score: 105 - r.needs.social + (r.traits.includes('Warm') ? 10 : 0) });
    }
    choices.sort((a, b) => b.score - a.score);
    for (const choice of choices) {
      const object = this.world.objects.find(o => o.id === choice.targetId);
      try { this.start(r, this.make(choice.action, choice.targetId, object?.approach ?? null, true)); return; } catch { /* Another resident or navigation can make a candidate unavailable. */ }
    }
  }
  beginTalk(targetId: string, text: string): TalkRequest {
    const player = this.resident('player'), target = this.resident(targetId);
    if (target.id === player.id) throw new LifeError('Choose another resident.');
    if (!text.trim() || text.length > 800) throw new LifeError('Use between 1 and 800 characters.');
    if (distance(player, target) > 3) throw new LifeError(`Move closer to ${target.name} to talk (within 3 meters).`);
    if (target.activity?.kind === 'sleep' && target.activity.phase === 'doing') throw new LifeError(`${target.name} is asleep.`);
    if (this.pendingTalk) throw new LifeError('A resident is still considering your last words.', 409);
    const context = { name: target.name, traits: [...target.traits], needs: { ...target.needs }, relationship: target.relationships.player ?? 0, memories: structuredClone(conversationMemories(target.memories)), playerName: player.name, hour: this.world.hour, activity: target.activity?.label ?? null };
    this.clear(player); this.clear(target);
    player.activity = this.make('chat', target.id, null, false); player.activity.duration = 40; player.activity.label = `Talking with ${target.name}`;
    target.activity = this.make('chat', player.id, null, true); target.activity.duration = 40; target.activity.label = 'Considering a reply';
    this.say(player, text.trim()); this.event(player.id, `${player.name}: ${text.trim()}`, 'speech', target.id);
    const request = { id: crypto.randomUUID(), worldId: this.world.id, activityId: player.activity.id, targetActivityId: target.activity.id, targetId, text: text.trim(), context };
    this.pendingTalk = request;
    return structuredClone(request);
  }
  applyReaction(request: TalkRequest, decision: ReactionDecision): boolean {
    if (this.world.id !== request.worldId || this.pendingTalk?.id !== request.id) return false;
    const harm: HarmLevel = decision.harm ?? 'none';
    if (!['accept_chat', 'share', 'decline', 'walk_away'].includes(decision.action) || !['none', 'threat', 'physical'].includes(harm) || !decision.speech.trim() || decision.speech.length > 400) throw new LifeError('The resident response was outside the supported contract.');
    const player = this.resident('player'), target = this.resident(request.targetId);
    this.pendingTalk = null;
    if (player.activity?.id !== request.activityId || target.activity?.id !== request.targetActivityId || distance(player, target) > 3 || target.activity?.kind === 'sleep') {
      if (player.activity?.id === request.activityId) this.clear(player, false);
      return false;
    }
    if (harm !== 'none') {
      this.clear(player, false); this.clear(target);
      this.applyHarm(player, target, harm, decision.speech);
      this.world.version++;
      return true;
    }
    const reluctant = refusesContact(target.hurt, target.relationships.player ?? 0);
    const action = reluctant && (decision.action === 'share' || decision.action === 'accept_chat') ? 'decline' : decision.action;
    this.clear(player, false); this.clear(target);
    if (action === 'accept_chat' || action === 'share') {
      const kind = action === 'share' ? 'share' : 'chat';
      player.activity = this.make(kind, target.id, null, false); target.activity = this.make(kind, player.id, null, true);
      this.relationship(player, target, action === 'share' ? 6 : 3);
      this.say(target, decision.speech);
      this.event(target.id, `${target.name}: ${decision.speech}`, 'model-speech', player.id);
      this.event(target.id, `${target.name} ${action === 'share' ? 'agreed to share a meal' : 'chose to spend time with you'}.`, 'cooperation', player.id);
    } else {
      const speech = reluctant && decision.action !== action ? (target.hurt > 0 ? 'Not after what you did to me.' : 'After what happened, I need some space first.') : decision.speech;
      this.say(target, speech); this.event(target.id, `${target.name}: ${speech}`, 'model-speech', player.id);
      this.event(target.id, `${target.name} ${action === 'walk_away' ? 'ended the conversation and walked away' : 'declined to join you'}.`, 'declined', player.id);
      if (action === 'walk_away') this.walkAway(target, player);
    }
    this.world.version++;
    return true;
  }
  failReaction(request: TalkRequest, message: string): void {
    if (this.pendingTalk?.id !== request.id || request.worldId !== this.world.id) return;
    this.pendingTalk = null;
    const player = this.resident('player'), target = this.resident(request.targetId);
    if (player.activity?.id === request.activityId) this.clear(player, false);
    if (target.activity?.label === 'Considering a reply') this.clear(target);
    this.event(target.id, message, 'provider-unavailable', player.id);
  }
}
