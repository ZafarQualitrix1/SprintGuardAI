import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
  InvitationRecord,
} from '../../domain/repositories/invitation.repository.interface';

export class ListInvitationsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListInvitationsQuery)
export class ListInvitationsHandler implements IQueryHandler<ListInvitationsQuery, InvitationRecord[]> {
  constructor(@Inject(INVITATION_REPOSITORY) private readonly invitationRepository: IInvitationRepository) {}

  execute(query: ListInvitationsQuery): Promise<InvitationRecord[]> {
    return this.invitationRepository.listByOrg(query.organizationId);
  }
}
