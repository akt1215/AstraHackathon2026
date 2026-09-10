import type { LifePoint, LifeState } from '../life-types';
import { STATIC_FIXTURES } from './layout';
export const distance = (a: LifePoint, b: LifePoint): number => Math.hypot(a.x - b.x, a.z - b.z);
const CLEARANCE = .2;
export function walkable(state: LifeState, point: LifePoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.z) && point.x >= .35 && point.z >= .35 && point.x <= state.width - .35 && point.z <= state.depth - .35 && ![...state.objects, ...STATIC_FIXTURES].some(o => Math.abs(point.x - o.x) < o.width / 2 + CLEARANCE && Math.abs(point.z - o.z) < o.depth / 2 + CLEARANCE);
}
/**
 * The nearest spot to `point` a resident can actually stand.
 *
 * A click that lands on the coffee table or inside a chair's clearance is a click at that part of
 * the room, not a mistake to be refused. Refusing it makes the game feel broken, so walk to the
 * closest reachable place instead and only give up if the whole neighbourhood is furniture.
 */
export function nearestWalkable(state: LifeState, point: LifePoint): LifePoint | null {
  if (walkable(state, point)) return { ...point };
  for (let radius = .25; radius <= 2.5; radius += .25) {
    let best: LifePoint | null = null, bestDistance = Infinity;
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI / 12;
      const candidate = { x: point.x + Math.cos(angle) * radius, z: point.z + Math.sin(angle) * radius };
      if (!walkable(state, candidate)) continue;
      const away = distance(candidate, point);
      if (away < bestDistance) { best = candidate; bestDistance = away; }
    }
    if (best) return best;
  }
  return null;
}
function clearSegment(state: LifeState, a: LifePoint, b: LifePoint): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / .12));
  for (let i = 1; i <= steps; i++) if (!walkable(state, { x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps })) return false;
  return true;
}
/** A half-unit navigation grid stays independent of renderer geometry. */
export function route(state: LifeState, start: LifePoint, goal: LifePoint): LifePoint[] | null {
  if (!walkable(state, goal)) return null;
  if (clearSegment(state, start, goal)) return [{ ...goal }];
  const candidates: LifePoint[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const p = { x: Math.round(start.x * 2) / 2 + dx * .5, z: Math.round(start.z * 2) / 2 + dz * .5 };
    if (walkable(state, p) && clearSegment(state, start, p)) candidates.push(p);
  }
  candidates.sort((a, b) => distance(start, a) - distance(start, b));
  const queue = candidates.slice(0, 1), previous = new Map<string, LifePoint | null>();
  const key = (p: LifePoint) => `${p.x},${p.z}`;
  if (!queue.length) return null;
  previous.set(key(queue[0]), null);
  let reached: LifePoint | null = null;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const point = queue[cursor];
    if (distance(point, goal) <= .8 && clearSegment(state, point, goal)) { reached = point; break; }
    for (const next of [{ x: point.x + .5, z: point.z }, { x: point.x - .5, z: point.z }, { x: point.x, z: point.z + .5 }, { x: point.x, z: point.z - .5 }]) {
      if (previous.has(key(next)) || !walkable(state, next) || !clearSegment(state, point, next)) continue;
      previous.set(key(next), point); queue.push(next);
    }
  }
  if (!reached) return null;
  const result: LifePoint[] = [{ ...goal }];
  for (let point: LifePoint | null = reached; point; point = previous.get(key(point)) ?? null) result.unshift(point);
  return result;
}
export function approachResident(state: LifeState, from: LifePoint, target: LifePoint): LifePoint | null {
  const points = Array.from({ length: 12 }, (_, i) => ({ x: target.x + Math.cos(i * Math.PI / 6) * 1.1, z: target.z + Math.sin(i * Math.PI / 6) * 1.1 }));
  points.sort((a, b) => distance(a, from) - distance(b, from));
  return points.find(p => walkable(state, p) && route(state, from, p)) ?? null;
}
