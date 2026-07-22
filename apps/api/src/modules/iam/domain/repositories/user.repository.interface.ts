import { UserEntity } from '../entities/user.entity';
import { MembershipEntity } from '../entities/membership.entity';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface UserWithPrimaryMembership {
  user: UserEntity;
  membership: MembershipEntity | null;
}

// Domain-owned repository port -- implemented by Infrastructure (PrismaUserRepository).
// `User` is a global identity, not tenant-scoped by itself; tenant scoping enters through
// Membership, which is why lookups return the resolved primary membership alongside the user.
export interface IUserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findByEmailWithPrimaryMembership(email: string): Promise<UserWithPrimaryMembership | null>;
  findByIdWithMembership(userId: string, organizationId: string): Promise<UserWithPrimaryMembership | null>;
}
