const COVERAGE_WEIGHT = 0.6;
const EXECUTION_WEIGHT = 0.4;

// Deterministic MVP readiness formula (Solution Architecture §10.2 Release Guardian Agent, scoped
// down for Step 9): weighted average of requirement coverage and execution pass rate. Risk
// Prediction Agent input is a documented future addition (Solution Architecture §10.2) once that
// agent exists -- this formula is the placeholder it will extend, not the final one.
export function computeReadinessScore(coveragePercent: number, executionPassRate: number): number {
  const score = coveragePercent * COVERAGE_WEIGHT + executionPassRate * EXECUTION_WEIGHT;
  return Math.max(0, Math.min(100, Math.round(score)));
}
