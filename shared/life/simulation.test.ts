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
});
