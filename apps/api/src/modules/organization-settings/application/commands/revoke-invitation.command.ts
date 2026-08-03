import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IInvitationRepository, INVITATION_REPOSITORY } from '../../domain/repositories/invitation.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

export class RevokeInvitationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly invitationId: string,
  ) {}
}

@CommandHandler(RevokeInvitationCommand)
export class RevokeInvitationHandler implements ICommandHandler<RevokeInvitationCommand, void> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: IInvitationRepository,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: RevokeInvitationCommand): Promise<void> {
    await this.invitationRepository.revoke(command.invitationId, command.organizationId);
    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'member.invitation_revoked',
      'Invitation',
      command.invitationId,
    );
  }
}
