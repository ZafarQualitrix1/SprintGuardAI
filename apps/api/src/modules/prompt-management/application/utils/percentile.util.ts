// Nearest-rank method: the smallest value at or beyond the p-th percentile of the SORTED (ascending)
// input. Deliberately not an interpolated (e.g. linear) percentile -- for latency/SLA reporting the
// nearest-rank value is always an actually-observed sample, not an interpolated number nothing ever
// measured.
export function percentile(sortedAscendingValues: number[], p: number): number {
  if (sortedAscendingValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedAscendingValues.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sortedAscendingValues.length - 1));
  return sortedAscendingValues[clampedIndex];
}
