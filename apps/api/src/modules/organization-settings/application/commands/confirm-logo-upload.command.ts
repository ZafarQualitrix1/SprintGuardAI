import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { SupabaseStorageService } from '../../infrastructure/services/supabase-storage.service';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

export class ConfirmLogoUploadCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly path: string,
  ) {}
}

@CommandHandler(ConfirmLogoUploadCommand)
export class ConfirmLogoUploadHandler implements ICommandHandler<ConfirmLogoUploadCommand, { logoUrl: string }> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: ConfirmLogoUploadCommand): Promise<{ logoUrl: string }> {
    // Path is always prefixed with the caller's own organizationId (see
    // SupabaseStorageService.createSignedUploadUrl) -- reject anything else defensively so one
    // org can never overwrite/confirm another org's uploaded object.
    if (!command.path.startsWith(`${command.organizationId}/`)) {
      throw new Error('Upload path does not belong to this organization');
    }

    const logoUrl = this.storage.getPublicUrl(command.path);

    await this.prisma.tenantBranding.upsert({
      where: { organizationId: command.organizationId },
      create: { organizationId: command.organizationId, logoUrl },
      update: { logoUrl },
    });

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'organization.logo_updated',
      'TenantBranding',
      command.organizationId,
    );

    return { logoUrl };
  }
}
