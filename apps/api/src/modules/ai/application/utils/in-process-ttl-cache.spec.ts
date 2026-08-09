import { InProcessTtlCache } from './in-process-ttl-cache';

describe('InProcessTtlCache', () => {
  it('returns undefined for a key that was never set', () => {
    const cache = new InProcessTtlCache<string>(60_000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('returns a cached value within the TTL', () => {
    const cache = new InProcessTtlCache<{ id: string }>(60_000);
    cache.set('key-1', { id: 'a' });
    expect(cache.get('key-1')).toEqual({ id: 'a' });
  });

  it('distinguishes a cached null result from a genuine cache miss', () => {
    const cache = new InProcessTtlCache<string | null>(60_000);
    cache.set('key-1', null);
    expect(cache.get('key-1')).toBeNull();
    expect(cache.get('never-set')).toBeUndefined();
  });

  it('expires a value once its TTL elapses', () => {
    jest.useFakeTimers();
    try {
      const cache = new InProcessTtlCache<string>(1000);
      cache.set('key-1', 'value');
      jest.advanceTimersByTime(999);
      expect(cache.get('key-1')).toBe('value');
      jest.advanceTimersByTime(2);
      expect(cache.get('key-1')).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops a value immediately when deleted, regardless of TTL', () => {
    const cache = new InProcessTtlCache<string>(60_000);
    cache.set('key-1', 'value');
    cache.delete('key-1');
    expect(cache.get('key-1')).toBeUndefined();
  });
});
