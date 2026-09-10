import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync } from 'node:fs';
import { actorView, createWorld, resolveAction } from '../shared/engine';
import { interpret, providerInfo } from './model';
import type { World } from '../shared/types';

const checks: Array<{ name: string; input: string; world: World; verify: (world: World) => void }> = [];
const chest = createWorld('asleep');
chest.entities.player.location = { kind: 'ground', x: 2, y: 2 };
checks.push({ name: 'open container', input: 'Let me have a peek inside the traveler’s chest.', world: chest, verify: w => assert.equal(w.entities.chest.props.open, true) });
const note = structuredClone(chest); note.entities.chest.props.open = true;
checks.push({ name: 'read private clue', input: 'Read the folded paper without taking it.', world: note, verify: w => assert.ok(w.actors.player.memories.some(o => o.kind === 'discovery' && o.subject === 'letter')) });
const putBack = structuredClone(note); putBack.entities.letter.location = { kind: 'held', actor: 'player' };
checks.push({ name: 'put inside container', input: 'Put my note back inside the open chest.', world: putBack, verify: w => assert.deepEqual(w.entities.letter.location, { kind: 'contained', container: 'chest' }) });
const pry = createWorld('asleep'); pry.entities.player.location = { kind: 'ground', x: 10, y: 4 }; pry.entities.crowbar.location = { kind: 'held', actor: 'player' };
checks.push({ name: 'force latch with tool', input: 'Use my crowbar to force this gate open.', world: pry, verify: w => { assert.equal(w.entities.gate.props.broken, true); assert.equal(w.actors.guard.wakefulness, 'awake'); } });
const report = { provider: providerInfo(), checks: [] as Array<Record<string, unknown>> };
for (const check of checks) {
  const result = await interpret(actorView(check.world, 'player'), check.input);
  console.log(JSON.stringify({name:check.name,decision:result.decision}));
  const resolved = resolveAction(check.world, result.decision.action);
  assert.ok(resolved.ok, `${check.name}: ${resolved.reason}`);
  check.verify(resolved.world);
  report.checks.push({ name: check.name, input: check.input, latencyMs: result.latencyMs, action: result.decision.action, passed: true });
  console.log(`${check.name}: PASS (${result.latencyMs}ms)`);
}
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/teammate-probe.json', JSON.stringify(report, null, 2));
