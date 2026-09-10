import { describe, expect, it } from 'vitest';
import type { ActorView } from '../shared/types';
import { buildPrompt, parseDecision, parseCliOutput, providerInfo, decisionJsonSchema } from './model';

const view: ActorView = {
  actor: { id: 'guard', role: 'npc', hp: 10, maxHp: 10, fatigue: 80, wakefulness: 'awake', attention: null, facing: 'west', mood: 'wary', goal: 'watch the gate', memories: [], evidence: [], tendencies: { vigilance: 2 }, capabilities: [], relationships: { player: { trust: -1, fear: 0 } }, coins: 0, permission: false },
  self: { id: 'guard', name: 'Guard', kind: 'actor', location: { kind: 'ground', x: 1, y: 1 }, description: 'Tired', icon: 'G', props: {} },
  entities: [{ id: 'gate', name: 'Gate', kind: 'fixture', location: { kind: 'ground', x: 2, y: 1 }, description: 'Locked', icon: '#', props: { locked: true } }],
  observations: [{ id: 'o1', eventId: 'e1', tick: 1, kind: 'noise', text: 'A sound to the east; its maker is unknown.', location: { x: 4, y: 1 }, lineage: ['e1'] }],
  width: 7, height: 5, walls: [], tick: 2, version: 3, knownIssues: [],
};
const valid = () => ({ action: { actor: 'guard', intent: 'Look toward the sound', ops: [{ kind: 'transform', entity: 'guard', rule: 'look', target: null, x: 4, y: 1 }] }, explanation: 'A heard sound merits attention.' });

describe('model decision boundary', () => {
  it('normalizes nullable wire fields and preserves grounded actions', () => {
    expect(parseDecision(valid(), view).action.ops).toEqual([{ kind: 'transform', entity: 'guard', rule: 'look', x: 4, y: 1 }]);
  });
  it('rejects actor impersonation instead of silently changing it', () => {
    const value = valid(); value.action.actor = 'player';
    expect(() => parseDecision(value, view)).toThrow(/actor/i);
  });
  it('rejects invented entities, private evidence, unbounded compositions, and arbitrary state edits', () => {
    const hidden = valid(); hidden.action.ops[0].entity = 'hidden-vase';
    expect(() => parseDecision(hidden, view)).toThrow(/known|visible/i);
    const tooMany = valid(); tooMany.action.ops = Array(4).fill(tooMany.action.ops[0]);
    expect(() => parseDecision(tooMany, view)).toThrow();
    const repeated = valid(); repeated.action.ops = Array(2).fill(repeated.action.ops[0]);
    expect(() => parseDecision(repeated, view)).toThrow(/one|significant/i);
    expect(() => parseDecision({ action: { actor: 'guard', intent: 'Accuse', ops: [{ kind: 'emote', text: 'You stole it', topic: 'accuse', target: null, evidence: ['private-event'] }] }, explanation: 'Omniscience' }, view)).toThrow(/evidence|known/i);
    expect(() => parseDecision({ ...valid(), state: { permission: true } }, view)).toThrow();
    expect(() => parseDecision({ action: { actor: 'guard', intent: 'Win', ops: [{ kind: 'transform', entity: 'guard', rule: 'win', target: null, x: null, y: null }] }, explanation: 'Win' }, view)).toThrow();
  });
  it('rejects moving a visible actor other than self', () => {
    const other = { ...view.self, id: 'player' };
    const proposal = { action: { actor: 'guard', intent: 'Move the player', ops: [{ kind: 'move', entity: 'player', x: 2, y: 1, style: 'walk' }] }, explanation: 'Control another actor' };
    expect(() => parseDecision(proposal, { ...view, entities: [...view.entities, other] })).toThrow(/another actor/i);
  });
  it('checks map bounds and transfer recipient identity', () => {
    const bad = valid(); bad.action.ops[0].x = 999;
    expect(() => parseDecision(bad, view)).toThrow(/bound/i);
    expect(() => parseDecision({ action: { actor: 'guard', intent: 'Give gate away', ops: [{ kind: 'transfer', entity: 'gate', to: 'unseen-person', x: null, y: null }] }, explanation: 'Give' }, view)).toThrow();
  });
  it('reads structured CLI envelopes and rejects error envelopes/narrative', () => {
    expect(parseCliOutput(JSON.stringify({ type: 'result', is_error: false, structured_output: valid() }))).toEqual(valid());
    expect(parseCliOutput(JSON.stringify({ type: 'result', result: JSON.stringify(valid()) }))).toEqual(valid());
    expect(() => parseCliOutput('{"is_error":true,"result":"sensitive credentials"}')).toThrow(/failed/i);
    expect(() => parseCliOutput('{"is_error":true,"result":"Not logged in · Please run /login"}')).toThrow(/not logged in/i);
    expect(() => parseCliOutput('{"result":"The guard opens the gate."}')).toThrow();
  });
  it('sends the complete actor view without accepting extra omniscient properties', () => {
    const prompt = buildPrompt({ ...view, secretWorldLog: 'PRIVATE_SENTINEL' } as ActorView, { kind: 'npc' });
    expect(prompt).toContain('watch the gate');
    expect(prompt).toContain('vigilance');
    expect(prompt).toContain('maker is unknown');
    expect(prompt).toContain('80');
    expect(prompt).not.toContain('PRIVATE_SENTINEL');
    expect(prompt).toContain('proposals');
  });
  it('marks missing credentials and unsupported providers unavailable', () => {
    expect(providerInfo({ ASTRA_PROVIDER: 'openai' }).available).toBe(false);
    expect(providerInfo({ ASTRA_PROVIDER: 'offline' }).provider).toBe('offline');
    expect(providerInfo({ ASTRA_PROVIDER: 'invented' }).available).toBe(false);
  });
  it('generates a strict wire schema with nullable fields required', () => {
    expect(decisionJsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    const schema = decisionJsonSchema as unknown as { properties: { action: { properties: { ops: { items: { anyOf: Array<{ required: string[] }> } } } } } };
    expect(schema.properties.action.properties.ops.items.anyOf.find((op) => op.required.includes('rule'))?.required).toContain('target');
  });
});
