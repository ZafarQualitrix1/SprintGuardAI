import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateIntegrationConnectionInput,
  IIntegrationConnectionRepository,
  UpdateIntegrationConnectionInput,
} from '../../domain/repositories/integration-connection.repository.interface';
import { HealthStatus } from '../../domain/entities/integration-connection.entity';
import { ExternalProjectPayload } from '../../application/ports/integration-connector.port';
import { toIntegrationConnectionEntity, toIntegrationProjectEntity } from '../mappers';

const withConnector = { connector: true } satisfies Prisma.IntegrationConnectionInclude;

// Duplicate-connection prevention (Rule: "Prevent duplicate workspace connections") is enforced by
// the DB's unique index (organizationId, connectorId, siteUrl, email) -- this is where the raw
// Postgres constraint violation gets translated into a clean, user-facing error.
function rethrowIfDuplicate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('A connection to this Jira site with this email already exists.');
  }
  throw error;
}

@Injectable()
export class PrismaIntegrationConnectionRepository implements IIntegrationConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateIntegrationConnectionInput) {
    const connector = await this.prisma.connector.findUnique({ where: { key: input.connectorKey } });
    if (!connector) {
      throw new NotFoundException(
        `Unknown connector "${input.connectorKey}". Run \`pnpm db:seed\` to load the connector catalog.`,
      );
    }

    try {
      const row = await this.prisma.integrationConnection.create({
        data: {
          organizationId: input.organizationId,
          connectorId: connector.id,
          name: input.name,
          siteUrl: input.siteUrl,
          email: input.email,
          credentialsEncrypted: input.credentialsEncrypted,
          config: input.config as Prisma.InputJsonValue,
          status: 'CONNECTED',
          isDefault: input.isDefault,
        },
        include: withConnector,
      });
      return toIntegrationConnectionEntity(row);
    } catch (error) {
      rethrowIfDuplicate(error);
    }
  }

  async update(id: string, organizationId: string, patch: UpdateIntegrationConnectionInput) {
    await this.assertExists(id, organizationId);
    try {
      const row = await this.prisma.integrationConnection.update({
        where: { id },
        data: {
          name: patch.name,
          siteUrl: patch.siteUrl,
          email: patch.email,
          credentialsEncrypted: patch.credentialsEncrypted,
          config: patch.config as Prisma.InputJsonValue | undefined,
        },
        include: withConnector,
      });
      return toIntegrationConnectionEntity(row);
    } catch (error) {
      rethrowIfDuplicate(error);
    }
  }

  async findById(id: string, organizationId: string) {
    const row = await this.prisma.integrationConnection.findFirst({
      where: { id, organizationId },
      include: withConnector,
    });
    return row ? toIntegrationConnectionEntity(row) : null;
  }

  async findCredentialsById(id: string, organizationId: string) {
    const row = await this.prisma.integrationConnection.findFirst({
      where: { id, organizationId },
      include: withConnector,
    });
    if (!row) {
      return null;
    }
    return {
      credentialsEncrypted: row.credentialsEncrypted,
      config: (row.config as Record<string, unknown>) ?? {},
      connectorKey: row.connector.key,
    };
  }

  async listByOrganization(organizationId: string) {
    const rows = await this.prisma.integrationConnection.findMany({
      where: { organizationId },
      include: withConnector,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toIntegrationConnectionEntity);
  }

  async hasAnyForConnector(organizationId: string, connectorKey: string) {
    const count = await this.prisma.integrationConnection.count({
      where: { organizationId, connector: { key: connectorKey } },
    });
    return count > 0;
  }

  async setDefault(id: string, organizationId: string) {
    const existing = await this.assertExists(id, organizationId);

    const [, row] = await this.prisma.$transaction([
      this.prisma.integrationConnection.updateMany({
        where: { organizationId, connectorId: existing.connectorId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.integrationConnection.update({
        where: { id },
        data: { isDefault: true },
        include: withConnector,
      }),
    ]);

    return toIntegrationConnectionEntity(row);
  }

  async softDisconnect(id: string, organizationId: string) {
    await this.assertExists(id, organizationId);
    const row = await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        // Tombstone rather than null -- credentialsEncrypted is a required column, and decrypting
        // this value will simply fail cleanly (malformed ciphertext) if anything ever tries.
        credentialsEncrypted: 'disconnected',
        isDefault: false,
      },
      include: withConnector,
    });
    return toIntegrationConnectionEntity(row);
  }

  async hardDelete(id: string, organizationId: string) {
    await this.assertExists(id, organizationId);
    await this.prisma.integrationConnection.delete({ where: { id } });
  }

  async updateHealth(
    id: string,
    healthStatus: HealthStatus,
    lastHealthCheckAt: Date,
    status?: 'CONNECTED' | 'ERROR',
  ) {
    await this.prisma.integrationConnection.update({
      where: { id },
      data: { healthStatus, lastHealthCheckAt, ...(status ? { status } : {}) },
    });
  }

  async updateSyncTimestamp(id: string, lastSyncedAt: Date) {
    await this.prisma.integrationConnection.update({ where: { id }, data: { lastSyncedAt } });
  }

  async listAllConnected() {
    const rows = await this.prisma.integrationConnection.findMany({
      where: { status: 'CONNECTED' },
      include: withConnector,
    });
    return rows.map(toIntegrationConnectionEntity);
  }

  async upsertProjects(connectionId: string, projects: ExternalProjectPayload[]) {
    const rows = await this.prisma.$transaction(
      projects.map((project) =>
        this.prisma.integrationProject.upsert({
          where: { connectionId_externalKey: { connectionId, externalKey: project.externalKey } },
          create: {
            connectionId,
            externalKey: project.externalKey,
            name: project.name,
            avatarUrl: project.avatarUrl,
            lead: project.lead,
          },
          update: {
            name: project.name,
            avatarUrl: project.avatarUrl,
            lead: project.lead,
          },
        }),
      ),
    );
    return rows.map(toIntegrationProjectEntity);
  }

  async listProjectsByConnection(connectionId: string, organizationId: string) {
    await this.assertExists(connectionId, organizationId);
    const rows = await this.prisma.integrationProject.findMany({
      where: { connectionId },
      orderBy: { name: 'asc' },
    });
    return rows.map(toIntegrationProjectEntity);
  }

  private async assertExists(id: string, organizationId: string) {
    const row = await this.prisma.integrationConnection.findFirst({ where: { id, organizationId } });
    if (!row) {
      throw new NotFoundException('Integration connection not found');
    }
    return row;
  }
}
