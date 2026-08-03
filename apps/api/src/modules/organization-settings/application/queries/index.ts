import { GetOrganizationSettingsHandler } from './get-organization-settings.query';
import { ExportOrganizationSettingsHandler } from './export-organization-settings.query';
import { ListInvitationsHandler } from './list-invitations.query';
import { ListOrganizationMembersHandler } from './list-organization-members.query';
import { ScanJiraAutoSyncCandidatesHandler } from './scan-jira-auto-sync-candidates.query';
import { GetOrganizationBrandingHandler } from './get-organization-branding.query';

export * from './get-organization-settings.query';
export * from './export-organization-settings.query';
export * from './list-invitations.query';
export * from './list-organization-members.query';
export * from './scan-jira-auto-sync-candidates.query';
export * from './get-organization-branding.query';

export const ORGANIZATION_SETTINGS_QUERY_HANDLERS = [
  GetOrganizationSettingsHandler,
  ExportOrganizationSettingsHandler,
  ListInvitationsHandler,
  ListOrganizationMembersHandler,
  ScanJiraAutoSyncCandidatesHandler,
  GetOrganizationBrandingHandler,
];
