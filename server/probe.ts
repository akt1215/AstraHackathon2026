import { pathToFileURL } from 'node:url';
import { decideNpc, interpret, providerInfo } from './model';
import type { ActorView } from '../shared/types';

export function probeView(role: 'player' | 'npc'): ActorView {
  const id = role === 'npc' ? 'guard' : 'player';
  const self = { id, name: role === 'npc' ? 'Guard' : 'Traveler', kind: 'actor' as const, location: { kind: 'ground' as const, x: 1, y: 1 }, description: 'A room occupant.', icon: '@', props: {} };
  return {
    actor: { id, role, hp: 10, maxHp: 10, fatigue: role === 'npc' ? 80 : 10, wakefulness: 'awake', attention: null, facing: 'west', mood: 'alert', goal: role === 'npc' ? 'Protect the gate, investigate suspicious sounds when sensible.' : 'Reach the passage.', memories: [], evidence: [], tendencies: {}, capabilities: [], relationships: {}, coins: 10, permission: false },
    self, entities: [self, { id: 'key', name: 'Small key', kind: 'item', location: { kind: 'ground', x: 2, y: 1 }, description: 'A portable metal key.', icon: 'k', props: { portable: true, size: 1 } }],
    observations: [{ id: 'o1', eventId: 'e1', tick: 0, kind: 'heard', text: 'An unidentified clatter to the east.', location: { x: 4, y: 1 }, lineage: ['e1'] }],
    width: 7, height: 5, walls: [], tick: 1, version: 1, knownIssues: [],
  };
}
async function main(): Promise<void> {
  console.log(JSON.stringify({ provider: providerInfo() }));
  const result = process.argv.includes('--npc') ? await decideNpc(probeView('npc')) : await interpret(probeView('player'), process.argv.slice(2).join(' ') || 'Scoop up the little key beside me.');
  console.log(JSON.stringify(result, null, 2));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Probe failed.'); process.exitCode = 1;
});
