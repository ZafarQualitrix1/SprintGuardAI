import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import { AuthenticatedUserView } from '../commands/auth-session.types';

export class GetCurrentUserQuery {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery, AuthenticatedUserView> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(query: GetCurrentUserQuery): Promise<AuthenticatedUserView> {
    const result = await this.userRepository.findByIdWithMembership(query.userId, query.organizationId);
    if (!result?.membership) {
      throw new NotFoundException('User not found');
    }

    return {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      avatarUrl: result.user.avatarUrl,
      organizationId: result.membership.organizationId,
      organizationName: result.membership.organizationName,
      roleKey: result.membership.roleKey,
      permissions: [...result.membership.permissions],
    };
  }
}
