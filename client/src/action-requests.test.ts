import { expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Coordinator } from '../../server/coordinator';
import { ActionRequests } from './action-requests';

it('resolves a lost response with the original request instead of taking a second turn', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-client-retry-'));
  try {
    const c = new Coordinator(join(dir, 'session.json'), {
      info: () => ({ provider: 'offline', available: false, label: 'Offline test', model: '' }),
      interpret: async () => { throw new Error('offline'); },
      decide: async () => { throw new Error('offline'); },
    });
    const requests = new ActionRequests();
    const payload = { direct: { kind: 'wait' as const } };
    const first = requests.begin(c.state(), payload);
    await c.act(first); // Commit succeeds, then the transport loses its response.
    const committed = c.state();
    const retried = await c.act(requests.begin(committed, payload));
    expect(retried.source).toBe('saved');
    expect(retried.state.tick).toBe(committed.tick);
    expect(retried.state.events.filter(e => e.actor === 'player' && e.kind === 'rest')).toHaveLength(1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('does not replace an uncertain move with a different intention', () => {
  const requests = new ActionRequests();
  const original = requests.begin({ id: 'world', version: 0 }, { input: 'Pick up the vase' });
  expect(() => requests.begin({ id: 'world', version: 4 }, { input: 'Break the vase' })).toThrow(/previous|check/i);
  expect(requests.current).toEqual(original);
});

it('clears the old request when a new story is loaded', () => {
  const requests = new ActionRequests();
  const old = requests.begin({ id: 'old', version: 0 }, { direct: { kind: 'wait' } });
  const fresh = requests.begin({ id: 'new', version: 0 }, { direct: { kind: 'wait' } });
  expect(fresh.requestId).not.toBe(old.requestId);
  expect(fresh.worldId).toBe('new');
});

it('lets the same intention start a new turn after its previous response is resolved', () => {
  const requests = new ActionRequests();
  const original = requests.begin({ id: 'world', version: 0 }, { direct: { kind: 'wait' } });
  requests.clear();
  const fresh = requests.begin({ id: 'world', version: 4 }, { direct: { kind: 'wait' } });
  expect(fresh.requestId).not.toBe(original.requestId);
  expect(fresh.version).toBe(4);
});
