import { describe, expect, it } from 'vitest';
import { createTrail, playbackDelay, record, sample, SNAP_DISTANCE } from './locomotion';

const WALK_PACE = 1.7;

/**
 * Replay a walk the way the client sees it: the server reports a position every `pollMs`, the
 * renderer draws every `frameMs`. Returns how far the drawn body moved on each frame.
 */
function replay(ms: number, pollMs = 250, frameMs = 8): number[] {
  const trail = createTrail();
  const steps: number[] = [];
  let drawnX: number | null = null, nextPoll = 0;
  for (let t = 0; t <= ms; t += frameMs) {
    if (t >= nextPoll) { record(trail, t, WALK_PACE * (t / 1000), 0); nextPoll = t + pollMs; }
    const at = sample(trail, t);
    if (!at) continue;
    if (drawnX !== null) steps.push(Math.abs(at.x - drawnX));
    drawnX = at.x;
  }
  return steps;
}

describe('rendered locomotion', () => {
  it('keeps the body moving between server polls instead of arriving early and waiting', () => {
    // Skip the warmup where the buffer has not filled and playback is still pinned to the oldest.
    const steady = replay(4000).slice(120);
    const expected = WALK_PACE * (8 / 1000);
    const stalled = steady.filter(step => step < expected * .5).length;
    expect(stalled, 'frames where the body stopped mid-walk').toBe(0);
  });

  it('advances by an even amount each frame rather than surging and easing', () => {
    const steady = replay(4000).slice(120);
    const min = Math.min(...steady), max = Math.max(...steady);
    // A stuttering walk shows a large spread between its fastest and slowest frame.
    expect(max - min, 'per-frame spread in metres').toBeLessThan(WALK_PACE * (8 / 1000) * .3);
  });

  it('survives a slow poll without starving the buffer', () => {
    const steady = replay(6000, 500).slice(200);
    const stalled = steady.filter(step => step < WALK_PACE * (8 / 1000) * .5).length;
    expect(stalled, 'frames stalled at the slower cadence').toBe(0);
    const trail = createTrail();
    for (let t = 0; t <= 4000; t += 500) record(trail, t, 0, 0);
    expect(playbackDelay(trail)).toBeGreaterThan(500);
  });

  it('never plays back ahead of the newest reported position', () => {
    const trail = createTrail();
    for (let t = 0; t <= 1000; t += 250) record(trail, t, t / 1000, 0);
    const at = sample(trail, 5000);
    expect(at?.x).toBe(1);
  });

  it('ignores an out-of-order or duplicated report', () => {
    const trail = createTrail();
    record(trail, 100, 1, 1); record(trail, 90, 9, 9); record(trail, 100, 5, 5);
    expect(trail.samples).toHaveLength(1);
    expect(trail.samples[0]!.x).toBe(1);
  });

  it('bounds the history it retains', () => {
    const trail = createTrail();
    for (let t = 0; t < 4000; t += 50) record(trail, t, 0, 0);
    expect(trail.samples.length).toBeLessThanOrEqual(14);
  });

  it('plays back evenly when reports are spaced unevenly along the simulation clock', () => {
    // A 250ms poll catches two or three ~100ms server ticks, so consecutive reports land 200ms or
    // 300ms apart on the simulation clock, carrying proportional distance. Playback must cross
    // those uneven spans at one constant speed rather than pulsing at each boundary. Recording and
    // drawing interleave here exactly as they do in the client.
    const trail = createTrail();
    const spans = [200, 300, 200, 300, 200];
    const steps: number[] = [];
    let drawn: number | null = null, nextReport = 0, span = 0;
    for (let t = 0; t <= 6000; t += 8) {
      if (t >= nextReport) { record(trail, t, WALK_PACE * (t / 1000), 0); nextReport = t + spans[span++ % spans.length]!; }
      const at = sample(trail, t)!;
      if (t > 1500 && drawn !== null) steps.push(Math.abs(at.x - drawn));
      drawn = at.x;
    }
    const min = Math.min(...steps), max = Math.max(...steps);
    expect(steps.length).toBeGreaterThan(400);
    const nominal = WALK_PACE * (8 / 1000);
    // Residual variation is the delay correction only, which is bounded to a few percent of speed.
    expect(max - min, 'per-frame spread in metres across uneven spans').toBeLessThan(nominal * .15);
    expect(min, 'slowest frame in metres').toBeGreaterThan(nominal * .85);
  });

  it('exposes a snap distance that a normal walk step never reaches', () => {
    expect(WALK_PACE * .5).toBeLessThan(SNAP_DISTANCE);
  });
});
