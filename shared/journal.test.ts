import { expect, it } from 'vitest';
import { createWorld, publicState, resolveAction } from './engine';
import type { Primitive, World } from './types';

it('retains discovered writing after feed churn, rereading, and save round trip', () => {
  let w = createWorld();
  w.entities.player.location = { kind: 'ground', x: 2, y: 2 };
  const act = (op: Primitive) => {
    const result = resolveAction(w, { actor: 'player', intent: 'Read and continue', ops: [op] });
    expect(result.ok).toBe(true); w = result.world;
  };
  act({ kind: 'transform', entity: 'chest', rule: 'open' });
  act({ kind: 'transform', entity: 'letter', rule: 'inspect' });
  const text = w.entities.letter.props.clue;
  for (let i = 0; i < 130; i++) act({ kind: 'emote', text: `Remembered moment ${i}`, topic: 'talk' });
  w = JSON.parse(JSON.stringify(w)) as World;
  act({ kind: 'transform', entity: 'letter', rule: 'inspect' });
  const view = publicState(w);
  expect(view.events.some(e => e.kind === 'discovery')).toBe(false);
  expect(view.journal.filter(e => e.kind === 'discovery').map(e => e.text)).toEqual([text]);
  expect(view.journal.filter(e => e.kind !== 'discovery')).toHaveLength(120);
});

it('keeps a journal of personal observations without revealing hidden facts or noise identities', () => {
  const w = createWorld();
  w.events = [
    { id: 'secret', tick: 1, kind: 'discovery', actor: 'guard', subject: 'letter', text: 'A private NPC clue', location: { x: 8, y: 2 }, noise: 0, witnesses: ['guard'] },
    { id: 'heard', tick: 1, kind: 'impact', actor: 'guard', text: 'Mara broke a secret object', location: { x: 8, y: 2 }, noise: 8, witnesses: ['guard'], data: { secret: true } },
  ];
  w.actors.player.memories.push({ id: 'heard:player', eventId: 'heard', tick: 1, kind: 'noise_heard', text: 'A loud sound came from (8, 2).', location: { x: 8, y: 2 }, lineage: ['heard'] });
  expect(publicState(w).journal).toEqual([{ id: 'heard', tick: 1, kind: 'noise_heard', actor: 'unknown', text: 'A loud sound came from (8, 2).', location: { x: 8, y: 2 }, noise: 8, witnesses: [] }]);
});
