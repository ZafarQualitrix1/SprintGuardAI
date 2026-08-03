import { UserEntity } from '../entities/user.entity';
import { MembershipEntity } from '../entities/membership.entity';

export const IDENTITY_ONBOARDING_REPOSITORY = Symbol('IIdentityOnboardingRepository');

export interface OnboardOrganizationInput {
  organizationName: string;
  fullName: string;
  email: string;
  passwordHash: string;
}

export interface OnboardOrganizationResult {
  user: UserEntity;
  organizationId: string;
  membership: MembershipEntity;
}

// Spans the Organization and (new) User aggregates in a single transaction. If `organizationName`
// matches an existing (non-deleted) organization, the new user joins it as QA_ENGINEER instead of
// spinning up a duplicate tenant -- only the first person to register a given organization name
// becomes its OWNER. Organization + User + Membership all commit together or not at all (Solution
// Architecture §2 Aggregate Root Documentation).
export interface IIdentityOnboardingRepository {
  registerOrganizationOwner(input: OnboardOrganizationInput): Promise<OnboardOrganizationResult>;
}
