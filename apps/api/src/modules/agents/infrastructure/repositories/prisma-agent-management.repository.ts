import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  AgentSummary,
  IAgentManagementRepository,
} from '../../domain/repositories/agent-management.repository.interface';

interface LatencyConfidenceRow {
  agentId: string;
  avgLatencyMs: number | null;
  avgConfidence: number | null;
}

@Injectable()
export class PrismaAgentManagementRepository implements IAgentManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listWithStats(organizationId: string): Promise<AgentSummary[]> {
    const [agents, runGroups, latencyRows, lastExecRows] = await Promise.all([
      this.prisma.agent.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.agentRun.groupBy({
        by: ['agentId', 'status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<LatencyConfidenceRow[]>`
        SELECT "AgentRun"."agentId" AS "agentId",
               AVG("AiResponse"."latencyMs")::float AS "avgLatencyMs",
               AVG("AiResponse"."confidenceScore")::float AS "avgConfidence"
        FROM "AiResponse"
        JOIN "AgentRun" ON "AgentRun"."id" = "AiResponse"."agentRunId"
        WHERE "AgentRun"."organizationId" = ${organizationId}
        GROUP BY "AgentRun"."agentId"
      `,
      this.prisma.agentRun.groupBy({
        by: ['agentId'],
        where: { organizationId },
        _max: { startedAt: true },
      }),
    ]);

    const totalsByAgent = new Map<string, number>();
    const succeededByAgent = new Map<string, number>();
    for (const row of runGroups) {
      totalsByAgent.set(row.agentId, (totalsByAgent.get(row.agentId) ?? 0) + row._count._all);
      if (row.status === 'SUCCEEDED') {
        succeededByAgent.set(row.agentId, (succeededByAgent.get(row.agentId) ?? 0) + row._count._all);
      }
    }
    const latencyMap = new Map(latencyRows.map((r) => [r.agentId, r]));
    const lastExecMap = new Map(lastExecRows.map((r) => [r.agentId, r._max.startedAt]));

    return agents.map((agent) => {
      const total = totalsByAgent.get(agent.id) ?? 0;
      const succeeded = succeededByAgent.get(agent.id) ?? 0;
      const latency = latencyMap.get(agent.id);
      const lastExecutionAt = lastExecMap.get(agent.id);

      return {
        id: agent.id,
        key: agent.key,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        isBuiltIn: agent.isBuiltIn,
        avgLatencyMs: latency?.avgLatencyMs ?? null,
        avgConfidenceScore: latency?.avgConfidence ?? null,
        successRate: total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0,
        totalExecutions: total,
        lastExecutionAt: lastExecutionAt ? lastExecutionAt.toISOString() : null,
      };
    });
  }

  async setStatus(key: string, status: 'ENABLED' | 'DISABLED') {
    const existing = await this.prisma.agent.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Unknown agent "${key}"`);
    }
    const row = await this.prisma.agent.update({ where: { key }, data: { status } });
    return { id: row.id, key: row.key, status: row.status };
  }
}
