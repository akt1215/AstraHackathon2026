import { describe, it, expect } from 'vitest';
import { LifeSimulation } from './simulation';
import { route, walkable } from './navigation';
import { STATIC_FIXTURES } from './layout';

function command(sim: LifeSimulation, command: Parameters<LifeSimulation['command']>[0]['command'], id = crypto.randomUUID()) {
  return sim.command({ worldId: sim.state().id, requestId: id, command });
}
function advance(sim: LifeSimulation, seconds: number) { for (let i = 0; i < seconds * 10; i++) sim.tick(.1); }
function player(sim: LifeSimulation) { return sim.state().residents.find(r => r.id === 'player')!; }

describe('continuous life simulation', () => {
  it('runs independent NPC routines and changes needs without dialogue or a model', () => {
    const sim = new LifeSimulation(); const before = sim.state();
    advance(sim, 1);
    expect(sim.state().residents.filter(r => r.role === 'npc').every(r => r.activity !== null)).toBe(true);
    expect(player(sim).needs.hunger).toBeLessThan(before.residents[0].needs.hunger);
    advance(sim, 25);
    expect(sim.state().events.some(e => e.actor !== 'player' && e.kind === 'activity-complete')).toBe(true);
  });
  it('reserves a reachable object, restores the matching need and cleans up on cancel', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'use', objectId: 'bed', action: 'sleep' });
    expect(sim.state().objects.find(o => o.id === 'bed')!.occupiedBy).toBe('player');
    const energy = player(sim).needs.energy; advance(sim, 20);
    expect(player(sim).needs.energy).toBeGreaterThan(energy);
    command(sim, { kind: 'cancel' });
    expect(player(sim).activity).toBeNull();
    expect(sim.state().objects.find(o => o.id === 'bed')!.occupiedBy).toBeNull();
  });
  it('rejects furniture destinations and unsupported object actions without changing state', () => {
    const sim = new LifeSimulation(); const before = sim.state();
    expect(() => command(sim, { kind: 'walk', x: 10.3, z: 1.6 })).toThrow();
    expect(() => command(sim, { kind: 'use', objectId: 'plant', action: 'sleep' })).toThrow();
    expect(sim.state()).toEqual(before);
  });
  it('pauses time and needs and uses speed three as three times simulation time', () => {
    const sim = new LifeSimulation(); command(sim, { kind: 'speed', speed: 0 });
    const paused = sim.state(); advance(sim, 4); expect(sim.state()).toEqual(paused);
    command(sim, { kind: 'speed', speed: 3 }); advance(sim, 2);
    expect(sim.state().elapsed).toBeCloseTo(6);
  });
  it('replays identical request ids once, rejects conflicting reuse, and rejects old world commands', () => {
    const sim = new LifeSimulation();
    const envelope = { worldId: sim.state().id, requestId: 'same', command: { kind: 'speed', speed: 3 } as const };
    sim.command(envelope); const version = sim.state().version; sim.command(envelope);
    expect(sim.state().version).toBe(version);
    expect(() => sim.command({ ...envelope, command: { kind: 'speed', speed: 0 } })).toThrow();
    command(sim, { kind: 'reset' }); expect(() => sim.command({ ...envelope, requestId: 'new' })).toThrow();
  });
  it('restores actual activity, reservations, memories and request receipts from a snapshot', () => {
    const sim = new LifeSimulation();
    const req = { worldId: sim.state().id, requestId: 'sleep', command: { kind: 'use', objectId: 'bed', action: 'sleep' } as const };
    sim.command(req); advance(sim, 2);
    const restored = new LifeSimulation(sim.snapshot());
    expect(restored.state()).toEqual(sim.state());
    const version = restored.state().version; restored.command(req);
    expect(restored.state().version).toBe(version);
    advance(restored, 20); expect(player(restored).needs.energy).toBeGreaterThan(player(sim).needs.energy);
  });
  it('lets the player speak from anywhere, to anyone, whatever they are doing', () => {
    const sim = new LifeSimulation();
    // Opposite corner of the home from June, who is mid-activity, and Leo, who is asleep.
    const corner = [{ x: 7.5, z: 9.2 }, { x: 8.5, z: 8.6 }, { x: 6.5, z: 9.2 }].find(point => walkable(sim.state(), point))!;
    command(sim, { kind: 'walk', ...corner }); advance(sim, 30);
    const far = sim.state().residents.find(r => r.id === 'june')!;
    expect(Math.hypot(player(sim).x - far.x, player(sim).z - far.z), 'genuinely far away').toBeGreaterThan(5);
    const request = sim.beginTalk('june', 'I punched you.');
    expect(sim.applyReaction(request, { action: 'decline', speech: 'Do not touch me.', act: 'physical' })).toBe(true);
    expect(sim.state().residents.find(r => r.id === 'june')!.hurt).toBeGreaterThan(20);
  });

  it('supersedes a reply still in flight rather than refusing the next thing you say', () => {
    const sim = new LifeSimulation();
    const first = sim.beginTalk('june', 'Are you there?');
    const second = sim.beginTalk('leo', 'What about you?');
    expect(second.targetId).toBe('leo');
    // The abandoned one no longer applies; the current one does.
    expect(sim.applyReaction(first, { action: 'accept_chat', speech: 'Too late.' })).toBe(false);
    expect(sim.applyReaction(second, { action: 'accept_chat', speech: 'I am here.' })).toBe(true);
  });

  it('makes kindness land on the world too, not only cruelty', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    const before = player(sim).relationships.june ?? 0;
    const fun = sim.state().residents.find(r => r.id === 'june')!.needs.fun;
    expect(sim.applyReaction(sim.beginTalk('june', 'I cooked you dinner.'), { action: 'accept_chat', speech: 'That is so kind.', act: 'help' })).toBe(true);
    const june = sim.state().residents.find(r => r.id === 'june')!;
    expect(june.needs.fun).toBeGreaterThanOrEqual(fun);
    expect(player(sim).relationships.june).toBeGreaterThan(before);
    expect(june.activity?.kind, 'she does not flee kindness').not.toBe('walk');
    expect(player(sim).kindDone).toBe(1);
    expect(sim.state().events.some(e => /helped June/.test(e.text))).toBe(true);
  });

  it('earns a warm reputation for repeated kindness', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    for (let i = 0; i < 3; i++) {
      sim.applyReaction(sim.beginTalk('june', 'a kindness'), { action: 'accept_chat', speech: 'Thank you.', act: 'gift' });
      advance(sim, 3);
    }
    expect(player(sim).traits).toContain('Thoughtful');
    expect(player(sim).traits).not.toContain('Callous');
  });

  it('sends the police after violence and takes the controls away while they deal with it', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    sim.applyReaction(sim.beginTalk('june', 'I hit her'), { action: 'decline', speech: 'Get away.', act: 'physical' });
    expect(sim.state().arrests).toBe(1);
    expect(sim.state().arrestedUntil).toBeGreaterThan(sim.state().elapsed);
    expect(player(sim).traits).toContain('Charged');
    expect(() => command(sim, { kind: 'walk', x: 6, z: 6 })).toThrow(/police/i);
    expect(sim.state().events.some(e => /called the police/.test(e.text))).toBe(true);
    // The world keeps running while the player is held, and control comes back afterwards.
    advance(sim, 50);
    expect(() => command(sim, { kind: 'walk', x: 6, z: 6 })).not.toThrow();
  });

  it('makes a frightened resident leave when the person they fear comes close', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    sim.applyReaction(sim.beginTalk('june', 'I hit her'), { action: 'decline', speech: 'Stay back.', act: 'physical' });
    advance(sim, 50);
    const scared = sim.state().residents.find(r => r.id === 'june')!;
    expect(scared.fear.player, 'she is afraid of him').toBeGreaterThan(30);
    // Follow her: she should get up and move away rather than wait to be spoken to.
    for (let i = 0; i < 6; i++) {
      const june = sim.state().residents.find(r => r.id === 'june')!;
      const spot = [[0, -1.1], [0, 1.1], [-1.1, 0], [1.1, 0]]
        .map(([dx, dz]) => ({ x: june.x + dx!, z: june.z + dz! }))
        .find(point => walkable(sim.state(), point));
      if (spot) { try { command(sim, { kind: 'walk', ...spot }); } catch { /* she may already be moving */ } }
      advance(sim, 5);
    }
    const after = sim.state().residents.find(r => r.id === 'june')!;
    expect(after.activity?.kind === 'walk' || Math.hypot(after.x - player(sim).x, after.z - player(sim).z) > 2, 'she keeps her distance').toBe(true);
  });

  it('makes violence land on the world instead of only being disapproved of', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    const before = player(sim).relationships.june ?? 0;
    const request = sim.beginTalk('june', 'I punched her.');
    // The model may still propose a friendly outcome; the classification is what the engine acts on.
    expect(sim.applyReaction(request, { action: 'accept_chat', speech: 'Why would you do that?', act: 'physical' })).toBe(true);
    const june = sim.state().residents.find(r => r.id === 'june')!;
    expect(june.hurt, 'june is injured').toBeGreaterThan(20);
    expect(june.mood).toBe('Hurt');
    expect(june.needs.fun, 'being hurt costs her').toBeLessThan(66);
    expect(player(sim).relationships.june, 'the relationship is wrecked').toBeLessThan(before - 40);
    expect(player(sim).traits, 'the player is marked for it').toContain('Callous');
    expect(june.activity?.kind, 'she leaves').toBe('walk');
    expect(sim.state().events.some(e => /hurt June/.test(e.text))).toBe(true);
    // A housemate who was not touched still thinks less of the player.
    expect(player(sim).relationships.leo).toBeLessThan(5);
  });

  it('refuses the harmed resident being approached again while she is still hurt', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    sim.applyReaction(sim.beginTalk('june', 'I hit her'), { action: 'accept_chat', speech: 'Stop.', act: 'physical' });
    const reply = sim.applyReaction(sim.beginTalk('june', 'Lets share a meal'), { action: 'share', speech: 'Of course, sit down.' });
    expect(reply).toBe(true);
    expect(sim.state().residents.find(r => r.id === 'june')!.activity?.kind, 'she will not share a meal with him').not.toBe('share');
  });

  it('escalates a repeat offender to a standing reputation', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    for (let i = 0; i < 3; i++) {
      // She walks away each time, so the player has to follow her before doing it again.
      for (let attempt = 0; attempt < 10; attempt++) {
        advance(sim, 6);
        const june = sim.state().residents.find(r => r.id === 'june')!;
        const me = player(sim);
        if (Math.hypot(me.x - june.x, me.z - june.z) <= 2.6 && !me.activity) break;
        const spot = [[0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0], [-.9, -.9], [.9, .9], [-.9, .9], [.9, -.9]]
          .map(([dx, dz]) => ({ x: june.x + dx!, z: june.z + dz! }))
          .find(point => walkable(sim.state(), point));
        if (spot) { command(sim, { kind: 'walk', ...spot }); advance(sim, 10); }
      }
      sim.applyReaction(sim.beginTalk('june', 'again'), { action: 'decline', speech: 'Stop it.', act: 'physical' });
      // The police detain the player after violence, so nothing else can be commanded until it ends.
      advance(sim, 50);
    }
    expect(player(sim).traits).toContain('Violent');
    expect(player(sim).traits).not.toContain('Callous');
    expect(player(sim).harmDone).toBe(3);
  });

  it('rejects a harm classification outside the contract', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    const request = sim.beginTalk('june', 'hello');
    expect(() => sim.applyReaction(request, { action: 'accept_chat', speech: 'hi', act: 'catastrophic' as never })).toThrow();
  });

  it('heals an injury over time so the world does not stay broken', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    sim.applyReaction(sim.beginTalk('june', 'I hit her'), { action: 'decline', speech: 'Go away.', act: 'physical' });
    expect(sim.state().residents.find(r => r.id === 'june')!.hurt).toBeGreaterThan(20);
    advance(sim, 900);
    expect(sim.state().residents.find(r => r.id === 'june')!.hurt).toBe(0);
  });

  it('makes relationship history affect cooperation and rejects stale model decisions after reset', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    const request = sim.beginTalk('june', 'Could we share lunch?');
    expect(sim.applyReaction(request, { action: 'share', speech: 'Yes, let us eat together.' })).toBe(true);
    expect(sim.state().residents.find(r => r.id === 'june')!.activity?.kind).toBe('share');
    expect(player(sim).relationships.june).toBeGreaterThan(0);
    const stale = sim.beginTalk('june', 'Another question'); command(sim, { kind: 'reset' });
    expect(sim.applyReaction(stale, { action: 'share', speech: 'This belongs to the old world.' })).toBe(false);
    expect(sim.state().events.some(e => e.text.includes('old world'))).toBe(false);
  });
  it('does not apply an asynchronous social decision after the player changes activity', () => {
    const sim = new LifeSimulation(); command(sim, { kind: 'walk', x: 2, z: 3.5 }); advance(sim, 3);
    const request = sim.beginTalk('june', 'Hello'); command(sim, { kind: 'cancel' });
    expect(sim.applyReaction(request, { action: 'accept_chat', speech: 'Too late' })).toBe(false);
    expect(sim.state().residents.find(r => r.id === 'june')!.activity?.label).not.toBe('Considering a reply');
  });
  it('approaches another resident and makes repeated insults cause a later refusal', () => {
    const sim = new LifeSimulation();
    command(sim, { kind: 'social', targetId: 'june', action: 'chat' }); advance(sim, 10);
    expect(player(sim).relationships.june).toBeGreaterThan(12);
    expect(sim.state().events.some(e => e.kind === 'social' && e.targetId === 'june')).toBe(true);
    for (let i = 0; i < 3; i++) { command(sim, { kind: 'social', targetId: 'june', action: 'insult' }); advance(sim, 12); }
    expect(player(sim).relationships.june).toBeLessThan(-12);
    command(sim, { kind: 'social', targetId: 'june', action: 'share' }); advance(sim, 12);
    expect(sim.state().events.some(e => e.actor === 'june' && e.kind === 'declined' && e.text.includes('history'))).toBe(true);
    expect(sim.state().residents.find(r => r.id === 'june')!.memories.some(m => m.kind === 'insult')).toBe(true);
    command(sim, { kind: 'speed', speed: 3 }); advance(sim, 240);
    expect(sim.state().residents.find(r => r.id === 'june')!.memories.some(m => m.kind === 'insult')).toBe(true);
  });
  it('never lets an autonomous social invitation replace the player activity', () => {
    const seed = new LifeSimulation().snapshot();
    seed.state.residents.find(r => r.id === 'june')!.needs = { hunger: 100, energy: 100, social: 0, fun: 100 };
    seed.state.residents.find(r => r.id === 'leo')!.needs = { hunger: 100, energy: 0, social: 100, fun: 100 };
    const sim = new LifeSimulation(seed); advance(sim, .2);
    command(sim, { kind: 'use', objectId: 'easel', action: 'paint' });
    advance(sim, 12);
    expect(player(sim).activity?.kind).toBe('paint');
  });
  it('provides a collision-free approach to every furnished object', () => {
    const sim = new LifeSimulation(), state = sim.state(), start = player(sim);
    for (const object of state.objects) {
      const path = route(state, start, object.approach);
      expect(path, object.id).not.toBeNull();
      let before = start;
      for (const point of path!) {
        for (let i = 1; i <= 20; i++) expect(walkable(state, { x: before.x + (point.x - before.x) * i / 20, z: before.z + (point.z - before.z) * i / 20 }), object.id).toBe(true);
        before = { ...before, ...point };
      }
    }
  });
  it('blocks every static furnishing in addition to interactive furniture', () => {
    const state = new LifeSimulation().state();
    for (const fixture of STATIC_FIXTURES) expect(walkable(state, { x: fixture.x, z: Math.max(.4, fixture.z) }), fixture.id).toBe(false);
  });
  it('keeps every furniture approach and resident start reachable as decor fixtures are added', () => {
    // New static decor must not swallow an approach point: the activity would silently become unusable.
    const state = new LifeSimulation().state();
    for (const object of state.objects) expect(walkable(state, object.approach), `${object.id} approach`).toBe(true);
    for (const resident of state.residents) expect(walkable(state, { x: resident.x, z: resident.z }), `${resident.name} start`).toBe(true);
  });
  it('reconciles saved furniture approaches with the current visible layout without losing an activity', () => {
    const seed = new LifeSimulation().snapshot();
    const table = seed.state.objects.find(o => o.id === 'table')!;
    table.approach = { x: 5.7, z: 3 }; table.occupiedBy = 'player';
    const person = seed.state.residents[0]; person.x = 5.7; person.z = 3;
    person.activity = { id: 'saved-meal', kind: 'eat', label: 'Making a meal', targetId: 'table', destination: table.approach, phase: 'doing', duration: 12, elapsed: 2, autonomous: false };
    const sim = new LifeSimulation(seed);
    expect(walkable(sim.state(), player(sim))).toBe(true);
    expect(player(sim).activity?.id).toBe('saved-meal');
    expect(sim.state().objects.find(o => o.id === 'table')!.approach).toEqual({ x: 6.4, z: 3 });
  });
  it('protects a pending reply from an arriving autonomous social invitation', () => {
    const seed = new LifeSimulation().snapshot();
    Object.assign(seed.state.residents[0], { x: 5, z: 5 });
    Object.assign(seed.state.residents[1], { x: 6, z: 5 });
    Object.assign(seed.state.residents[2], { x: 7, z: 5, activity: { id: 'leo-invitation', kind: 'chat', label: 'Chatting', targetId: 'june', destination: { x: 7, z: 5 }, phase: 'walking', elapsed: 0, duration: 7, autonomous: true } });
    const sim = new LifeSimulation(seed), request = sim.beginTalk('june', 'Can we chat?');
    sim.tick(.1);
    expect(sim.state().residents.find(r => r.id === 'june')!.activity?.label).toBe('Considering a reply');
    expect(sim.applyReaction(request, { action: 'share', speech: 'Let us share lunch.' })).toBe(true);
    expect(sim.state().residents.find(r => r.id === 'june')!.activity?.targetId).toBe('player');
    expect(sim.state().residents.find(r => r.id === 'leo')!.activity?.targetId).not.toBe('june');
  });
  it.each(['accepted', 'declined', 'failed', 'restart', 'stale-target'] as const)('preserves and executes queued activities after a %s reply', outcome => {
    const seed = new LifeSimulation().snapshot();
    Object.assign(seed.state.residents[0], { x: 5, z: 5 });
    Object.assign(seed.state.residents[1], { x: 6, z: 5 });
    let sim = new LifeSimulation(seed);
    const request = sim.beginTalk('june', 'Hello June.');
    command(sim, { kind: 'use', objectId: 'bed', action: 'sleep', queue: true });
    expect(player(sim).queue.map(a => a.kind)).toEqual(['sleep']);
    if (outcome === 'restart') sim = new LifeSimulation(sim.snapshot());
    else if (outcome === 'failed') sim.failReaction(request, 'The provider is unavailable.');
    else if (outcome === 'stale-target') sim.applyReaction({ ...request, targetActivityId: 'a-superseded-activity' }, { action: 'accept_chat', speech: 'Hello Alex.' });
    else sim.applyReaction(request, { action: outcome === 'accepted' ? 'accept_chat' : 'decline', speech: 'Hello Alex.' });
    expect(player(sim).queue.map(a => a.kind)).toEqual(['sleep']);
    advance(sim, 10);
    expect(player(sim).activity?.kind).toBe('sleep');
    expect(sim.state().objects.find(o => o.id === 'bed')!.occupiedBy).toBe('player');
  });
});
