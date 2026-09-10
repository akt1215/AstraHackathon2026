import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LifeStore } from './life-store';
import { LifeSimulation } from '../shared/life/simulation';
const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fresh() { const dir = mkdtempSync(join(tmpdir(), 'life-store-test-')); directories.push(dir); return { dir, path: join(dir, 'session.json') }; }
describe('durable life snapshots', () => {
  it('round trips a changed world and leaves no temporary files', () => {
    const { dir, path } = fresh(); const sim = new LifeSimulation(); sim.tick(.1);
    const store = new LifeStore(path); store.save(sim.snapshot());
    expect(store.load()).toEqual(sim.snapshot()); expect(readdirSync(dir)).toEqual(['session.json']);
  });
  it('rejects corrupt shape while preserving the original bytes', () => {
    const { path } = fresh(); const bytes = '{"format":1,"state":{"residents":[]}}'; writeFileSync(path, bytes);
    expect(() => new LifeStore(path).load()).toThrow(); expect(readFileSync(path, 'utf8')).toBe(bytes);
  });
});
