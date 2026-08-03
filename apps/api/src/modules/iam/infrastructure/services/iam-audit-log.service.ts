import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';

// Same one-line pattern as integration/infrastructure/services/audit-log.service.ts.
@Injectable()
export class IamAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(organizationId: string, actorId: string | null, action: string, targetType: string, targetId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { organizationId, actorId, action, targetType, targetId },
    });
  }
}
