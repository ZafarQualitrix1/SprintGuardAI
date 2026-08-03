import { randomBytes, createHash } from 'crypto';
import { BadRequestException, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@sprintguard/database';
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
  InvitationRecord,
} from '../../domain/repositories/invitation.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';
import { EMAIL_SENDER, IEmailSender } from '../../../email/application/ports/email-sender.port';

const INVITE_TTL_DAYS = 7;

export interface InviteMemberResult {
  invitation: InvitationRecord;
  // Raw token, returned once -- only the hash is persisted. Still handed back even when the email
  // sends successfully, so the invite link/copy-link UI keeps working as a fallback.
  token: string;
  // False when RESEND_API_KEY/EMAIL_FROM_ADDRESS aren't configured, or Resend rejects the send --
  // an email failure never blocks creating the invitation itself, since the token above is always
  // a valid manual-share fallback (see invite-member-dialog.tsx).
  emailSent: boolean;
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
  private readonly logger = new Logger(InviteMemberHandler.name);

  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: IInvitationRepository,
    private readonly prisma: PrismaService,
    private readonly auditLog: OrgSettingsAuditLogService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
    private readonly configService: ConfigService,
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

    const emailSent = await this.sendInvitationEmail(command, token);

    return { invitation, token, emailSent };
  }

  private async sendInvitationEmail(command: InviteMemberCommand, token: string): Promise<boolean> {
    try {
      const [organization, inviter] = await Promise.all([
        this.prisma.organization.findUniqueOrThrow({ where: { id: command.organizationId } }),
        this.prisma.user.findUniqueOrThrow({ where: { id: command.actorId } }),
      ]);
      const webUrl = this.configService.get<string>('app.webUrl');
      const inviteLink = `${webUrl}/accept-invitation?token=${token}`;

      await this.emailSender.send({
        to: command.email,
        subject: `${inviter.fullName} invited you to join ${organization.name} on SprintGuard AI`,
        html: `
          <p>${inviter.fullName} has invited you to join <strong>${organization.name}</strong> on SprintGuard AI.</p>
          <p><a href="${inviteLink}">Click here to accept the invitation</a>. This link expires in ${INVITE_TTL_DAYS} days.</p>
        `,
      });
      return true;
    } catch (error) {
      // Never let an email-provider failure (e.g. RESEND_API_KEY not configured) block the
      // invitation itself -- the token returned to the caller is always a valid manual-share
      // fallback, so we log and degrade instead of throwing.
      this.logger.warn(`Could not email invitation to ${command.email}: ${(error as Error).message}`);
      return false;
    }
  }
}
