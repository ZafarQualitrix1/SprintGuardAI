import { UpsertOrganizationSettingsHandler } from './upsert-organization-settings.command';
import { GenerateLogoUploadUrlHandler } from './generate-logo-upload-url.command';
import { ConfirmLogoUploadHandler } from './confirm-logo-upload.command';
import { ImportOrganizationSettingsHandler } from './import-organization-settings.command';
import { SendTestNotificationHandler } from './send-test-notification.command';
import { InviteMemberHandler } from './invite-member.command';
import { RevokeInvitationHandler } from './revoke-invitation.command';
import { ChangeMemberRoleHandler } from './change-member-role.command';
import { RemoveMemberHandler } from './remove-member.command';

export * from './upsert-organization-settings.command';
export * from './generate-logo-upload-url.command';
export * from './confirm-logo-upload.command';
export * from './import-organization-settings.command';
export * from './send-test-notification.command';
export * from './invite-member.command';
export * from './revoke-invitation.command';
export * from './change-member-role.command';
export * from './remove-member.command';

export const ORGANIZATION_SETTINGS_COMMAND_HANDLERS = [
  UpsertOrganizationSettingsHandler,
  GenerateLogoUploadUrlHandler,
  ConfirmLogoUploadHandler,
  ImportOrganizationSettingsHandler,
  SendTestNotificationHandler,
  InviteMemberHandler,
  RevokeInvitationHandler,
  ChangeMemberRoleHandler,
  RemoveMemberHandler,
];
