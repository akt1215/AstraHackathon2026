import type { DirectIntent } from '../../shared/types';

export type PlayerIntent = { input: string } | { direct: DirectIntent };
export type PendingRequest = PlayerIntent & { requestId: string; worldId: string; version: number };

/** Keeps only the current browser's in-memory request; player text is never stored. */
export class ActionRequests {
  current: PendingRequest | null = null;
  begin(world: { id: string; version: number }, payload: PlayerIntent): PendingRequest {
    if (this.current) {
      if (this.current.worldId !== world.id) this.clear();
      else {
        const previous = 'input' in this.current ? { input: this.current.input } : { direct: this.current.direct };
        if (JSON.stringify(previous) !== JSON.stringify(payload)) throw new Error('Check the previous move’s result before trying a different action. Your new words are still here.');
        return this.current;
      }
    }
    this.current = { requestId: crypto.randomUUID(), worldId: world.id, version: world.version, ...structuredClone(payload) };
    return this.current;
  }
  clear(): void { this.current = null; }
}
