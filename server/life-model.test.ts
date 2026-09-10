import { describe, expect, it } from 'vitest';
import { LifeModel, parseReaction } from './life-model';

describe('resident model boundary', () => {
  it('rejects invented numeric powers and oversized speech instead of patching the world', () => {
    expect(() => parseReaction({ action: 'share', speech: 'Yes', relationship: 100 })).toThrow();
    expect(() => parseReaction({ action: 'teleport', speech: 'Yes' })).toThrow();
    expect(() => parseReaction({ action: 'share', speech: 'x'.repeat(401) })).toThrow();
    // An omitted classification must mean no harm, never an implied one.
    expect(parseReaction({ action: 'walk_away', speech: 'I need some space.' })).toEqual({ action: 'walk_away', speech: 'I need some space.', harm: 'none' });
    expect(() => parseReaction({ action: 'share', speech: 'Yes', harm: 'catastrophic' })).toThrow();
    expect(parseReaction({ action: 'decline', speech: 'Get away from me.', harm: 'physical' }).harm).toBe('physical');
  });
  it('reports an explicitly selected Astra without a key as unavailable, never as Claude', () => {
    const model = new LifeModel({ LIFE_PROVIDER: 'openai' });
    expect(model.info().name).toContain('Astra'); expect(model.info().available).toBe(false);
  });
  it('keeps offline routines explicit and makes no model calls', () => {
    const model = new LifeModel({ LIFE_PROVIDER: 'offline' });
    expect(model.info().model).toBe('offline'); expect(model.info().calls).toBe(0);
  });
});
