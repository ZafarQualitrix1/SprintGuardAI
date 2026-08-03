import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IOrganizationSettingsRepository,
  ORGANIZATION_SETTINGS_REPOSITORY,
  OrganizationSettingsRecord,
} from '../../domain/repositories/organization-settings.repository.interface';

export class GetOrganizationSettingsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(GetOrganizationSettingsQuery)
export class GetOrganizationSettingsHandler
  implements IQueryHandler<GetOrganizationSettingsQuery, OrganizationSettingsRecord>
{
  constructor(
    @Inject(ORGANIZATION_SETTINGS_REPOSITORY) private readonly repository: IOrganizationSettingsRepository,
  ) {}

  async execute(query: GetOrganizationSettingsQuery): Promise<OrganizationSettingsRecord> {
    const existing = await this.repository.findByOrg(query.organizationId);
    // First read for an org with no settings row yet -- create it with defaults rather than
    // returning null, so the frontend always has a real, persisted row to edit against.
    return existing ?? this.repository.upsert(query.organizationId, {});
  }
}
