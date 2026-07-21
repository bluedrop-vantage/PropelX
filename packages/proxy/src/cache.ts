// Simple in-memory LRU cache keyed by SHA-256(designHash + solveHash + model).
// Spec §10.3: "Responses cached per design hash."

import { createHash } from 'node:crypto';

interface CacheEntry {
  narrative: string;
  expiresAt: number;
}

const CACHE_MAX = 500;
const TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map<string, CacheEntry>();

export function cacheKey(payload: unknown, model: string): string {
  const h = createHash('sha256');
  h.update(model);
  h.update('|');
  h.update(JSON.stringify(payload));
  return h.digest('hex');
}

export function get(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  // Refresh LRU order.
  store.delete(key);
  store.set(key, entry);
  return entry.narrative;
}

export function put(key: string, narrative: string): void {
  if (store.size >= CACHE_MAX) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, { narrative, expiresAt: Date.now() + TTL_MS });
}

export function stats() {
  return { size: store.size, capacity: CACHE_MAX };
}
