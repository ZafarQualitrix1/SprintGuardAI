import { IEvent } from '@nestjs/cqrs';

// Published by any command handler (in this module or another bounded context) whose mutation
// feeds one of the AI Release Readiness Algorithm's weighted signals -- manual/automation
// execution results, coverage, requirements, or the regression/deployment gates. `reason` is a
// short machine-readable tag (e.g. "execution-recorded") purely for logging/debugging, never
// branched on.
export class ReleaseMetricsChangedEvent implements IEvent {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
    public readonly reason: string,
  ) {}
}
