import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export class UploadUserAvatarCommand {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly contentType: string,
    public readonly base64Data: string,
  ) {}
}

// Same inline data: URL pattern as UploadOrganizationLogoHandler (organization-settings module) --
// small, infrequent, capped-size images don't need external object storage. Self-service: any
// authenticated user can change their own avatar, no permission check beyond being logged in.
@CommandHandler(UploadUserAvatarCommand)
export class UploadUserAvatarHandler implements ICommandHandler<UploadUserAvatarCommand, { avatarUrl: string }> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: UploadUserAvatarCommand): Promise<{ avatarUrl: string }> {
    if (!ALLOWED_CONTENT_TYPES.has(command.contentType)) {
      throw new BadRequestException(
        `Unsupported file type "${command.contentType}" -- allowed: PNG, JPEG, WEBP.`,
      );
    }

    const byteLength = Buffer.byteLength(command.base64Data, 'base64');
    if (byteLength > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Profile photo is too large -- 2MB maximum.');
    }

    const avatarUrl = `data:${command.contentType};base64,${command.base64Data}`;

    await this.prisma.user.update({ where: { id: command.userId }, data: { avatarUrl } });

    await this.auditLog.record(command.organizationId, command.userId, 'user.avatar_updated', 'User', command.userId);

    return { avatarUrl };
  }
}
