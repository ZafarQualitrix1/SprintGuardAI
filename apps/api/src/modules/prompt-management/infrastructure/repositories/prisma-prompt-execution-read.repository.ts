import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  AnalyticsSummary,
  ExecutionListFilter,
  ExecutionRow,
  IPromptExecutionReadRepository,
} from '../../domain/repositories/prompt-execution-read.repository.interface';

// Fetch cap for the JS-side capability/search filtering pass below -- DB-level filters
// (organizationId/provider/model/status/date) already narrow this in the common case; a raw-SQL
// rewrite is the natural next step if a single org's run volume ever exceeds this in practice.
const FETCH_CAP = 2000;

@Injectable()
export class PrismaPromptExecutionReadRepository implements IPromptExecutionReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ExecutionListFilter): Promise<{ rows: ExecutionRow[]; total: number }> {
    const where: Prisma.AgentRunWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.provider ? { provider: filter.provider } : {}),
      ...(filter.model ? { model: filter.model } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.from || filter.to ? { startedAt: { gte: filter.from, lte: filter.to } } : {}),
    };

    const runs = await this.prisma.agentRun.findMany({
      where,
      include: {
        agent: { select: { key: true, capabilities: true } },
        aiResponses: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { startedAt: 'desc' },
      take: FETCH_CAP,
    });

    let rows: ExecutionRow[] = runs.map((run) => {
      const response = run.aiResponses[0];
      const capabilities = (run.agent.capabilities as string[]) ?? [];
      return {
        id: run.id,
        timestamp: run.startedAt,
        capability: capabilities[0] ?? 'unknown',
        agentKey: run.agent.key,
        promptVersion: response?.promptVersion ?? null,
        provider: run.provider ?? 'unknown',
        model: run.model ?? 'unknown',
        status: run.status,
        latencyMs: response?.latencyMs ?? null,
        totalTokens: run.tokensUsed ?? null,
        costUsd: run.costUsd ? Number(run.costUsd) : null,
        confidenceScore: run.confidenceScore ?? null,
        failureReason: run.error ?? null,
        correlationId: run.correlationId,
        isPlayground: run.correlationId.startsWith('playground-'),
      };
    });

    if (filter.capability) rows = rows.filter((r) => r.capability === filter.capability);
    if (filter.search) {
      const term = filter.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.capability.toLowerCase().includes(term) ||
          (r.agentKey ?? '').toLowerCase().includes(term) ||
          r.correlationId.toLowerCase().includes(term),
      );
    }

    const total = rows.length;
    const start = (filter.page - 1) * filter.pageSize;
    return { rows: rows.slice(start, start + filter.pageSize), total };
  }

  async getAnalyticsSummary(organizationId: string, days: number): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const runs = await this.prisma.agentRun.findMany({
      where: { organizationId, startedAt: { gte: since } },
      include: { agent: { select: { capabilities: true } }, aiResponses: { take: 1 } },
    });

    const totalExecutions = runs.length;
    const succeeded = runs.filter((r) => r.status === 'SUCCEEDED').length;
    const failed = runs.filter((r) => r.status === 'FAILED' || r.status === 'FLAGGED_FOR_REVIEW').length;
    const avg = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);

    const latencies = runs.map((r) => r.aiResponses[0]?.latencyMs).filter((v): v is number => v != null);
    const tokens = runs.map((r) => r.tokensUsed).filter((v): v is number => v != null);
    const costs = runs.map((r) => (r.costUsd ? Number(r.costUsd) : null)).filter((v): v is number => v != null);
    const confidences = runs.map((r) => r.confidenceScore).filter((v): v is number => v != null);

    const byCapabilityMap = new Map<string, { executions: number; succeeded: number; latencies: number[] }>();
    const byProviderMap = new Map<string, { executions: number; succeeded: number; costs: number[] }>();
    for (const run of runs) {
      const capability = ((run.agent.capabilities as string[]) ?? [])[0] ?? 'unknown';
      const capEntry = byCapabilityMap.get(capability) ?? { executions: 0, succeeded: 0, latencies: [] };
      capEntry.executions += 1;
      if (run.status === 'SUCCEEDED') capEntry.succeeded += 1;
      const latency = run.aiResponses[0]?.latencyMs;
      if (latency != null) capEntry.latencies.push(latency);
      byCapabilityMap.set(capability, capEntry);

      const provider = run.provider ?? 'unknown';
      const provEntry = byProviderMap.get(provider) ?? { executions: 0, succeeded: 0, costs: [] };
      provEntry.executions += 1;
      if (run.status === 'SUCCEEDED') provEntry.succeeded += 1;
      const cost = run.costUsd ? Number(run.costUsd) : null;
      if (cost != null) provEntry.costs.push(cost);
      byProviderMap.set(provider, provEntry);
    }

    const byCapability = [...byCapabilityMap.entries()].map(([capability, v]) => ({
      capability,
      executions: v.executions,
      successRate: v.executions > 0 ? v.succeeded / v.executions : 0,
      avgLatencyMs: avg(v.latencies),
    }));
    const byProvider = [...byProviderMap.entries()].map(([provider, v]) => ({
      provider,
      executions: v.executions,
      successRate: v.executions > 0 ? v.succeeded / v.executions : 0,
      avgCostUsd: avg(v.costs),
    }));
    const ranked = [...byCapability]
      .filter((c) => c.executions >= 3) // avoid ranking on statistically noisy single-digit samples
      .sort((a, b) => b.successRate - a.successRate)
      .map((c) => ({ capability: c.capability, version: 'latest', successRate: c.successRate, executions: c.executions }));

    const trendMap = new Map<string, { executions: number; tokens: number[]; costs: number[]; succeeded: number }>();
    for (const run of runs) {
      const date = run.startedAt.toISOString().slice(0, 10);
      const entry = trendMap.get(date) ?? { executions: 0, tokens: [], costs: [], succeeded: 0 };
      entry.executions += 1;
      if (run.tokensUsed != null) entry.tokens.push(run.tokensUsed);
      if (run.costUsd != null) entry.costs.push(Number(run.costUsd));
      if (run.status === 'SUCCEEDED') entry.succeeded += 1;
      trendMap.set(date, entry);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        executions: v.executions,
        avgTokens: avg(v.tokens),
        avgCostUsd: avg(v.costs),
        successRate: v.executions > 0 ? v.succeeded / v.executions : 0,
      }));

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? succeeded / totalExecutions : 0,
      failureRate: totalExecutions > 0 ? failed / totalExecutions : 0,
      avgLatencyMs: avg(latencies),
      avgTokens: avg(tokens),
      avgCostUsd: avg(costs),
      avgConfidenceScore: avg(confidences),
      byCapability,
      byProvider,
      topPerforming: ranked.slice(0, 5),
      poorPerforming: ranked.slice(-5).reverse(),
      trend,
    };
  }
}
