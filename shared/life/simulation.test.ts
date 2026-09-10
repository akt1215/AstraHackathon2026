import { describe, it, expect } from 'vitest';
import { LifeSimulation } from './simulation';

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
  });
});
