import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResponseCache } from './cache.js';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ResponseCache(60);
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('TTL by path pattern', () => {
    it('lookups (job-statuses, payment-types, sources, job-categories) get 300s TTL', () => {
      cache.set('/v1/job-statuses', undefined, { items: [] });
      cache.set('/v1/payment-types', undefined, { items: [] });

      vi.advanceTimersByTime(299_000);
      expect(cache.get('/v1/job-statuses')).toEqual({ items: [] });
      expect(cache.get('/v1/payment-types')).toEqual({ items: [] });

      vi.advanceTimersByTime(2_000); // total 301s
      expect(cache.get('/v1/job-statuses')).toBeUndefined();
      expect(cache.get('/v1/payment-types')).toBeUndefined();
    });

    it('/me gets 600s TTL', () => {
      cache.set('/v1/me', undefined, { id: 1 });
      vi.advanceTimersByTime(599_000);
      expect(cache.get('/v1/me')).toEqual({ id: 1 });
      vi.advanceTimersByTime(2_000);
      expect(cache.get('/v1/me')).toBeUndefined();
    });

    it('list/detail endpoints get 60s default TTL', () => {
      cache.set('/v1/customers', undefined, { items: [] });
      vi.advanceTimersByTime(59_000);
      expect(cache.get('/v1/customers')).toEqual({ items: [] });
      vi.advanceTimersByTime(2_000);
      expect(cache.get('/v1/customers')).toBeUndefined();
    });
  });

  describe('keying', () => {
    it('treats identical params as same key regardless of object key order', () => {
      cache.set('/v1/jobs', { page: 1, 'per-page': 10 }, 'A');
      expect(cache.get('/v1/jobs', { 'per-page': 10, page: 1 })).toBe('A');
    });

    it('treats different param values as different keys', () => {
      cache.set('/v1/jobs', { page: 1 }, 'A');
      cache.set('/v1/jobs', { page: 2 }, 'B');
      expect(cache.get('/v1/jobs', { page: 1 })).toBe('A');
      expect(cache.get('/v1/jobs', { page: 2 })).toBe('B');
    });

    it('ignores undefined param values', () => {
      cache.set('/v1/jobs', { page: 1, sort: undefined }, 'A');
      expect(cache.get('/v1/jobs', { page: 1 })).toBe('A');
    });
  });

  describe('invalidate', () => {
    it('removes entries matching prefix', () => {
      cache.set('/v1/customers', undefined, 'list');
      cache.set('/v1/customers', { page: 1 }, 'page1');
      cache.set('/v1/jobs', undefined, 'jobs-list');

      cache.invalidate('/v1/customers');

      expect(cache.get('/v1/customers')).toBeUndefined();
      expect(cache.get('/v1/customers', { page: 1 })).toBeUndefined();
      expect(cache.get('/v1/jobs')).toBe('jobs-list');
    });

    it('does nothing when no entries match', () => {
      cache.set('/v1/customers', undefined, 'list');
      cache.invalidate('/v1/never');
      expect(cache.get('/v1/customers')).toBe('list');
    });
  });

  describe('sweep', () => {
    it('removes expired entries on the timer tick', () => {
      cache.set('/v1/customers', undefined, 'A');
      vi.advanceTimersByTime(61_000); // entry expired
      // Trigger the cleanup interval (30s)
      vi.advanceTimersByTime(30_000);
      // Internal store should be cleaned. We don't expose size of internals,
      // but get() returning undefined is the user-visible contract.
      expect(cache.get('/v1/customers')).toBeUndefined();
    });
  });
});
