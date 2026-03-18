import { createLogger } from '@phoenix/shared';

const logger = createLogger('servicefusion-rate-limiter');

// =============================================================================
// Rate Limiter — Token Bucket (60 req/min per SF v1 docs)
// =============================================================================

interface RateLimitState {
  remaining: number;
  limit: number;
  resetAt: number; // epoch ms
}

export class RateLimiter {
  private state: RateLimitState;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private maxPerMinute: number = 60) {
    this.state = {
      remaining: maxPerMinute,
      limit: maxPerMinute,
      resetAt: Date.now() + 60_000,
    };
  }

  /**
   * Update internal state from SF response headers.
   * Headers: X-Rate-Limit-Limit, X-Rate-Limit-Remaining, X-Rate-Limit-Reset
   */
  updateFromHeaders(headers: Headers): void {
    const limit = headers.get('X-Rate-Limit-Limit');
    const remaining = headers.get('X-Rate-Limit-Remaining');
    const reset = headers.get('X-Rate-Limit-Reset');

    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed) && parsed > 0) this.state.limit = parsed;
      else logger.warn({ header: 'X-Rate-Limit-Limit', value: limit }, 'Unparseable rate limit header');
    }
    if (remaining) {
      const parsed = parseInt(remaining, 10);
      if (!isNaN(parsed)) this.state.remaining = parsed;
      else logger.warn({ header: 'X-Rate-Limit-Remaining', value: remaining }, 'Unparseable rate limit header');
    }
    if (reset) {
      const resetSec = parseInt(reset, 10);
      if (!isNaN(resetSec)) {
        this.state.resetAt = resetSec > 1e12 ? resetSec : resetSec * 1000;
      } else {
        logger.warn({ header: 'X-Rate-Limit-Reset', value: reset }, 'Unparseable rate limit header');
      }
    }

    if (this.state.remaining <= 5) {
      logger.warn(
        { remaining: this.state.remaining, resetAt: new Date(this.state.resetAt).toISOString() },
        'Rate limit approaching'
      );
    }
  }

  /**
   * Wait until a request slot is available. Resolves immediately if under limit.
   * Throws if the queue grows too large (100+ pending).
   */
  async acquire(): Promise<void> {
    // Reset window if past the reset time
    const now = Date.now();
    if (now >= this.state.resetAt) {
      this.state.remaining = this.state.limit;
      this.state.resetAt = now + 60_000;
    }

    if (this.state.remaining > 0) {
      this.state.remaining--;
      return;
    }

    // No slots — queue the request
    if (this.queue.length >= 100) {
      throw new Error('Rate limiter queue full (100+ pending requests). Reduce request volume.');
    }

    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.scheduleDrain();
    });
  }

  /**
   * Handle a 429 response. Parses Retry-After or uses reset time.
   * Returns the number of ms to wait before retrying.
   */
  handle429(headers: Headers): number {
    this.state.remaining = 0;

    // Cancel existing drain timer so queued requests don't fire too early
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }

    this.updateFromHeaders(headers);

    const retryAfter = headers.get('Retry-After');
    let waitMs: number;
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        waitMs = seconds * 1000;
      } else {
        logger.warn({ retryAfter }, 'Non-numeric Retry-After header (possibly HTTP-date format)');
        waitMs = Math.max(this.state.resetAt - Date.now(), 1000);
      }
    } else {
      waitMs = Math.max(this.state.resetAt - Date.now(), 1000);
    }

    // Update resetAt so queued requests drain at the right time
    this.state.resetAt = Date.now() + waitMs;

    logger.warn({ waitMs }, 'Rate limited (429). Waiting for reset.');

    // Reschedule drain for queued requests at the corrected time
    if (this.queue.length > 0) this.scheduleDrain();

    return waitMs;
  }

  private scheduleDrain(): void {
    if (this.drainTimer) return;

    const waitMs = Math.max(this.state.resetAt - Date.now(), 1000);
    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      this.state.remaining = this.state.limit;
      this.state.resetAt = Date.now() + 60_000;

      // Drain queued requests up to the new limit
      while (this.queue.length > 0 && this.state.remaining > 0) {
        const next = this.queue.shift();
        if (next) {
          this.state.remaining--;
          next.resolve();
        }
      }

      // If there are still queued requests, schedule another drain
      if (this.queue.length > 0) {
        this.scheduleDrain();
      }
    }, waitMs);
  }

  /** Current rate limit state (for health checks / diagnostics). */
  getState(): Readonly<RateLimitState> {
    return { ...this.state };
  }

  /** Flush all queued requests with an error (for shutdown). */
  destroy(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    for (const item of this.queue) {
      item.reject(new Error('Rate limiter destroyed'));
    }
    this.queue = [];
  }
}
