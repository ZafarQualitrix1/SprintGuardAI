import { Injectable, NotFoundException } from '@nestjs/common';
import { HealthStatus, Prisma, PrismaService } from '@sprintguard/database';
import {
  AiProviderConfigRecord,
  IAiProviderConfigRepository,
  UpdateProviderHealthInput,
  UpsertAiProviderConfigInput,
} from '../../domain/repositories/ai-provider-config.repository.interface';

function toRecord(row: {
  id: string;
  organizationId: string;
  provider: string;
  isEnabled: boolean;
  isDefault: boolean;
  apiKeyEncrypted: string | null;
  defaultModel: string | null;
  projectId: string | null;
  region: string | null;
  timeoutMs: number | null;
  retryCount: number | null;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  maxOutputTokens: number | null;
  streaming: boolean;
  safetySettings: Prisma.JsonValue | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  healthStatus: string;
  lastConnectedAt: Date | null;
  lastTestLatencyMs: number | null;
  lastTestError: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AiProviderConfigRecord {
  return { ...row, safetySettings: row.safetySettings };
}

@Injectable()
export class PrismaAiProviderConfigRepository implements IAiProviderConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrgAndProvider(organizationId: string, provider: string): Promise<AiProviderConfigRecord | null> {
    const row = await this.prisma.aiProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    return row ? toRecord(row) : null;
  }

  async listByOrg(organizationId: string): Promise<AiProviderConfigRecord[]> {
    const rows = await this.prisma.aiProviderConfig.findMany({ where: { organizationId } });
    return rows.map(toRecord);
  }

  async upsert(input: UpsertAiProviderConfigInput): Promise<AiProviderConfigRecord> {
    const { organizationId, provider, apiKeyEncrypted, ...rest } = input;
    const row = await this.prisma.aiProviderConfig.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: {
        organizationId,
        provider,
        apiKeyEncrypted,
        ...rest,
        safetySettings: rest.safetySettings as Prisma.InputJsonValue | undefined,
      },
      update: {
        ...(apiKeyEncrypted !== undefined ? { apiKeyEncrypted } : {}),
        ...rest,
        safetySettings: rest.safetySettings as Prisma.InputJsonValue | undefined,
      },
    });
    return toRecord(row);
  }

  async setEnabled(organizationId: string, provider: string, isEnabled: boolean): Promise<AiProviderConfigRecord> {
    await this.assertExists(organizationId, provider);
    const row = await this.prisma.aiProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: { isEnabled },
    });
    return toRecord(row);
  }

  async setDefault(organizationId: string, provider: string): Promise<AiProviderConfigRecord> {
    await this.assertExists(organizationId, provider);

    const [, row] = await this.prisma.$transaction([
      this.prisma.aiProviderConfig.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.aiProviderConfig.update({
        where: { organizationId_provider: { organizationId, provider } },
        data: { isDefault: true },
      }),
    ]);

    return toRecord(row);
  }

  async updateHealth(
    organizationId: string,
    provider: string,
    input: UpdateProviderHealthInput,
  ): Promise<AiProviderConfigRecord> {
    const row = await this.prisma.aiProviderConfig.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: {
        healthStatus: input.healthStatus as HealthStatus,
        lastConnectedAt: input.lastConnectedAt,
        lastTestLatencyMs: input.lastTestLatencyMs,
        lastTestError: input.lastTestError,
      },
    });
    return toRecord(row);
  }

  private async assertExists(organizationId: string, provider: string) {
    const row = await this.prisma.aiProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    if (!row) {
      throw new NotFoundException(`No AI provider config for "${provider}" in this organization`);
    }
    return row;
  }
}
