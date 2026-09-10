import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Coordinator } from './coordinator';
import { DEFAULT_APPEARANCE } from '../shared/appearance';
import type { ActorView, World } from '../shared/types';

function setup() {
  const path = join(mkdtempSync(join(tmpdir(), 'astra-integration-')), 'session.json');
  const model = {
    info: () => ({ provider: 'offline' as const, model: 'test', available: false, label: 'Test' }),
    interpret: vi.fn(),
    decide: vi.fn(async (view: ActorView) => ({ decision: { action: { actor: view.actor.id, intent: 'Rest', ops: [{ kind: 'transform' as const, entity: view.actor.id, rule: 'rest' as const }] }, explanation: 'Rest' }, latencyMs: 0, provider: 'test' })),
  };
  return { path, model, c: new Coordinator(path, model) };
}

describe('request identity from teammate integration', () => {
  it('inspects locally without asking unchanged observers to think again', async () => {
    const { c, model } = setup(); const before = c.state();
    const result = await c.act({ worldId: before.id, version: before.version, requestId: 'inspect', direct: { kind: 'inspect', entity: 'player' } });
    expect(result.ok).toBe(true);
    expect(result.events.some(event => event.kind === 'inspect')).toBe(true);
    expect(model.decide).not.toHaveBeenCalled();
  });
  it('rejects different content under an already committed request ID after reload', async () => {
    const { path, model, c } = setup();
    const before = c.state();
    const request = { worldId: before.id, version: before.version, requestId: 'same-id', direct: { kind: 'move' as const, x: 3, y: 4 } };
    await c.act(request);
    const resumed = new Coordinator(path, model), committed = resumed.state();
    await expect(resumed.act({ ...request, direct: { kind: 'move', x: 2, y: 3 } })).rejects.toThrow(/different action/i);
    expect(resumed.state()).toEqual(committed);
    expect((await resumed.act(request)).source).toBe('saved');
  });
  it('recognizes identical retry content regardless of JSON property order', async () => {
    const { c } = setup(); const before = c.state();
    const request = { worldId: before.id, version: before.version, requestId: 'ordered', direct: { kind: 'move' as const, x: 3, y: 4 } };
    await c.act(request);
    expect((await c.act({ ...request, direct: { y: 4, x: 3, kind: 'move' } })).source).toBe('saved');
  });
});

describe('authoritative manual character drafts', () => {
  it('persists cosmetics without advancing time, reacting, or changing game capabilities', () => {
    const { path, model, c } = setup(); const before = c.state();
    const after = c.updateCharacter({ worldId: before.id, version: before.version, name: 'Akito', appearance: { ...DEFAULT_APPEARANCE, clothing: 'violet' } });
    expect(after.entities.find(e => e.id === 'player')?.name).toBe('Akito');
    expect(after.actors.find(a => a.id === 'player')?.appearance?.clothing).toBe('violet');
    expect(after.tick).toBe(before.tick); expect(after.version).toBe(before.version + 1);
    expect(after.player).toEqual(before.player); expect(after.events).toEqual(before.events);
    expect(model.interpret).not.toHaveBeenCalled(); expect(model.decide).not.toHaveBeenCalled();
    expect(new Coordinator(path, model).state()).toEqual(after);
    const raw = JSON.parse(readFileSync(path, 'utf8')) as World;
    expect(raw.actors.player.capabilities).toEqual([]);
    const fresh = c.newWorld('tired');
    expect(fresh.entities.find(e => e.id === 'player')?.name).toBe('Akito');
    expect(fresh.actors.find(a => a.id === 'player')?.appearance?.clothing).toBe('violet');
    expect(fresh.tick).toBe(0);
  });
  it('rejects stale drafts and arbitrary powers before writing anything', async () => {
    const { c } = setup(); const before = c.state();
    const draft = { worldId: before.id, version: before.version, name: 'Akito', appearance: DEFAULT_APPEARANCE };
    await c.act({ worldId: before.id, version: before.version, requestId: 'walk', direct: { kind: 'move', x: 3, y: 4 } });
    const committed = c.state();
    expect(() => c.updateCharacter(draft)).toThrow(/changed/i);
    expect(() => c.updateCharacter({ ...draft, version: committed.version, appearance: { ...DEFAULT_APPEARANCE, clothing: 'invincible' } } as never)).toThrow();
    expect(() => c.updateCharacter({ ...draft, version: committed.version, hp: 100 } as never)).toThrow();
    expect(c.state()).toEqual(committed);
  });
  it('rejects a draft from a replaced story', () => {
    const { c } = setup(); const before = c.state(); c.newWorld();
    expect(() => c.updateCharacter({ worldId: before.id, version: before.version, name: 'Old', appearance: DEFAULT_APPEARANCE })).toThrow(/previous story/i);
  });
});
