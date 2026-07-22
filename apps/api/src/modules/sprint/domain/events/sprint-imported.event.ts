// Solution Architecture §9.2: `sprint.imported` -- the trigger for the AI analysis pipeline
// (Story/Requirement Intelligence Agents) once the Agent Framework exists (Step 8). For now,
// consumed only for audit logging.
export class SprintImportedEvent {
  constructor(
    public readonly sprintId: string,
    public readonly projectId: string,
    public readonly organizationId: string,
    public readonly storyCount: number,
  ) {}
}
