import { pino, type Logger } from 'pino';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

const isDev = process.env.NODE_ENV !== 'production';

// Async local storage for correlation ID propagation
const correlationStorage = new AsyncLocalStorage<string>();

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: process.env.SERVICE_NAME || 'phoenix-ai',
  },
  mixin() {
    const correlationId = correlationStorage.getStore();
    return correlationId ? { correlationId } : {};
  },
});

export function createLogger(name: string) {
  return logger.child({ module: name });
}

/**
 * Get the current correlation ID from async context
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}

/**
 * Run a function with a correlation ID in async context.
 * If no correlationId provided, generates a new UUID.
 */
export function withCorrelationId<T>(fn: () => T, correlationId?: string): T {
  const id = correlationId || randomUUID();
  return correlationStorage.run(id, fn);
}

/**
 * Run an async function with a correlation ID in async context.
 * If no correlationId provided, generates a new UUID.
 */
export async function withCorrelationIdAsync<T>(fn: () => Promise<T>, correlationId?: string): Promise<T> {
  const id = correlationId || randomUUID();
  return correlationStorage.run(id, fn);
}

// Structured logging helpers
export function logApiCall(
  logger: Logger,
  method: string,
  endpoint: string,
  duration: number,
  status: number
) {
  logger.info({
    type: 'api_call',
    method,
    endpoint,
    duration,
    status,
  });
}

export function logToolExecution(
  logger: Logger,
  toolName: string,
  duration: number,
  success: boolean,
  error?: string
) {
  logger.info({
    type: 'tool_execution',
    tool: toolName,
    duration,
    success,
    error,
  });
}

export function logApproval(
  logger: Logger,
  operation: string,
  approvedBy: string,
  details: Record<string, unknown>
) {
  logger.info({
    type: 'approval',
    operation,
    approvedBy,
    timestamp: new Date().toISOString(),
    ...details,
  });
}
