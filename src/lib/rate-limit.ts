type Entry = { count: number; resetsAt: number };

const globalStore = globalThis as unknown as { viccsRateLimits?: Map<string, Entry> };
const store = globalStore.viccsRateLimits ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") globalStore.viccsRateLimits = store;

export interface RateLimitProvider {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export const memoryRateLimit: RateLimitProvider = {
  async consume(key, limit, windowMs) {
    const now = Date.now();
    const current = store.get(key);
    if (!current || current.resetsAt <= now) {
      store.set(key, { count: 1, resetsAt: now + windowMs });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  },
};
