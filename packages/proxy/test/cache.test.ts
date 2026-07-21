import { describe, it, expect } from 'vitest';
import { cacheKey, get, put } from '../src/cache.js';

describe('cache', () => {
  it('returns null on miss', () => {
    expect(get('nonexistent-key')).toBeNull();
  });

  it('returns the same key for the same input + model', () => {
    const k1 = cacheKey({ hello: 'world' }, 'model-a');
    const k2 = cacheKey({ hello: 'world' }, 'model-a');
    expect(k1).toBe(k2);
  });

  it('returns a different key for a different model', () => {
    const k1 = cacheKey({ hello: 'world' }, 'model-a');
    const k2 = cacheKey({ hello: 'world' }, 'model-b');
    expect(k1).not.toBe(k2);
  });

  it('round-trips a put/get', () => {
    const k = cacheKey({ x: 1 }, 'test-model');
    put(k, 'my narrative');
    expect(get(k)).toBe('my narrative');
  });
});
