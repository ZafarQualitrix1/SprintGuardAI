import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateIntegrationConnectionInput,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { toIntegrationConnectionEntity } from '../mappers';

const withConnector = { connector: true } satisfies Prisma.IntegrationConnectionInclude;

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

    const row = await this.prisma.integrationConnection.create({
      data: {
        organizationId: input.organizationId,
        connectorId: connector.id,
        name: input.name,
        credentialsEncrypted: input.credentialsEncrypted,
        config: input.config as Prisma.InputJsonValue,
        status: 'CONNECTED',
      },
      include: withConnector,
    });

    return toIntegrationConnectionEntity(row);
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
}
