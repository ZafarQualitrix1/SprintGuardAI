import { computeReadinessScore } from './compute-readiness.util';

describe('computeReadinessScore', () => {
  it('is 100 when coverage and execution are both perfect', () => {
    expect(computeReadinessScore(100, 100)).toBe(100);
  });

  it('is 0 when coverage and execution are both zero', () => {
    expect(computeReadinessScore(0, 0)).toBe(0);
  });

  it('weights coverage at 60% and execution at 40%', () => {
    expect(computeReadinessScore(100, 0)).toBe(60);
    expect(computeReadinessScore(0, 100)).toBe(40);
  });

  it('rounds to the nearest whole number', () => {
    expect(computeReadinessScore(83, 47)).toBe(Math.round(83 * 0.6 + 47 * 0.4));
  });

  it('clamps to the [0, 100] range even with out-of-range inputs', () => {
    expect(computeReadinessScore(150, 150)).toBe(100);
    expect(computeReadinessScore(-50, -50)).toBe(0);
  });
});
