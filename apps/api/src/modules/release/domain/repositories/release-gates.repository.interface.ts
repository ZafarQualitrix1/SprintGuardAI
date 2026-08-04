import { SprintGates } from './release-metrics-read.repository.interface';

export const RELEASE_GATES_REPOSITORY = Symbol('IReleaseGatesRepository');

export interface UpdateSprintGatesInput {
  regressionCompleted?: boolean;
  deploymentChecklistComplete?: boolean;
}

// Narrow write access to the two Release Readiness gate toggles that live on Sprint (Mandatory
// Release Rules 7/8) -- kept separate from IReleaseMetricsReadRepository since that port is
// read-only by design.
export interface IReleaseGatesRepository {
  updateGates(sprintId: string, organizationId: string, input: UpdateSprintGatesInput): Promise<SprintGates | null>;
}
