import { expect, it } from 'vitest';
import { WorkLimiter } from './limiter';

it('bounds active inference, preserves queue order, and releases failed permits', async () => {
  const limiter = new WorkLimiter(2, 2);
  const running: number[] = [], starts: number[] = [];
  const releases = new Map<number, () => void>();
  let peak = 0;
  const work = (id: number) => limiter.run(async () => {
    starts.push(id); running.push(id); peak = Math.max(peak, running.length);
    await new Promise<void>(resolve => releases.set(id, resolve));
    running.splice(running.indexOf(id), 1);
    if (id === 0) throw new Error('provider failed');
    return id;
  });
  const jobs = [0, 1, 2, 3].map(work);
  const completion = Promise.allSettled(jobs);
  expect(starts).toEqual([0, 1]);
  await expect(work(4)).rejects.toThrow(/busy/i);
  releases.get(0)!();
  await jobs[0].catch(() => undefined);
  await Promise.resolve();
  expect(starts).toEqual([0, 1, 2]);
  releases.get(1)!(); await jobs[1]; await Promise.resolve();
  expect(starts).toEqual([0, 1, 2, 3]);
  releases.get(2)!(); releases.get(3)!();
  expect((await completion).map(result => result.status)).toEqual(['rejected', 'fulfilled', 'fulfilled', 'fulfilled']);
  expect(peak).toBe(2);
  expect(await limiter.run(async () => 'available again')).toBe('available again');
});
