import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';

export interface JiraAutoSyncCandidate {
  organizationId: string;
  connectionId: string;
}

// Background Jobs' "jira-auto-sync" queue scans this on a repeatable schedule (see
// WorkerRegistryService) -- only orgs that opted into OrganizationSettings.jiraAutoSyncEnabled
// get an auto-sync job enqueued; the manual "Sync Now" button never goes through this path.
export class ScanJiraAutoSyncCandidatesQuery {}

@QueryHandler(ScanJiraAutoSyncCandidatesQuery)
export class ScanJiraAutoSyncCandidatesHandler
  implements IQueryHandler<ScanJiraAutoSyncCandidatesQuery, JiraAutoSyncCandidate[]>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<JiraAutoSyncCandidate[]> {
    const settings = await this.prisma.organizationSettings.findMany({
      where: { jiraAutoSyncEnabled: true },
      select: { organizationId: true },
    });
    if (settings.length === 0) return [];

    const orgIds = settings.map((s) => s.organizationId);
    const connections = await this.prisma.integrationConnection.findMany({
      where: { organizationId: { in: orgIds }, status: 'CONNECTED', connector: { key: 'jira' } },
      select: { organizationId: true, id: true },
    });

    return connections.map((c) => ({ organizationId: c.organizationId, connectionId: c.id }));
  }
}
