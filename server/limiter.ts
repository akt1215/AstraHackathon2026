// Adapted from Austin-Senna/astra-hackathon apps/server/limiter.ts.
export class WorkLimiter {
  private active = 0;
  private waiting: Array<() => void> = [];
  constructor(private concurrency = 2, private queueLimit = 8) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || !Number.isInteger(queueLimit) || queueLimit < 0) throw new Error('Invalid work limits.');
  }
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      if (this.waiting.length >= this.queueLimit) throw new Error('The local narrator is busy. Please try again shortly.');
      await new Promise<void>(resolve => this.waiting.push(resolve));
    } else this.active++;
    try { return await work(); }
    finally {
      // Transfer this permit directly to the oldest waiter. New arrivals cannot
      // slip into the slot between completion and the queued continuation.
      const next = this.waiting.shift();
      if (next) next(); else this.active--;
    }
  }
}
