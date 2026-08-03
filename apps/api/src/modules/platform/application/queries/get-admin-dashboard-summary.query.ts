import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';

export interface AdminDashboardSummary {
  scope: 'platform' | 'organization';
  totalOrganizations: number | null; // null when scope === 'organization'
  activeProjects: number;
  activeSprints: number;
  connectedJiraProjects: number;
  totalUserStories: number;
  totalGeneratedTestCases: number;
  totalExecutions: number;
  totalBugs: number;
  activeAiAgents: number;
  totalUsers: number;
}

export class GetAdminDashboardSummaryQuery {
  constructor(
    public readonly organizationId: string,
    public readonly isPlatformWide: boolean,
  ) {}
}

@QueryHandler(GetAdminDashboardSummaryQuery)
export class GetAdminDashboardSummaryHandler
  implements IQueryHandler<GetAdminDashboardSummaryQuery, AdminDashboardSummary>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAdminDashboardSummaryQuery): Promise<AdminDashboardSummary> {
    const orgScope = query.isPlatformWide ? {} : { organizationId: query.organizationId };
    const projectScope = query.isPlatformWide ? {} : { project: { organizationId: query.organizationId } };
    const sprintScope = query.isPlatformWide ? {} : { project: { organizationId: query.organizationId } };

    const [
      totalOrganizations,
      activeProjects,
      activeSprints,
      connectedJiraProjects,
      totalUserStories,
      totalGeneratedTestCases,
      totalExecutions,
      totalBugs,
      activeAiAgents,
      totalUsers,
    ] = await Promise.all([
      query.isPlatformWide ? this.prisma.organization.count() : Promise.resolve(null),
      this.prisma.project.count({ where: { ...orgScope, deletedAt: null } }),
      this.prisma.sprint.count({ where: { status: 'ACTIVE', deletedAt: null, ...sprintScope } }),
      this.prisma.integrationProject.count({
        where: { connection: { status: 'CONNECTED', connector: { key: 'jira' }, ...orgScope } },
      }),
      this.prisma.story.count({ where: { sprint: projectScope } }),
      this.prisma.testCase.count({ where: { testScenario: { story: { sprint: projectScope } } } }),
      this.prisma.execution.count({ where: { sprint: sprintScope } }),
      this.prisma.defect.count({ where: query.isPlatformWide ? {} : { story: { sprint: projectScope } } }),
      this.prisma.agent.count({ where: { status: 'ENABLED' } }),
      query.isPlatformWide
        ? this.prisma.user.count({ where: { deletedAt: null } })
        : this.prisma.membership.count({ where: { organizationId: query.organizationId } }),
    ]);

    return {
      scope: query.isPlatformWide ? 'platform' : 'organization',
      totalOrganizations,
      activeProjects,
      activeSprints,
      connectedJiraProjects,
      totalUserStories,
      totalGeneratedTestCases,
      totalExecutions,
      totalBugs,
      activeAiAgents,
      totalUsers,
    };
  }
}
