interface RateLimitEntry {
  failures: number;
  windowStart: number;
  blockedUntil: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_MS = 15 * 60 * 1000; // 15 minutos

const globalForRateLimit = globalThis as unknown as {
  loginRateLimit?: Map<string, RateLimitEntry>;
};

function getStore(): Map<string, RateLimitEntry> {
  if (!globalForRateLimit.loginRateLimit) {
    globalForRateLimit.loginRateLimit = new Map();
  }
  return globalForRateLimit.loginRateLimit;
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const store = getStore();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (now - entry.windowStart > WINDOW_MS) {
    store.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string): void {
  const store = getStore();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { failures: 1, windowStart: now, blockedUntil: 0 });
    return;
  }

  const failures = entry.failures + 1;
  store.set(key, {
    failures,
    windowStart: entry.windowStart,
    blockedUntil: failures >= MAX_FAILURES ? now + BLOCK_MS : 0,
  });
}

export function clearLoginFailures(key: string): void {
  getStore().delete(key);
}
