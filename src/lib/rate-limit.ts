type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 20;
const MAX_KEYS = 2000;

function prune(now: number) {
  if (buckets.size <= MAX_KEYS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
  if (buckets.size > MAX_KEYS) {
    buckets.clear();
  }
}

export function consumeLoginRateLimit(ip: string) {
  const now = Date.now();
  prune(now);

  const key = ip || "unknown";
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= LIMIT) {
    return false;
  }

  current.count += 1;
  return true;
}
