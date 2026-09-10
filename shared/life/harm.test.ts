import { describe, expect, it } from 'vitest';
import { HARM, HURT_THRESHOLD, hurtAfterRecovery, refusesContact, traitsAfterHarm } from './harm';

describe('harm consequences', () => {
  it('makes a punch cost far more than a threat on every axis', () => {
    for (const key of ['relationship', 'witness'] as const) expect(HARM.physical[key]).toBeLessThan(HARM.threat[key]);
    expect(HARM.physical.hurt).toBeGreaterThan(HARM.threat.hurt);
    for (const need of ['energy', 'fun', 'social'] as const) expect(HARM.physical.needs[need]).toBeLessThan(HARM.threat.needs[need]);
  });

  it('leaves a punched resident visibly injured rather than merely disapproving', () => {
    expect(HARM.physical.hurt).toBeGreaterThan(HURT_THRESHOLD);
    expect(refusesContact(HARM.physical.hurt, 0)).toBe(true);
  });

  it('wrecks the relationship enough that the target refuses contact on that alone', () => {
    expect(refusesContact(0, HARM.physical.relationship)).toBe(true);
  });

  it('marks the player the first time they hurt someone', () => {
    expect(traitsAfterHarm(['Curious', 'Kind'], 0)).toEqual(['Curious', 'Kind']);
    expect(traitsAfterHarm(['Curious', 'Kind'], 1)).toContain('Callous');
  });

  it('escalates to a standing reputation and removes the milder mark', () => {
    const earned = traitsAfterHarm(['Kind'], 3);
    expect(earned).toContain('Violent');
    expect(earned).not.toContain('Callous');
    expect(earned).toContain('Kind');
  });

  it('never awards the same trait twice however many times it is recomputed', () => {
    let traits = ['Kind'];
    for (let i = 0; i < 6; i++) traits = traitsAfterHarm(traits, 4);
    expect(traits.filter(trait => trait === 'Violent')).toHaveLength(1);
  });

  it('heals an injury over simulated time but not within one conversation', () => {
    // A punch must still be in effect minutes later, and gone before the next in-game day.
    expect(hurtAfterRecovery(HARM.physical.hurt, 60)).toBeGreaterThan(HURT_THRESHOLD);
    expect(hurtAfterRecovery(HARM.physical.hurt, 2000)).toBe(0);
    expect(hurtAfterRecovery(0, 5000)).toBe(0);
  });

  it('lets an unharmed resident on good terms be approached', () => {
    expect(refusesContact(0, 12)).toBe(false);
  });
});
