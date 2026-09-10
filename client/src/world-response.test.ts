import { describe, expect, it } from 'vitest';
import { belongsToCurrentWorld } from './world-response';

describe('responses from a particular story', () => {
  it('accepts a response only while both current and returned stories match its origin', () => {
    expect(belongsToCurrentWorld('first', { id: 'first' }, { id: 'first' })).toBe(true);
  });
  it('rejects a late cosmetic success or error after polling discovers a new story', () => {
    for (const result of [{ state: { id: 'first' } }, { error: 'stale', state: { id: 'first' } }]) {
      expect(belongsToCurrentWorld('first', { id: 'second' }, result.state)).toBe(false);
    }
  });
  it('rejects a different returned story even before polling notices the replacement', () => {
    expect(belongsToCurrentWorld('first', { id: 'first' }, { id: 'second' })).toBe(false);
    expect(belongsToCurrentWorld('first', undefined, { id: 'first' })).toBe(false);
  });
});
