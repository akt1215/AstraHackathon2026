import { describe, expect, it } from 'vitest';
import { createWorld, publicState } from '../../shared/engine';
import { guidance, journalEntries, soundCue, pixelTraveler } from './presentation';

describe('observable presentation', () => {
  it('guides to the injured companion before the gate, and stops on completion', () => {
    const world = createWorld();
    const view = publicState(world);
    expect(guidance(view).target).toBe('companion');
    view.objective.status = 'complete';
    expect(guidance(view).target).toBeUndefined();
    expect(guidance(view).text).toMatch(/reached|complete/i);
  });
  it('never gives a location for an entity missing from the public view', () => {
    const view = publicState(createWorld());
    view.entities = view.entities.filter(e => e.id !== 'companion');
    expect(guidance(view).target).not.toBe('companion');
    expect(guidance(view).text).not.toMatch(/Ivo.*(?:north|south|east|west)/);
  });
  it('keeps the journal grounded in provided events and suppresses walking noise', () => {
    const view = publicState(createWorld());
    view.journal = [
      { id: '1', tick: 1, kind: 'move', actor: 'player', text: 'A step', location: { x: 1, y: 1 }, noise: 0, witnesses: [] },
      { id: '2', tick: 2, kind: 'heal', actor: 'player', text: 'You bandaged Ivo.', location: { x: 1, y: 1 }, noise: 0, witnesses: [] },
    ];
    expect(journalEntries(view).map(e => e.id)).toEqual(['2']);
    expect(journalEntries(view)[0]?.text).toBe('You bandaged Ivo.');
  });
  it('uses an explicit sound map and leaves idle speech silent', () => {
    expect(soundCue('move')).toBe('step');
    expect(soundCue('inspect')).toBe('inspect');
    expect(soundCue('take')).toBe('take');
    expect(soundCue('talk')).toBeNull();
    expect(soundCue('invented')).toBeNull();
  });
  it('renders distinct facing and visible fatigue without interpreting actions', () => {
    expect(pixelTraveler(undefined, 'north')).not.toBe(pixelTraveler(undefined, 'south'));
    expect(pixelTraveler(undefined, 'south')).toContain('shape-rendering="crispEdges"');
  });
});
