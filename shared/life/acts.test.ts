import { describe, expect, it } from 'vitest';
import {
  ACTS, ACT_KINDS, EARNED_TRAITS, FEAR_THRESHOLD, FLEE_RANGE, fearAfterFade, fleesFrom,
  HURT_THRESHOLD, hurtAfterRecovery, refusesContact, traitsAfterActs, type ActKind,
} from './acts';

describe('acts and their consequences', () => {
  it('gives every act except none a defined consequence', () => {
    for (const kind of ACT_KINDS) {
      if (kind === 'none') continue;
      expect(ACTS[kind as Exclude<ActKind, 'none'>], kind).toBeDefined();
    }
  });

  it('moves the world for kindness, not only for harm', () => {
    for (const kind of ['affection', 'gift', 'help', 'praise'] as const) {
      expect(ACTS[kind].relationship, kind).toBeGreaterThan(0);
      expect(ACTS[kind].reputation, kind).toBe('kind');
      expect(ACTS[kind].leaves, kind).toBe(false);
      expect(Object.values(ACTS[kind].needs).some(value => (value ?? 0) > 0), kind).toBe(true);
    }
  });

  it('makes every unkind act cost the relationship and drive the target away', () => {
    for (const kind of ['insult', 'threat', 'theft', 'physical'] as const) {
      expect(ACTS[kind].relationship, kind).toBeLessThan(0);
      expect(ACTS[kind].reputation, kind).toBe('cruel');
      expect(ACTS[kind].witness, kind).toBeLessThan(0);
      expect(ACTS[kind].leaves, kind).toBe(true);
    }
  });

  it('scales violence above every other unkindness on injury and fear', () => {
    for (const kind of ['insult', 'threat', 'theft'] as const) {
      expect(ACTS.physical.hurt).toBeGreaterThan(ACTS[kind].hurt);
      expect(ACTS.physical.relationship).toBeLessThan(ACTS[kind].relationship);
    }
    expect(ACTS.physical.fear).toBeGreaterThan(FEAR_THRESHOLD);
    expect(ACTS.physical.hurt).toBeGreaterThan(HURT_THRESHOLD);
  });

  it('lets affection undo a little fear and injury rather than only stacking harm', () => {
    expect(ACTS.affection.fear).toBeLessThan(0);
    expect(ACTS.affection.hurt).toBeLessThan(0);
  });

  it('earns a reputation in both directions and replaces the milder mark', () => {
    expect(traitsAfterActs(['Kind'], { cruel: 0, kind: 0 })).toEqual(['Kind']);
    expect(traitsAfterActs(['Kind'], { cruel: 1, kind: 0 })).toContain('Callous');
    const violent = traitsAfterActs(['Kind'], { cruel: 3, kind: 0 });
    expect(violent).toContain('Violent');
    expect(violent).not.toContain('Callous');
    const beloved = traitsAfterActs(['Kind'], { cruel: 0, kind: 7 });
    expect(beloved).toContain('Beloved');
    expect(beloved).not.toContain('Thoughtful');
  });

  it('can hold both reputations at once, because people are not one thing', () => {
    const mixed = traitsAfterActs([], { cruel: 1, kind: 3 });
    expect(mixed).toContain('Callous');
    expect(mixed).toContain('Thoughtful');
  });

  it('never awards the same trait twice however often it is recomputed', () => {
    let traits: string[] = [];
    for (let i = 0; i < 6; i++) traits = traitsAfterActs(traits, { cruel: 4, kind: 8 });
    expect(traits.filter(trait => trait === 'Violent')).toHaveLength(1);
    expect(traits.filter(trait => trait === 'Beloved')).toHaveLength(1);
  });

  it('lists every earned trait so the interface can highlight them', () => {
    const earned = traitsAfterActs([], { cruel: 3, kind: 7 });
    for (const trait of earned) expect(EARNED_TRAITS).toContain(trait);
  });

  it('heals an injury over simulated time, and fades fear more slowly still', () => {
    expect(hurtAfterRecovery(ACTS.physical.hurt, 60)).toBeGreaterThan(HURT_THRESHOLD);
    expect(hurtAfterRecovery(ACTS.physical.hurt, 2000)).toBe(0);
    // Fear must outlast the bruise: being frightened of someone does not end when it stops hurting.
    const after = 400;
    expect(fearAfterFade(ACTS.physical.fear, after) / ACTS.physical.fear)
      .toBeGreaterThan(hurtAfterRecovery(ACTS.physical.hurt, after) / ACTS.physical.hurt);
  });

  it('flees only from someone feared who is actually close', () => {
    expect(fleesFrom(ACTS.physical.fear, FLEE_RANGE - .5)).toBe(true);
    expect(fleesFrom(ACTS.physical.fear, FLEE_RANGE + .5)).toBe(false);
    expect(fleesFrom(0, .5)).toBe(false);
    expect(fleesFrom(FEAR_THRESHOLD, .5), 'at the threshold, not past it').toBe(false);
  });

  it('refuses contact for injury, fear or history independently', () => {
    expect(refusesContact(HURT_THRESHOLD + 1, 0, 50)).toBe(true);
    expect(refusesContact(0, FEAR_THRESHOLD + 1, 50)).toBe(true);
    expect(refusesContact(0, 0, -25)).toBe(true);
    expect(refusesContact(0, 0, 12)).toBe(false);
  });
});
