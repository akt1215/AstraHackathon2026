import { describe, expect, it } from 'vitest';
import { actorView, createWorld, directAction, publicState, resolveAction } from './engine';
import { position } from './perception';
import type { Primitive, World } from './types';

function run(w: World, ...ops: Primitive[]) {
  const result = resolveAction(w, { actor: 'player', intent: 'Interact with the room', ops });
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}
function setup() {
  const w = createWorld('asleep');
  w.entities.player.location = { kind: 'ground', x: 2, y: 2 };
  return w;
}
describe('reusable room interactions', () => {
  it('keeps closed contents and clue text out of both projections and rejects guessed access', () => {
    const w = setup();
    expect(w.entities.letter).toBeDefined();
    const secret = w.entities.letter.props.clue!;
    expect(JSON.stringify(publicState(w))).not.toContain(secret);
    expect(JSON.stringify(actorView(w, 'player'))).not.toContain(secret);
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    for (const op of [
      { kind: 'transfer', entity: 'letter', to: 'player' },
      { kind: 'transform', entity: 'letter', rule: 'inspect' },
      { kind: 'move', entity: 'letter', style: 'throw', x: 4, y: 2 },
    ] as Primitive[]) expect(resolveAction(w, { actor: 'player', intent: 'guess', ops: [op] }).ok).toBe(false);
  });
  it('opens a chest without dumping its contents and learns a clue only through inspection', () => {
    let w = run(setup(), { kind: 'transform', entity: 'chest', rule: 'open' });
    expect(w.entities.letter.location).toEqual({ kind: 'contained', container: 'chest' });
    expect(publicState(w).entities.find(e => e.id === 'letter')?.location.kind).toBe('ground');
    expect(JSON.stringify(actorView(w, 'player'))).not.toContain(w.entities.letter.props.clue!);
    w = run(w, { kind: 'transform', entity: 'letter', rule: 'inspect' });
    expect(w.actors.player.memories.some(o => o.kind === 'discovery' && o.text === w.entities.letter.props.clue)).toBe(true);
    expect(w.actors.companion.memories.some(o => o.text === w.entities.letter.props.clue)).toBe(false);
    w = run(w, { kind: 'transfer', entity: 'letter', to: 'player' });
    expect(w.entities.letter.location).toEqual({ kind: 'held', actor: 'player' });
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
  it('enforces every container ancestor and supports placing held items back inside', () => {
    let w = setup();
    w.entities.inner = { id: 'inner', name: 'Inner box', kind: 'fixture', icon: 'box', description: 'Nested box', props: { container: true, open: true }, location: { kind: 'contained', container: 'chest' } };
    w.entities.letter.location = { kind: 'contained', container: 'inner' };
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    w = run(w, { kind: 'transform', entity: 'chest', rule: 'open' });
    w = run(w, { kind: 'transfer', entity: 'letter', to: 'player' });
    w = run(w, { kind: 'transfer', entity: 'letter', to: 'inner' });
    expect(w.entities.letter.location).toEqual({ kind: 'contained', container: 'inner' });
    w = run(w, { kind: 'transform', entity: 'chest', rule: 'close' });
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    const before = structuredClone(w);
    expect(resolveAction(w, { actor: 'player', intent: 'take', ops: [{ kind: 'transfer', entity: 'letter', to: 'player' }] }).ok).toBe(false);
    expect(w).toEqual(before);
  });
  it('activates only a reachable linked fixture and makes the actual change observable', () => {
    let w = setup();
    expect(resolveAction(w, { actor: 'player', intent: 'switch', ops: [{ kind: 'transform', entity: 'release', rule: 'activate' }] }).ok).toBe(false);
    w.entities.player.location = { kind: 'ground', x: 8, y: 2 };
    w = run(w, { kind: 'transform', entity: 'release', rule: 'activate' });
    expect(w.entities.shutter.props.open).toBe(true);
    expect(w.entities.shutter.props.locked).toBe(false);
    expect(w.events.at(-1)?.subject).toBe('shutter');
  });
  it('requires a held lever and spends effort for a noisy permanent damaged opening', () => {
    let w = setup();
    w.entities.player.location = { kind: 'ground', x: 10, y: 4 };
    const op: Primitive = { kind: 'transform', entity: 'crowbar', rule: 'pry', target: 'gate' };
    expect(resolveAction(w, { actor: 'player', intent: 'pry', ops: [op] }).ok).toBe(false);
    w.entities.crowbar.location = { kind: 'held', actor: 'player' };
    w = run(w, op);
    expect(w.entities.gate.props).toMatchObject({ open: true, locked: false, broken: true });
    expect(w.actors.player.fatigue).toBe(30);
    expect(w.events.at(-1)).toMatchObject({ kind: 'impact', subject: 'gate', noise: 8 });
    expect(w.actors.guard.wakefulness).toBe('awake');
    expect(resolveAction(w, { actor: 'player', intent: 'close', ops: [{ kind: 'transform', entity: 'gate', rule: 'close' }] }).ok).toBe(false);
  });
  it('keeps forced entry subject to guard access and fatigue constraints', () => {
    const w = createWorld(); w.entities.player.location = { kind: 'ground', x: 10, y: 4 }; w.entities.crowbar.location = { kind: 'held', actor: 'player' };
    const action = { actor: 'player', intent: 'pry', ops: [{ kind: 'transform', entity: 'crowbar', rule: 'pry', target: 'gate' }] } as const;
    expect(resolveAction(w, { ...action, ops: [...action.ops] }).ok).toBe(false);
    w.actors.guard.wakefulness = 'asleep'; w.actors.player.fatigue = 90;
    expect(resolveAction(w, { ...action, ops: [...action.ops] }).ok).toBe(false);
  });
  it('consumes food once, restoring bounded fatigue without healing', () => {
    let w = setup(); w.entities.ration.location = { kind: 'held', actor: 'player' }; w.actors.player.fatigue = 8;
    const hp = w.actors.player.hp;
    w = run(w, { kind: 'transform', entity: 'ration', rule: 'eat' });
    expect(w.actors.player.fatigue).toBe(0); expect(w.actors.player.hp).toBe(hp);
    expect(w.entities.ration.location.kind).toBe('removed');
    expect(resolveAction(w, { actor: 'player', intent: 'eat again', ops: [{ kind: 'transform', entity: 'ration', rule: 'eat' }] }).ok).toBe(false);
    expect(w.events.at(-1)?.kind).toBe('eat');
  });
  it('retains an unpaid food obligation after its consumed item disappears', () => {
    let w = setup(); w.entities.ration.props.owner = 'guard'; w.entities.ration.props.price = 2;
    w = run(w, { kind: 'transform', entity: 'chest', rule: 'open' });
    w = run(w, { kind: 'transfer', entity: 'ration', to: 'player' });
    const debt = structuredClone(w.issues[0]);
    w = run(w, { kind: 'transform', entity: 'ration', rule: 'eat' });
    expect(w.issues).toEqual([debt]); expect(w.issues[0].status).toBe('open');
    expect(publicState(w).entities.some(e => e.id === 'ration')).toBe(false);
  });
  it('fails closed for cyclic containers and inherited IDs without throwing', () => {
    const w = setup(); w.entities.chest.location = { kind: 'contained', container: 'chest' };
    expect(position(w, 'letter')).toBeNull();
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    expect(position(w, '__proto__')).toBeNull();
    expect(() => directAction(w, { kind: 'inspect', entity: '__proto__' })).toThrow('Unknown entity');
  });
  it('does not reveal a clue by guessing an item privately held by another character', () => {
    const w = setup(); w.entities.letter.location = { kind: 'held', actor: 'companion' };
    w.entities.player.location = { kind: 'ground', x: 2, y: 5 };
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    expect(resolveAction(w, { actor: 'player', intent: 'read another inventory', ops: [{ kind: 'transform', entity: 'letter', rule: 'inspect' }] }).ok).toBe(false);
  });
  it.each([false, true])('keeps contents private through another actor’s held container (nested=%s)', nested => {
    const w = setup();
    w.entities.player.location = { kind: 'ground', x: 2, y: 5 };
    w.entities.chest.props.open = true; w.entities.chest.props.portable = true;
    w.entities.chest.location = { kind: 'held', actor: 'companion' };
    if (nested) {
      w.entities.inner = { id: 'inner', name: 'Inner case', kind: 'fixture', icon: 'box', description: 'An open case', props: { container: true, open: true }, location: { kind: 'contained', container: 'chest' } };
      w.entities.letter.location = { kind: 'contained', container: 'inner' };
    }
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
    expect(actorView(w, 'player').entities.some(e => e.id === 'letter')).toBe(false);
    const before = structuredClone(w);
    expect(resolveAction(w, { actor: 'player', intent: 'read another bag', ops: [{ kind: 'transform', entity: 'letter', rule: 'inspect' }] }).ok).toBe(false);
    expect(resolveAction(w, { actor: 'player', intent: 'steal through bag', ops: [{ kind: 'transfer', entity: 'letter', to: 'player' }] }).ok).toBe(false);
    expect(w).toEqual(before);
    w.entities.chest.location = { kind: 'held', actor: 'player' };
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(true);
    expect(actorView(w, 'player').entities.some(e => e.id === 'letter')).toBe(true);
    expect(resolveAction(w, { actor: 'player', intent: 'read own bag', ops: [{ kind: 'transform', entity: 'letter', rule: 'inspect' }] }).ok).toBe(true);
    expect(actorView(w, 'companion').entities.some(e => e.id === 'letter')).toBe(false);
    w.entities.chest.props.open = false;
    expect(publicState(w).entities.some(e => e.id === 'letter')).toBe(false);
  });
  it('routes direct inspect and held-food interactions through the same rules', () => {
    const w = setup(); w.entities.ration.location = { kind: 'held', actor: 'player' };
    expect(directAction(w, { kind: 'inspect', entity: 'chest' }).ops).toEqual([{ kind: 'transform', entity: 'chest', rule: 'inspect' }]);
    expect(directAction(w, { kind: 'interact', entity: 'ration' }).ops).toEqual([{ kind: 'transform', entity: 'ration', rule: 'eat' }]);
  });
});
