import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreatePromptInput,
  CreateVersionInput,
  IPromptRepository,
  PromptListFilter,
  UpdateDraftInput,
} from '../../domain/repositories/prompt.repository.interface';
import { ApprovalDecision, PromptEntity, PromptLibraryRow, PromptStatus } from '../../domain/entities/prompt.entity';
import { toPromptApprovalEntity, toPromptEntity } from '../mappers/prompt.mapper';

const withApprovals = {
  approvals: { include: { reviewer: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' as const } },
};

function nextVersion(current: string): string {
  const n = parseInt(current.replace(/^v/i, ''), 10);
  return Number.isFinite(n) ? `v${n + 1}` : `${current}-2`;
}

@Injectable()
export class PrismaPromptRepository implements IPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: PromptListFilter): Promise<{ rows: PromptLibraryRow[]; total: number }> {
    const [allPrompts, agents, moduleConfigs, defaultProviderConfig, modelEntries] = await Promise.all([
      this.prisma.aiPrompt.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.agent.findMany(),
      this.prisma.moduleAiConfig.findMany({ where: { organizationId: filter.organizationId } }),
      this.prisma.aiProviderConfig.findFirst({ where: { organizationId: filter.organizationId, isDefault: true, isEnabled: true } }),
      this.prisma.modelRegistryEntry.findMany({ where: { isActive: true } }),
    ]);

    // Latest version per capability, by createdAt (version is a free-form string like "v1"/"v2",
    // not reliably sortable numerically or lexically past v9 -- createdAt is the honest ordering).
    const latestByCapability = new Map<string, (typeof allPrompts)[number]>();
    for (const row of allPrompts) {
      const existing = latestByCapability.get(row.capability);
      if (!existing || row.createdAt > existing.createdAt) {
        latestByCapability.set(row.capability, row);
      }
    }

    const capabilityToAgent = new Map<string, { key: string; name: string }>();
    for (const agent of agents) {
      for (const capability of (agent.capabilities as string[]) ?? []) {
        if (!capabilityToAgent.has(capability)) {
          capabilityToAgent.set(capability, { key: agent.key, name: agent.name });
        }
      }
    }
    const moduleConfigByCapability = new Map(moduleConfigs.map((c) => [c.capability, c]));

    // Execution stats sourced from AiResponse (has a real promptId FK, so these are exact per
    // version) -- grouped once here rather than per-row to avoid N+1 queries.
    const promptIds = [...latestByCapability.values()].map((p) => p.id);
    const responseStats = await this.prisma.aiResponse.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { _all: true },
      _avg: { tokensUsed: true, latencyMs: true, confidenceScore: true },
      _max: { createdAt: true },
    });
    const statsByPromptId = new Map(responseStats.map((s) => [s.promptId, s]));

    // Success rate is computed at capability (agent) level, not per exact version -- a FAILED
    // AgentRun has no promptId (only successful attempts persist an AiResponse row), so precise
    // per-version failure attribution isn't possible with the current schema. This is an honest
    // capability-level proxy, documented here rather than silently presented as version-exact.
    const runStatsByAgentId = new Map<string, { total: number; succeeded: number }>();
    const runGroups = await this.prisma.agentRun.groupBy({
      by: ['agentId', 'status'],
      where: { organizationId: filter.organizationId },
      _count: { _all: true },
    });
    for (const group of runGroups) {
      const entry = runStatsByAgentId.get(group.agentId) ?? { total: 0, succeeded: 0 };
      entry.total += group._count._all;
      if (group.status === 'SUCCEEDED') entry.succeeded += group._count._all;
      runStatsByAgentId.set(group.agentId, entry);
    }

    let rows: PromptLibraryRow[] = [...latestByCapability.values()].map((p) => {
      const agent = capabilityToAgent.get(p.capability) ?? null;
      const moduleConfig = moduleConfigByCapability.get(p.capability);
      const provider = (moduleConfig?.isEnabled ? moduleConfig.provider : undefined) ?? defaultProviderConfig?.provider ?? 'anthropic';
      const model =
        (moduleConfig?.isEnabled ? moduleConfig.model : undefined) ??
        modelEntries.find((m) => m.provider === provider && (m.allowedCapabilities as string[]).includes(p.capability))?.model ??
        null;
      const stats = statsByPromptId.get(p.id);
      const agentRow = agent ? agents.find((a) => a.key === agent.key) : undefined;
      const runStats = agentRow ? runStatsByAgentId.get(agentRow.id) : undefined;

      return {
        id: p.id,
        capability: p.capability,
        version: p.version,
        name: p.name,
        category: p.category,
        status: p.status,
        isActive: p.isActive,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        agentKey: agent?.key ?? null,
        agentName: agent?.name ?? null,
        provider,
        model,
        totalExecutions: stats?._count._all ?? 0,
        successRate: runStats && runStats.total > 0 ? runStats.succeeded / runStats.total : null,
        avgLatencyMs: stats?._avg.latencyMs ?? null,
        avgTokens: stats?._avg.tokensUsed ?? null,
        avgConfidenceScore: stats?._avg.confidenceScore ?? null,
        lastUsedAt: stats?._max.createdAt ?? null,
      };
    });

    if (filter.search) {
      const term = filter.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.capability.toLowerCase().includes(term) ||
          (r.name ?? '').toLowerCase().includes(term) ||
          (r.agentName ?? '').toLowerCase().includes(term),
      );
    }
    if (filter.category) rows = rows.filter((r) => r.category === filter.category);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter.createdBy) rows = rows.filter((r) => r.createdBy === filter.createdBy);

    const total = rows.length;
    const start = (filter.page - 1) * filter.pageSize;
    rows = rows.slice(start, start + filter.pageSize);

    return { rows, total };
  }

  async findHistory(capability: string): Promise<PromptEntity[]> {
    const rows = await this.prisma.aiPrompt.findMany({
      where: { capability },
      include: withApprovals,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPromptEntity);
  }

  async findOne(capability: string, version: string): Promise<PromptEntity | null> {
    const row = await this.prisma.aiPrompt.findUnique({
      where: { capability_version: { capability, version } },
      include: withApprovals,
    });
    return row ? toPromptEntity(row) : null;
  }

  async findById(id: string): Promise<PromptEntity | null> {
    const row = await this.prisma.aiPrompt.findUnique({ where: { id }, include: withApprovals });
    return row ? toPromptEntity(row) : null;
  }

  async listCapabilities(): Promise<string[]> {
    const rows = await this.prisma.aiPrompt.findMany({ select: { capability: true }, distinct: ['capability'] });
    return rows.map((r) => r.capability);
  }

  async create(input: CreatePromptInput): Promise<PromptEntity> {
    const existing = await this.prisma.aiPrompt.findFirst({ where: { capability: input.capability } });
    if (existing) {
      throw new ConflictException(`A prompt already exists for capability "${input.capability}" -- create a new version instead.`);
    }
    const agent = await this.prisma.agent.findUnique({ where: { key: input.agentKey } });
    if (!agent) {
      throw new NotFoundException(`Unknown agent "${input.agentKey}"`);
    }
    const capabilities = (agent.capabilities as string[]) ?? [];
    if (!capabilities.includes(input.capability)) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { capabilities: [...capabilities, input.capability] },
      });
    }

    const templateHash = createHash('sha256').update(input.template).digest('hex');
    const row = await this.prisma.aiPrompt.create({
      data: {
        capability: input.capability,
        version: 'v1',
        template: input.template,
        jsonSchema: input.jsonSchema as Prisma.InputJsonValue,
        status: 'DRAFT',
        isActive: false,
        templateHash,
        createdBy: input.createdBy,
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags as Prisma.InputJsonValue,
      },
      include: withApprovals,
    });
    return toPromptEntity(row);
  }

  async createVersion(capability: string, input: CreateVersionInput): Promise<PromptEntity> {
    const latest = await this.prisma.aiPrompt.findFirst({ where: { capability }, orderBy: { createdAt: 'desc' } });
    if (!latest) {
      throw new NotFoundException(`No existing prompt for capability "${capability}" -- create one first.`);
    }
    const version = nextVersion(latest.version);
    const templateHash = createHash('sha256').update(input.template).digest('hex');

    const row = await this.prisma.aiPrompt.create({
      data: {
        capability,
        version,
        template: input.template,
        jsonSchema: input.jsonSchema as Prisma.InputJsonValue,
        status: 'DRAFT',
        isActive: false,
        templateHash,
        createdBy: input.createdBy,
        name: input.name ?? latest.name,
        description: input.description ?? latest.description,
        category: input.category ?? latest.category,
        tags: (input.tags ?? (latest.tags as string[] | null) ?? []) as Prisma.InputJsonValue,
        changeSummary: input.changeSummary,
      },
      include: withApprovals,
    });
    return toPromptEntity(row);
  }

  async updateDraft(id: string, patch: UpdateDraftInput): Promise<PromptEntity> {
    const existing = await this.prisma.aiPrompt.findUniqueOrThrow({ where: { id } });
    if (existing.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT versions can be edited -- create a new version instead.');
    }
    const templateHash = patch.template ? createHash('sha256').update(patch.template).digest('hex') : undefined;
    const row = await this.prisma.aiPrompt.update({
      where: { id },
      data: {
        template: patch.template,
        jsonSchema: patch.jsonSchema as Prisma.InputJsonValue | undefined,
        templateHash,
        name: patch.name,
        description: patch.description,
        category: patch.category,
        tags: patch.tags as Prisma.InputJsonValue | undefined,
        changeSummary: patch.changeSummary,
      },
      include: withApprovals,
    });
    return toPromptEntity(row);
  }

  async setStatus(id: string, status: PromptStatus): Promise<PromptEntity> {
    const row = await this.prisma.aiPrompt.update({ where: { id }, data: { status }, include: withApprovals });
    return toPromptEntity(row);
  }

  async activate(id: string, capability: string): Promise<PromptEntity> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.aiPrompt.updateMany({
        where: { capability, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
      return tx.aiPrompt.update({
        where: { id },
        data: { isActive: true, status: 'ACTIVE' },
        include: withApprovals,
      });
    });
    return toPromptEntity(row);
  }

  async createApproval(promptId: string, reviewerId: string, decision: ApprovalDecision, rationale: string | null) {
    const row = await this.prisma.promptApproval.create({
      data: { promptId, reviewerId, decision, rationale },
      include: { reviewer: { select: { fullName: true } } },
    });
    return toPromptApprovalEntity(row);
  }

  async countResponsesForPrompt(promptId: string): Promise<number> {
    return this.prisma.aiResponse.count({ where: { promptId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.aiPrompt.delete({ where: { id } });
  }
}
