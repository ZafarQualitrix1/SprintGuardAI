import { Injectable } from '@nestjs/common';
import { AgentRunStatus, PrismaService } from '@sprintguard/database';
import {
  AiCostSummary,
  AiLogEntry,
  AiUsageSummary,
  IAiOpsReadRepository,
  ListAiLogsFilters,
  ListAiLogsResult,
} from '../../domain/repositories/ai-ops-read.repository.interface';

interface DailyTrendRow {
  date: Date;
  requests: number;
  tokens: number;
}

interface CostByProviderRow {
  provider: string;
  costUsd: number;
}

interface CostByModuleRow {
  agentKey: string;
  agentName: string;
  costUsd: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PrismaAiOpsReadRepository implements IAiOpsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageSummary(organizationId: string): Promise<AiUsageSummary> {
    const now = new Date();
    const since24h = new Date(now.getTime() - DAY_MS);
    const since7d = new Date(now.getTime() - 7 * DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);
    const since14d = new Date(now.getTime() - 14 * DAY_MS);

    const [total, succeeded, failed, avgLatencyRow, window24h, window7d, window30d, dailyTrend] = await Promise.all([
      this.prisma.agentRun.count({ where: { organizationId } }),
      this.prisma.agentRun.count({ where: { organizationId, status: 'SUCCEEDED' } }),
      this.prisma.agentRun.count({ where: { organizationId, status: { in: ['FAILED', 'FLAGGED_FOR_REVIEW'] } } }),
      this.prisma.aiResponse.aggregate({
        where: { agentRun: { organizationId } },
        _avg: { latencyMs: true, tokensUsed: true },
      }),
      this.usageWindow(organizationId, since24h),
      this.usageWindow(organizationId, since7d),
      this.usageWindow(organizationId, since30d),
      this.prisma.$queryRaw<DailyTrendRow[]>`
        SELECT DATE("startedAt") AS date, COUNT(*)::int AS requests, COALESCE(SUM("tokensUsed"), 0)::int AS tokens
        FROM "AgentRun"
        WHERE "organizationId" = ${organizationId} AND "startedAt" >= ${since14d}
        GROUP BY DATE("startedAt")
        ORDER BY date ASC
      `,
    ]);

    return {
      totalRequests: total,
      successfulRequests: succeeded,
      failedRequests: failed,
      avgResponseTimeMs: avgLatencyRow._avg.latencyMs,
      avgTokensPerRequest: avgLatencyRow._avg.tokensUsed,
      last24h: window24h,
      last7d: window7d,
      last30d: window30d,
      dailyTrend: dailyTrend.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        requests: row.requests,
        tokens: row.tokens,
      })),
    };
  }

  private async usageWindow(organizationId: string, since: Date) {
    const [requests, tokenAgg] = await Promise.all([
      this.prisma.agentRun.count({ where: { organizationId, startedAt: { gte: since } } }),
      this.prisma.agentRun.aggregate({
        where: { organizationId, startedAt: { gte: since } },
        _sum: { tokensUsed: true },
      }),
    ]);
    return { requests, tokens: tokenAgg._sum.tokensUsed ?? 0 };
  }

  async getCostSummary(organizationId: string): Promise<AiCostSummary> {
    const now = new Date();
    const since24h = new Date(now.getTime() - DAY_MS);
    const since30d = new Date(now.getTime() - 30 * DAY_MS);

    const [totalCost, cost24h, cost30d, costByProvider, costByModule, quota] = await Promise.all([
      this.prisma.agentRun.aggregate({ where: { organizationId }, _sum: { costUsd: true } }),
      this.prisma.agentRun.aggregate({
        where: { organizationId, startedAt: { gte: since24h } },
        _sum: { costUsd: true },
      }),
      this.prisma.agentRun.aggregate({
        where: { organizationId, startedAt: { gte: since30d } },
        _sum: { costUsd: true },
      }),
      this.prisma.$queryRaw<CostByProviderRow[]>`
        SELECT provider, COALESCE(SUM("costUsd"), 0)::float AS "costUsd"
        FROM "AgentRun"
        WHERE "organizationId" = ${organizationId} AND provider IS NOT NULL
        GROUP BY provider
      `,
      this.prisma.$queryRaw<CostByModuleRow[]>`
        SELECT "Agent"."key" AS "agentKey", "Agent"."name" AS "agentName",
               COALESCE(SUM("AgentRun"."costUsd"), 0)::float AS "costUsd"
        FROM "AgentRun"
        JOIN "Agent" ON "Agent"."id" = "AgentRun"."agentId"
        WHERE "AgentRun"."organizationId" = ${organizationId}
        GROUP BY "Agent"."key", "Agent"."name"
      `,
      this.prisma.usageQuota.findFirst({
        where: { organizationId, metric: 'ai_cost_usd', periodEnd: { gte: now } },
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    return {
      totalCostUsd: Number(totalCost._sum.costUsd ?? 0),
      last24hCostUsd: Number(cost24h._sum.costUsd ?? 0),
      last30dCostUsd: Number(cost30d._sum.costUsd ?? 0),
      costByProvider,
      costByModule,
      budget: quota
        ? { limitUsd: quota.limit, usedUsd: quota.used, remainingUsd: Math.max(quota.limit - quota.used, 0) }
        : null,
    };
  }

  async listLogs(organizationId: string, filters: ListAiLogsFilters): Promise<ListAiLogsResult> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

    const dateRange = filters.date
      ? {
          gte: new Date(`${filters.date}T00:00:00.000Z`),
          lt: new Date(new Date(`${filters.date}T00:00:00.000Z`).getTime() + DAY_MS),
        }
      : undefined;

    const where = {
      organizationId,
      ...(dateRange ? { startedAt: dateRange } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.status ? { status: filters.status as AgentRunStatus } : {}),
      ...(filters.agentKey ? { agent: { key: filters.agentKey } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.agentRun.findMany({
        where,
        include: { agent: true, aiResponses: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.agentRun.count({ where }),
    ]);

    const items: AiLogEntry[] = rows.map((row) => {
      const response = row.aiResponses[0];
      return {
        agentRunId: row.id,
        timestamp: row.startedAt.toISOString(),
        module: row.agent.name,
        provider: row.provider,
        model: row.model,
        promptVersion: response?.promptVersion ?? null,
        executionTimeMs: response?.latencyMs ?? null,
        tokensUsed: row.tokensUsed,
        status: row.status,
        error: row.error,
        responseId: response?.id ?? null,
      };
    });

    return { items, total, page, pageSize };
  }
}
