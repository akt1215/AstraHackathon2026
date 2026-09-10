/** Radians of stride cycle per metre travelled, so a full cycle covers about 1.2m. */
export const STRIDE_PER_METRE = 5.2;
/** Beyond this gap the resident was moved, not walked: reload, preset switch or a reset. */
export const SNAP_DISTANCE = 2.2;
const MIN_DELAY = 260, MAX_DELAY = 720, KEEP = 12;

export interface MotionSample { t: number; x: number; z: number }
export interface MotionTrail { samples: MotionSample[]; interval: number; delay: number; lastAt: number }

export const createTrail = (): MotionTrail => ({ samples: [], interval: MIN_DELAY, delay: 0, lastAt: 0 });

/**
 * Record where the server last said a resident was.
 *
 * Positions arrive roughly every 250ms while frames run at about 8ms. Easing the body toward each
 * new position converges well inside a poll window and then stalls until the next one lands, which
 * reads as a stutter no matter how the easing is tuned — the body always arrives early and waits.
 * Keeping a short history instead lets the renderer play the walk back slightly delayed, so every
 * frame falls between two known positions and the body is never guessing or waiting.
 */
export function record(trail: MotionTrail, t: number, x: number, z: number): void {
  const previous = trail.samples[trail.samples.length - 1];
  if (previous && t <= previous.t) return;
  trail.samples.push({ t, x, z });
  if (trail.samples.length > KEEP) trail.samples.splice(0, trail.samples.length - KEEP);
  // The widest span still in the window, not an average or a decaying peak. Both of those keep
  // moving between alternating poll spans, and any movement in the delay is movement in the
  // playback point, which shows up on screen as a speed wobble.
  let widest = 0;
  for (let i = 1; i < trail.samples.length; i++) widest = Math.max(widest, trail.samples[i]!.t - trail.samples[i - 1]!.t);
  trail.interval = widest || MIN_DELAY;
}

/** How far behind live the trail should sit, sized from the observed poll cadence. */
export const playbackDelay = (trail: MotionTrail): number =>
  Math.min(MAX_DELAY, Math.max(MIN_DELAY, trail.interval * 1.3));

/**
 * Ease the applied delay toward the target instead of stepping to it.
 *
 * The playback point is `now - delay`, so changing the delay outright shifts that point and jumps
 * the body. Correcting it at a few percent of elapsed time makes the same adjustment as a slight,
 * unnoticeable change of playback speed.
 */
const WIDEN_RATE = .5, NARROW_RATE = .04;
function settleDelay(trail: MotionTrail, now: number): number {
  const target = playbackDelay(trail);
  if (!trail.delay) { trail.delay = target; trail.lastAt = now; return trail.delay; }
  const elapsed = Math.max(0, now - trail.lastAt);
  // Widening is urgent: too small a delay runs playback past the newest sample and stalls, which is
  // the failure this buffer exists to prevent. Narrowing only trims latency, so it can be gradual.
  const short = target > trail.delay;
  const limit = elapsed * (short ? WIDEN_RATE : NARROW_RATE);
  trail.delay += Math.max(-limit, Math.min(limit, target - trail.delay));
  trail.lastAt = now;
  return trail.delay;
}

/**
 * Position along the trail at `now`, played back `playbackDelay` in the past so the sample sits
 * between two recorded positions. Before enough history exists, holds the oldest known position;
 * past the newest, holds the newest rather than extrapolating into a wall.
 */
export function sample(trail: MotionTrail, now: number): MotionSample | null {
  const samples = trail.samples;
  if (!samples.length) return null;
  const at = now - settleDelay(trail, now);
  const first = samples[0]!, last = samples[samples.length - 1]!;
  if (at <= first.t) return { t: at, x: first.x, z: first.z };
  if (at >= last.t) return { t: at, x: last.x, z: last.z };
  for (let i = samples.length - 1; i > 0; i--) {
    const b = samples[i]!, a = samples[i - 1]!;
    if (at >= a.t && at <= b.t) {
      const span = b.t - a.t;
      const k = span > 0 ? (at - a.t) / span : 1;
      return { t: at, x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
    }
  }
  return { t: at, x: last.x, z: last.z };
}
