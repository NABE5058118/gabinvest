/** Small bounded process-local cache for public lookup/catalog responses. */
type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 500;

export async function withCache<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current && current.expiresAt > now) return current.value;
  if (current) cache.delete(key);

  const value = await load();
  if (cache.size >= MAX_CACHE_ENTRIES) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= now || cache.size >= MAX_CACHE_ENTRIES * 0.8) cache.delete(entryKey);
      if (cache.size < MAX_CACHE_ENTRIES * 0.8) break;
    }
  }
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}
