import { randomBytes, createHash } from 'crypto';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
  InvitationRecord,
} from '../../domain/repositories/invitation.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

const INVITE_TTL_DAYS = 7;

export interface InviteMemberResult {
  invitation: InvitationRecord;
  // Raw token, returned once -- only the hash is persisted. The admin copies this into a
  // shareable link (no email delivery exists yet, same honest workaround as password resets).
  token: string;
}

export class InviteMemberCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly email: string,
    public readonly roleKey: string,
  ) {}
}

@CommandHandler(InviteMemberCommand)
export class InviteMemberHandler implements ICommandHandler<InviteMemberCommand, InviteMemberResult> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: IInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: InviteMemberCommand): Promise<InviteMemberResult> {
    const role = await this.prisma.role.findUnique({ where: { key: command.roleKey } });
    if (!role) {
      throw new NotFoundException(`Unknown role "${command.roleKey}"`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: command.email } });
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { organizationId_userId: { organizationId: command.organizationId, userId: existingUser.id } },
      });
      if (existingMembership) {
        throw new BadRequestException(`${command.email} is already a member of this organization.`);
      }
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invitation = await this.invitationRepository.create({
      organizationId: command.organizationId,
      email: command.email,
      roleId: role.id,
      tokenHash,
      invitedBy: command.actorId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'member.invited',
      'Invitation',
      invitation.id,
      undefined,
      { email: command.email, role: command.roleKey },
    );

    return { invitation, token };
  }
}
