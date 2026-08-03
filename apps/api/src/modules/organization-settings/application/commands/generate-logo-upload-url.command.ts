import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SupabaseStorageService } from '../../infrastructure/services/supabase-storage.service';

export interface GenerateLogoUploadUrlResult {
  path: string;
  signedUrl: string;
  token: string;
}

export class GenerateLogoUploadUrlCommand {
  constructor(
    public readonly organizationId: string,
    public readonly contentType: string,
    public readonly sizeBytes: number,
    public readonly extension: string,
  ) {}
}

@CommandHandler(GenerateLogoUploadUrlCommand)
export class GenerateLogoUploadUrlHandler
  implements ICommandHandler<GenerateLogoUploadUrlCommand, GenerateLogoUploadUrlResult>
{
  constructor(private readonly storage: SupabaseStorageService) {}

  async execute(command: GenerateLogoUploadUrlCommand): Promise<GenerateLogoUploadUrlResult> {
    this.storage.validateUpload(command.contentType, command.sizeBytes);
    return this.storage.createSignedUploadUrl(command.organizationId, command.extension);
  }
}
