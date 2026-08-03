import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IOrganizationSettingsRepository,
  ORGANIZATION_SETTINGS_REPOSITORY,
} from '../../domain/repositories/organization-settings.repository.interface';

export interface OrganizationSettingsBackup {
  exportedAt: string;
  settings: Record<string, unknown>;
}

export class ExportOrganizationSettingsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ExportOrganizationSettingsQuery)
export class ExportOrganizationSettingsHandler
  implements IQueryHandler<ExportOrganizationSettingsQuery, OrganizationSettingsBackup>
{
  constructor(
    @Inject(ORGANIZATION_SETTINGS_REPOSITORY) private readonly repository: IOrganizationSettingsRepository,
  ) {}

  async execute(query: ExportOrganizationSettingsQuery): Promise<OrganizationSettingsBackup> {
    const settings = await this.repository.findByOrg(query.organizationId);
    if (!settings) {
      return { exportedAt: new Date().toISOString(), settings: {} };
    }

    // Secrets never leave the server -- webhook URLs are encrypted with this org's vault key and
    // excluded from the downloadable backup file entirely, along with id/organizationId/timestamps
    // which are regenerated on import rather than restored verbatim.
    const {
      id: _id,
      organizationId: _organizationId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      hasSlackWebhook: _hasSlackWebhook,
      hasTeamsWebhook: _hasTeamsWebhook,
      ...exportable
    } = settings;

    return { exportedAt: new Date().toISOString(), settings: exportable };
  }
}
