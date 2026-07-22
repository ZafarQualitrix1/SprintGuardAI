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

// Spans the Organization and (new) User aggregates in a single transaction -- registration is the
// one place onboarding a brand-new tenant is atomic: Organization + User + Membership(OWNER) all
// commit together or not at all (Solution Architecture §2 Aggregate Root Documentation).
export interface IIdentityOnboardingRepository {
  registerOrganizationOwner(input: OnboardOrganizationInput): Promise<OnboardOrganizationResult>;
}
