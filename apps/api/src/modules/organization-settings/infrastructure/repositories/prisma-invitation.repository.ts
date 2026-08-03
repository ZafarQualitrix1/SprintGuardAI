import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CreateInvitationInput,
  IInvitationRepository,
  InvitationRecord,
} from '../../domain/repositories/invitation.repository.interface';

const withRole = { role: true } as const;

function toRecord(row: {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  status: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  role: { key: string };
}): InvitationRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    roleId: row.roleId,
    roleKey: row.role.key,
    status: row.status as InvitationRecord['status'],
    invitedBy: row.invitedBy,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateInvitationInput): Promise<InvitationRecord> {
    const row = await this.prisma.invitation.create({ data: input, include: withRole });
    return toRecord(row);
  }

  async findByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    const row = await this.prisma.invitation.findUnique({ where: { tokenHash }, include: withRole });
    return row ? toRecord(row) : null;
  }

  async listByOrg(organizationId: string): Promise<InvitationRecord[]> {
    const rows = await this.prisma.invitation.findMany({
      where: { organizationId },
      include: withRole,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRecord);
  }

  async revoke(id: string, organizationId: string): Promise<void> {
    const existing = await this.prisma.invitation.findFirst({ where: { id, organizationId } });
    if (!existing) {
      throw new NotFoundException('Invitation not found');
    }
    await this.prisma.invitation.update({ where: { id }, data: { status: 'REVOKED' } });
  }

  async markAccepted(id: string): Promise<void> {
    await this.prisma.invitation.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
  }
}
