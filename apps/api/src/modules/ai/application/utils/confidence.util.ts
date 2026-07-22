// Core-governance confidence scoring (Solution Architecture §16.5, MVP depth per Step 8 scope):
// starts at 1.0 and is discounted for each repair attempt the Agent Execution Engine needed
// before the output validated against its JSON Schema. Richer signal (historical acceptance rate,
// self-consistency checks) is a later pass once Historical AI Memory exists.
const REPAIR_PENALTY = 0.3;
const MIN_CONFIDENCE = 0.1;

export function computeConfidence(repairAttempts: number): number {
  return Math.max(MIN_CONFIDENCE, 1 - repairAttempts * REPAIR_PENALTY);
}
