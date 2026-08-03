import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export class UploadOrganizationLogoCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly contentType: string,
    public readonly base64Data: string,
  ) {}
}

// Logos are stored inline as a data: URL on TenantBranding.logoUrl rather than in an external
// object store -- they're capped at 2MB and uploaded rarely, so a Storage provider (its own env
// vars, bucket, public-access policy) is more infra than this needs. Revisit only if larger or
// CDN-served assets are added later.
@CommandHandler(UploadOrganizationLogoCommand)
export class UploadOrganizationLogoHandler
  implements ICommandHandler<UploadOrganizationLogoCommand, { logoUrl: string }>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: UploadOrganizationLogoCommand): Promise<{ logoUrl: string }> {
    if (!ALLOWED_CONTENT_TYPES.has(command.contentType)) {
      throw new BadRequestException(
        `Unsupported file type "${command.contentType}" -- allowed: PNG, JPEG, WEBP, SVG.`,
      );
    }

    const byteLength = Buffer.byteLength(command.base64Data, 'base64');
    if (byteLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Logo file is too large -- 2MB maximum.');
    }

    const logoUrl = `data:${command.contentType};base64,${command.base64Data}`;

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
