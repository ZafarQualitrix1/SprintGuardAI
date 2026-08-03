import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export interface LogoUploadUrl {
  path: string;
  signedUrl: string;
  token: string;
}

// Wraps Supabase Storage (service-role client, server-side only -- never expose the service role
// key to the frontend) for organization logo uploads. The only file-upload path in the app; scoped
// to a single bucket rather than a general-purpose upload service since that's the only need today.
@Injectable()
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): SupabaseClient {
    if (this.client) return this.client;
    const url = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');
    if (!url || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        'Logo upload is not configured -- set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    return this.client;
  }

  private get bucket(): string {
    return this.configService.get<string>('supabase.storageBucket') ?? 'org-assets';
  }

  validateUpload(contentType: string, sizeBytes: number): void {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ServiceUnavailableException(
        `Unsupported file type "${contentType}" -- allowed: PNG, JPEG, WEBP, SVG.`,
      );
    }
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ServiceUnavailableException('Logo file too large -- 2MB maximum.');
    }
  }

  async createSignedUploadUrl(organizationId: string, extension: string): Promise<LogoUploadUrl> {
    const path = `${organizationId}/logo-${Date.now()}.${extension}`;
    const { data, error } = await this.getClient().storage.from(this.bucket).createSignedUploadUrl(path);
    if (error || !data) {
      throw new ServiceUnavailableException(`Could not create upload URL: ${error?.message ?? 'unknown error'}`);
    }
    return { path: data.path, signedUrl: data.signedUrl, token: data.token };
  }

  getPublicUrl(path: string): string {
    return this.getClient().storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }
}
