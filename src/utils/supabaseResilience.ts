export interface TransientRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const inFlightRequests = new Map<string, Promise<unknown>>();
const memoryCache = new Map<string, CacheEntry<unknown>>();

export class RateLimitOrUnavailableError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(
      message ||
        'Muitos acessos no momento. Aguarde alguns segundos e tente novamente.'
    );
    this.name = 'RateLimitOrUnavailableError';
    this.status = status;
  }
}

export function extractHttpStatusFromError(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null;
  const rec = err as Record<string, unknown>;

  if (typeof rec.status === 'number') return rec.status;
  if (typeof rec.statusCode === 'number') return rec.statusCode;

  const code = typeof rec.code === 'string' ? rec.code : '';
  if (code === '429' || code === '503') return Number.parseInt(code, 10);

  const message =
    typeof rec.message === 'string' ? rec.message.toLowerCase() : '';
  if (
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  ) {
    return 429;
  }
  if (
    message.includes('503') ||
    message.includes('service unavailable') ||
    message.includes('upstream connect error')
  ) {
    return 503;
  }

  return null;
}

export function isTransientHttpStatus(status: number | null): boolean {
  return status === 429 || status === 503 || status === 502 || status === 504;
}

export function formatFriendlySupabaseError(
  err: unknown,
  fallbackMessage: string
): string {
  const status = extractHttpStatusFromError(err);
  if (status === 429) {
    return 'Muitos acessos no momento (HTTP 429). Aguarde alguns segundos e tente novamente.';
  }
  if (status === 503 || status === 502 || status === 504) {
    return 'Servidor temporariamente sobrecarregado (HTTP 503). Tente novamente em instantes.';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallbackMessage;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetryOnTransientError<T>(
  operation: () => Promise<T>,
  options: TransientRetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const status = extractHttpStatusFromError(err);
      if (!isTransientHttpStatus(status) || attempt === maxRetries) {
        if (status === 429 || status === 503) {
          throw new RateLimitOrUnavailableError(
            status,
            formatFriendlySupabaseError(err, 'Serviço indisponível no momento.')
          );
        }
        throw err;
      }

      const jitter = Math.floor(Math.random() * 150);
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt + jitter);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function dedupeInFlight<T>(
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = factory().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

export function getCachedValue<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  if (ttlMs <= 0) return;
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCacheKey(keyOrPrefix: string, isPrefix = false): void {
  if (!isPrefix) {
    memoryCache.delete(keyOrPrefix);
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key);
    }
  }
}

export function clearAllQueryCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
}
