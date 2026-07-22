import { MembershipEntity } from '../entities/membership.entity';

export const MEMBERSHIP_REPOSITORY = Symbol('IMembershipRepository');

// MVP assumes one primary organization per user (Solution Architecture §3's org hierarchy is
// flat for MVP); multi-org membership selection is a Phase 2 concern (docs/architecture
// §3 Organization Hierarchy).
export interface IMembershipRepository {
  findPrimaryByUserId(userId: string): Promise<MembershipEntity | null>;
}
