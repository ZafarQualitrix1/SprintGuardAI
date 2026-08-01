import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  AiProviderStats,
  IAiProviderStatsRepository,
} from '../../domain/repositories/ai-provider-stats.repository.interface';

interface AvgLatencyRow {
  provider: string;
  avgLatencyMs: number | null;
}

@Injectable()
export class PrismaAiProviderStatsRepository implements IAiProviderStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByOrg(organizationId: string): Promise<AiProviderStats[]> {
    const [totalGroups, succeededGroups, avgLatencyRows] = await Promise.all([
      this.prisma.agentRun.groupBy({
        by: ['provider'],
        where: { organizationId, provider: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.agentRun.groupBy({
        by: ['provider'],
        where: { organizationId, provider: { not: null }, status: 'SUCCEEDED' },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<AvgLatencyRow[]>`
        SELECT "AgentRun"."provider" AS provider, AVG("AiResponse"."latencyMs")::float AS "avgLatencyMs"
        FROM "AiResponse"
        JOIN "AgentRun" ON "AgentRun"."id" = "AiResponse"."agentRunId"
        WHERE "AgentRun"."organizationId" = ${organizationId}
        GROUP BY "AgentRun"."provider"
      `,
    ]);

    const succeededMap = new Map(succeededGroups.map((g) => [g.provider as string, g._count._all]));
    const avgLatencyMap = new Map(avgLatencyRows.map((r) => [r.provider, r.avgLatencyMs]));

    return totalGroups.map((g) => {
      const provider = g.provider as string;
      const total = g._count._all;
      const succeeded = succeededMap.get(provider) ?? 0;
      return {
        provider,
        totalRequests: total,
        successRate: total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0,
        avgResponseTimeMs: avgLatencyMap.get(provider) ?? null,
      };
    });
  }
}
