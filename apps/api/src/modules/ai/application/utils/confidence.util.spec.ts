import { computeConfidence } from './confidence.util';

describe('computeConfidence', () => {
  it('is 1.0 with zero repair attempts', () => {
    expect(computeConfidence(0)).toBe(1);
  });

  it('decreases with each repair attempt', () => {
    expect(computeConfidence(1)).toBeCloseTo(0.7);
    expect(computeConfidence(2)).toBeCloseTo(0.4);
  });

  it('never drops below the floor', () => {
    expect(computeConfidence(10)).toBeGreaterThanOrEqual(0.1);
  });
});
