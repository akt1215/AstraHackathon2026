import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { LifeSnapshot } from '../shared/life/simulation';
import { snapshotSchema } from './life-schema';
export class LifeStore {
  constructor(private path: string) {}
  load(): LifeSnapshot | undefined {
    if (!existsSync(this.path)) return undefined;
    try { return snapshotSchema.parse(JSON.parse(readFileSync(this.path, 'utf8'))); }
    catch { throw new Error('The life save has an unsupported format. Preserve it and choose a new LIFE_DATA_FILE.'); }
  }
  save(snapshot: LifeSnapshot): void {
    const checked = snapshotSchema.parse(snapshot);
    mkdirSync(dirname(this.path), { recursive: true });
    const temp = `${this.path}.${randomUUID()}.tmp`; let fd: number | undefined;
    try { fd = openSync(temp, 'wx', 0o600); writeFileSync(fd, JSON.stringify(checked)); fsyncSync(fd); closeSync(fd); fd = undefined; renameSync(temp, this.path); }
    finally { if (fd !== undefined) closeSync(fd); if (existsSync(temp)) unlinkSync(temp); }
  }
}
