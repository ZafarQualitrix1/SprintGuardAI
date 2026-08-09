import { percentile } from './percentile.util';

describe('percentile', () => {
  it('returns 0 for an empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });

  it('returns the single value regardless of p for a one-element array', () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 95)).toBe(42);
  });

  it('computes p50 (median-ish) via nearest-rank', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
  });

  it('computes p95 close to the top of a large sorted sample', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(percentile(values, 95)).toBe(95);
  });

  it('never returns a value below the minimum or above the maximum', () => {
    const values = [5, 12, 19, 27, 33];
    expect(percentile(values, 1)).toBeGreaterThanOrEqual(5);
    expect(percentile(values, 100)).toBeLessThanOrEqual(33);
  });
});
