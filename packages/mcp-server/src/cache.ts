import { createLogger } from '@phoenix/shared';

const logger = createLogger('servicefusion-cache');

// =============================================================================
// TTL Cache for GET responses
// =============================================================================

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

/** Default TTLs by path pattern (seconds). */
const DEFAULT_TTLS: Array<{ pattern: RegExp; ttl: number }> = [
  // Lookup tables rarely change — cache 5 minutes
  { pattern: /\/(job-statuses|payment-types|sources|job-categories)/, ttl: 300 },
  // /me changes even less
  { pattern: /\/me$/, ttl: 600 },
  // List/detail endpoints — 60 seconds
  { pattern: /./, ttl: 60 },
];

export class ResponseCache {
  private store = new Map<string, CacheEntry>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private defaultTtlSeconds: number = 60) {
    // Sweep expired entries every 30 seconds. unref() so it doesn't block process exit.
    this.cleanupTimer = setInterval(() => this.sweep(), 30_000);
    if (typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }

  /** Build a cache key from path + URL-encoded sorted params (matches URLSearchParams output). */
  private makeKey(path: string, params?: Record<string, unknown>): string {
    if (!params) return path;
    const sp = new URLSearchParams();
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => sp.set(k, String(v)));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  }

  /** Determine TTL for a given path. */
  private getTtl(path: string): number {
    for (const { pattern, ttl } of DEFAULT_TTLS) {
      if (pattern.test(path)) return ttl;
    }
    return this.defaultTtlSeconds;
  }

  /** Get a cached value, or undefined if expired/missing. */
  get<T>(path: string, params?: Record<string, unknown>): T | undefined {
    const key = this.makeKey(path, params);
    const entry = this.store.get(key);

    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    logger.debug({ path, key }, 'Cache hit');
    return entry.value as T;
  }

  /** Store a value with auto-determined TTL. */
  set<T>(path: string, params: Record<string, unknown> | undefined, value: T): void {
    const key = this.makeKey(path, params);
    const ttl = this.getTtl(path);
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    logger.debug({ path, key, ttlSeconds: ttl }, 'Cache set');
  }

  /** Invalidate entries matching a path prefix (e.g. after a POST). */
  invalidate(pathPrefix: string): void {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(pathPrefix)) {
        this.store.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug({ pathPrefix, count }, 'Cache invalidated');
    }
  }

  /** Clear all entries. */
  clear(): void {
    this.store.clear();
  }

  /** Remove expired entries. */
  private sweep(): void {
    const now = Date.now();
    let swept = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        swept++;
      }
    }
    if (swept > 0) {
      logger.debug({ swept, remaining: this.store.size }, 'Cache sweep');
    }
  }

  /** Stats for health checks. */
  getStats(): { size: number; defaultTtl: number } {
    return { size: this.store.size, defaultTtl: this.defaultTtlSeconds };
  }

  /** Shutdown. */
  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}
