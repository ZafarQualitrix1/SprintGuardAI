import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  AuditLogEntry,
  IAuditLogRepository,
  ListAuditLogsFilters,
  ListAuditLogsResult,
} from '../../domain/repositories/audit-log.repository.interface';

@Injectable()
export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListAuditLogsFilters): Promise<ListAuditLogsResult> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 200) : 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
      ...(filters.targetType ? { targetType: filters.targetType } : {}),
      ...(filters.targetId ? { targetId: filters.targetId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? { createdAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => Boolean(id)))];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } })
      : [];
    const actorEmailById = new Map(actors.map((a) => [a.id, a.email]));

    const items: AuditLogEntry[] = rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      actorId: row.actorId,
      actorEmail: row.actorId ? (actorEmailById.get(row.actorId) ?? null) : null,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      before: row.before,
      after: row.after,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
    }));

    return { items, total, page, pageSize };
  }
}
