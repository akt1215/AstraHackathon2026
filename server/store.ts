import { existsSync, mkdirSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ReactionPhase, World } from '../shared/types';

/** A state snapshot is durable before it becomes the coordinator's visible truth. */
export class SessionStore {
  constructor(readonly path: string) { mkdirSync(dirname(path), {recursive:true}); }
  load(): World | null {
    if (!existsSync(this.path)) return null;
    const value: unknown = JSON.parse(readFileSync(this.path,'utf8'));
    if (!isWorld(value)) throw new Error('Saved world has an unsupported format. Preserve it and choose a new save path.');
    return value;
  }
  save(world: World): void {
    const temp=`${this.path}.${randomUUID()}.tmp`;
    let fd: number | undefined;
    try {
      fd=openSync(temp,'wx',0o600);
      writeFileSync(fd,JSON.stringify(world)); fsyncSync(fd); closeSync(fd); fd=undefined;
      renameSync(temp,this.path);
    } finally {
      if(fd!==undefined) closeSync(fd);
      if(existsSync(temp)) unlinkSync(temp);
    }
  }
}
function isWorld(value: unknown): value is World {
  if(!value || typeof value!=='object') return false;
  const w=value as Partial<World>;
  return typeof w.id==='string' && Number.isInteger(w.version) && Number.isInteger(w.tick)
    && typeof w.width==='number' && typeof w.height==='number' && Array.isArray(w.walls)
    && !!w.entities && !!w.actors?.player && !!w.actors.guard && !!w.actors.companion
    && Array.isArray(w.events) && Array.isArray(w.issues) && !!w.objective && !!w.receipts
    && (w.phase===null || isPhase(w.phase,w));
}

function isPhase(value: unknown, world: Partial<World>): value is ReactionPhase {
  if(!value || typeof value!=='object') return false;
  const phase=value as Partial<ReactionPhase>;
  if(typeof phase.batch!=='string' || phase.tick!==world.tick || typeof phase.finalized!=='boolean'
    || !Array.isArray(phase.slots) || !Array.isArray(phase.completed)) return false;
  if(new Set(phase.slots).size!==phase.slots.length || new Set(phase.completed).size!==phase.completed.length
    || phase.slots.some(id=>typeof id!=='string' || world.actors?.[id]?.role!=='npc')
    || phase.completed.some(id=>!phase.slots!.includes(id))) return false;
  if(phase.finalized && phase.completed.length!==phase.slots.length) return false;
  if(phase.plans!==undefined) {
    if(!phase.plans || typeof phase.plans!=='object' || Array.isArray(phase.plans)
      || Object.keys(phase.plans).length!==phase.slots.length) return false;
    for(const id of phase.slots) {
      const plan=phase.plans[id];
      if(!plan || typeof plan.fallback!=='boolean' || !plan.action || plan.action.actor!==id
        || typeof plan.action.intent!=='string' || !Array.isArray(plan.action.ops)) return false;
    }
  }
  return true;
}
