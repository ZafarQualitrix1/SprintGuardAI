import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
  OrganizationMemberRecord,
} from '../../domain/repositories/organization-member.repository.interface';

export class ListOrganizationMembersQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListOrganizationMembersQuery)
export class ListOrganizationMembersHandler
  implements IQueryHandler<ListOrganizationMembersQuery, OrganizationMemberRecord[]>
{
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repository: IOrganizationMemberRepository,
  ) {}

  execute(query: ListOrganizationMembersQuery): Promise<OrganizationMemberRecord[]> {
    return this.repository.listByOrg(query.organizationId);
  }
}
