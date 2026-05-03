import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(60);
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  describe('updateFromHeaders', () => {
    it('parses standard X-Rate-Limit-* headers', () => {
      limiter.updateFromHeaders(headers({
        'X-Rate-Limit-Limit': '120',
        'X-Rate-Limit-Remaining': '42',
        'X-Rate-Limit-Reset': '1234567890', // seconds
      }));

      const state = limiter.getState();
      expect(state.limit).toBe(120);
      expect(state.remaining).toBe(42);
      expect(state.resetAt).toBe(1234567890 * 1000); // converted to ms
    });

    it('treats reset-already-in-ms (>1e12) as ms, not seconds', () => {
      limiter.updateFromHeaders(headers({ 'X-Rate-Limit-Reset': '1700000000000' }));
      expect(limiter.getState().resetAt).toBe(1700000000000);
    });

    it('ignores unparseable header values', () => {
      const before = limiter.getState();
      limiter.updateFromHeaders(headers({
        'X-Rate-Limit-Limit': 'not-a-number',
        'X-Rate-Limit-Remaining': 'NaN',
        'X-Rate-Limit-Reset': 'soon',
      }));
      const after = limiter.getState();
      expect(after.limit).toBe(before.limit);
      expect(after.remaining).toBe(before.remaining);
    });
  });

  describe('handle429', () => {
    it('parses numeric Retry-After (seconds)', () => {
      const waitMs = limiter.handle429(headers({ 'Retry-After': '30' }));
      expect(waitMs).toBe(30_000);
    });

    it('falls back to reset window when Retry-After is HTTP-date', () => {
      // Simulate a current time and a far-future reset
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      limiter.updateFromHeaders(headers({
        'X-Rate-Limit-Reset': String(Math.floor(new Date('2026-01-01T00:00:45Z').getTime() / 1000)),
      }));

      const waitMs = limiter.handle429(headers({
        'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT',
        'X-Rate-Limit-Reset': String(Math.floor(new Date('2026-01-01T00:00:45Z').getTime() / 1000)),
      }));

      // Should use the reset time (~45s) not parse the HTTP-date as seconds.
      expect(waitMs).toBeGreaterThanOrEqual(1000);
      expect(waitMs).toBeLessThanOrEqual(45_000);
    });

    it('drops remaining to 0 after a 429', () => {
      limiter.handle429(headers({ 'Retry-After': '5' }));
      expect(limiter.getState().remaining).toBe(0);
    });
  });

  describe('queue overflow', () => {
    it('rejects acquire() when queue exceeds 100 pending requests', async () => {
      // Drain the bucket
      for (let i = 0; i < 60; i++) await limiter.acquire();

      // Queue 100 pending — these don't resolve because the timer is fake.
      const queued: Promise<void>[] = [];
      for (let i = 0; i < 100; i++) {
        queued.push(limiter.acquire().catch(() => {}));
      }

      // 101st must reject
      await expect(limiter.acquire()).rejects.toThrow(/queue full/i);
    });
  });

  describe('acquire with available slots', () => {
    it('resolves immediately when slots are available', async () => {
      const start = Date.now();
      await limiter.acquire();
      expect(Date.now() - start).toBeLessThan(10);
      expect(limiter.getState().remaining).toBe(59);
    });

    it('refills the bucket after the reset window passes', async () => {
      // Drain
      for (let i = 0; i < 60; i++) await limiter.acquire();
      expect(limiter.getState().remaining).toBe(0);

      // Skip past reset (60s + 1)
      vi.advanceTimersByTime(61_000);

      // Next acquire should refill and consume one slot
      await limiter.acquire();
      expect(limiter.getState().remaining).toBe(59);
    });
  });
});
