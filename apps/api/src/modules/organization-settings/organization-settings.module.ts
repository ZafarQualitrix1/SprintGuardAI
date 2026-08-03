import { Module } from '@nestjs/common';
import { OrganizationSettingsController } from './presentation/organization-settings.controller';
import { ORGANIZATION_SETTINGS_COMMAND_HANDLERS } from './application/commands';
import { ORGANIZATION_SETTINGS_QUERY_HANDLERS } from './application/queries';
import { CREDENTIAL_VAULT } from './application/ports/credential-vault.port';
import {
  ORGANIZATION_SETTINGS_REPOSITORY,
  INVITATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
} from './domain/repositories';
import { AesCredentialVaultService } from './infrastructure/services/aes-credential-vault.service';
import { OrgSettingsAuditLogService } from './infrastructure/services/org-settings-audit-log.service';
import { SupabaseStorageService } from './infrastructure/services/supabase-storage.service';
import {
  PrismaOrganizationSettingsRepository,
  PrismaInvitationRepository,
  PrismaOrganizationMemberRepository,
} from './infrastructure/repositories';

// Bounded context module: Organization Settings. Owns the org-wide configuration singleton
// (OrganizationSettings), team management (Invitation + Membership read/write), and organization
// branding (TenantBranding.logoUrl via Supabase Storage). Provider/model AI defaults and budgets
// stay owned by the `ai` module (AiProviderConfig/UsageQuota) -- this module only stores the
// org-wide AI toggles that don't belong to a specific provider.
@Module({
  controllers: [OrganizationSettingsController],
  providers: [
    ...ORGANIZATION_SETTINGS_COMMAND_HANDLERS,
    ...ORGANIZATION_SETTINGS_QUERY_HANDLERS,
    OrgSettingsAuditLogService,
    SupabaseStorageService,
    { provide: CREDENTIAL_VAULT, useClass: AesCredentialVaultService },
    { provide: ORGANIZATION_SETTINGS_REPOSITORY, useClass: PrismaOrganizationSettingsRepository },
    { provide: INVITATION_REPOSITORY, useClass: PrismaInvitationRepository },
    { provide: ORGANIZATION_MEMBER_REPOSITORY, useClass: PrismaOrganizationMemberRepository },
  ],
  exports: [INVITATION_REPOSITORY],
})
export class OrganizationSettingsModule {}
