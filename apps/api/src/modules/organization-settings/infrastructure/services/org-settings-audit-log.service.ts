import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';

// Same one-line pattern as integration/infrastructure/services/audit-log.service.ts.
@Injectable()
export class OrgSettingsAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    organizationId: string,
    actorId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorId,
        action,
        targetType,
        targetId,
        before: before as Prisma.InputJsonValue | undefined,
        after: after as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
