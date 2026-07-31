import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';

// AuditLog exists in the schema but nothing wrote to it anywhere in the codebase before this
// module (docs/architecture/06-production-checklist.md §4.3). Scoped here to this module's
// mutating commands only -- a codebase-wide interceptor is separately-tracked future work.
@Injectable()
export class AuditLogService {
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
