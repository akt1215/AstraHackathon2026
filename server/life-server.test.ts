import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLifeServer } from './life-server';
import type { ReactionDecision } from '../shared/life/simulation';
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });
async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'life-http-test-'));
  let complete: ((decision: ReactionDecision) => void) | undefined;
  let busy = false, calls = 0;
  const model = { info: () => ({ name: 'test provider', model: 'test', available: true, busy, error: null, lastLatencyMs: null, calls }), react: () => { busy = true; calls++; return new Promise<ReactionDecision>(resolve => { complete = resolve; }).finally(() => { busy = false; }); } };
  const app = createLifeServer({ dataFile: join(dir, 'save.json'), model, ticking: false });
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('No test port');
  const base = `http://127.0.0.1:${address.port}`;
  cleanups.push(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
  async function post(command: unknown, worldId = app.sim.state().id, requestId: string = crypto.randomUUID(), origin = 'http://127.0.0.1:5175') {
    return fetch(`${base}/api/life/command`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ worldId, requestId, command }) });
  }
  return { app, base, post, complete: (decision: ReactionDecision) => complete?.(decision) };
}
describe('local life HTTP service', () => {
  it('accepts the isolated Vite origin and rejects unrelated browser origins and invalid payloads', async () => {
    const { app, post } = await setup();
    expect((await post({ kind: 'speed', speed: 3 })).status).toBe(200);
    expect((await post({ kind: 'speed', speed: 0 }, app.sim.state().id, 'foreign', 'https://example.com')).status).toBe(403);
    expect((await post({ kind: 'speed', speed: 99 })).status).toBe(400);
    expect(app.sim.state().speed).toBe(3);
  });
  it('returns pending talk immediately, allows time and movement, and rejects a late model effect', async () => {
    const { app, post, complete } = await setup();
    app.sim.command({ worldId: app.sim.state().id, requestId: 'approach', command: { kind: 'walk', x: 2, z: 3.5 } });
    for (let i = 0; i < 30; i++) app.sim.tick(.1);
    expect((await post({ kind: 'talk', targetId: 'june', text: 'Hello June' })).status).toBe(200);
    const before = app.sim.state().elapsed; app.sim.tick(.1); expect(app.sim.state().elapsed).toBeGreaterThan(before);
    expect((await post({ kind: 'cancel' })).status).toBe(200);
    complete({ action: 'share', speech: 'A late answer' });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(app.sim.state().events.some(e => e.text.includes('A late answer'))).toBe(false);
  });
  it('replays an accepted talk request while the provider is busy without requesting another reply', async () => {
    const { app, post, complete } = await setup();
    app.sim.command({ worldId: app.sim.state().id, requestId: 'approach', command: { kind: 'walk', x: 2, z: 3.5 } });
    for (let i = 0; i < 30; i++) app.sim.tick(.1);
    const world = app.sim.state().id, command = { kind: 'talk', targetId: 'june', text: 'Hello June' };
    expect((await post(command, world, 'one-conversation')).status).toBe(200);
    expect((await post(command, world, 'one-conversation')).status).toBe(200);
    expect((await post(command, world, 'another-conversation')).status).toBe(409);
    expect(app.sim.state().provider.calls).toBe(1);
    complete({ action: 'accept_chat', speech: 'Hello!' });
  });
});
