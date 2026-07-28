import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const CUID_PATTERN = /^[a-z0-9]+$/i;

// Thin wrapper around PrismaClient, injectable across every NestJS module (Solution Architecture
// §7: Infrastructure implements repository interfaces using Prisma; Prisma is never imported
// outside Infrastructure).
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }

  /**
   * Runs `fn` inside a transaction with the Postgres session variable `app.current_org_id` set
   * via `SET LOCAL`, activating the Row-Level Security policies described in
   * docs/architecture/02-database-design.md §9 -- defense-in-depth beneath the application-level
   * `organizationId` filtering every repository already applies. `SET LOCAL` scopes the setting to
   * the current transaction only, so it never leaks across pooled connections.
   */
  async withTenant<T>(
    organizationId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!CUID_PATTERN.test(organizationId)) {
      throw new Error(`Invalid organizationId for tenant context: ${organizationId}`);
    }

    return this.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${organizationId}'`);
      return fn(tx);
    });
  }
}
