export const FEATURE_FLAG_REPOSITORY = Symbol('IFeatureFlagRepository');

export interface FeatureFlagOverrideRecord {
  id: string;
  organizationId: string | null;
  userId: string | null;
  value: unknown;
  rolloutPercentage: number;
}

export interface FeatureFlagRecord {
  id: string;
  key: string;
  description: string | null;
  defaultValue: unknown;
  isBeta: boolean;
  createdAt: Date;
  overrides: FeatureFlagOverrideRecord[];
}

export interface UpsertFeatureFlagInput {
  description?: string;
  defaultValue: unknown;
  isBeta?: boolean;
}

export interface IFeatureFlagRepository {
  listAll(): Promise<FeatureFlagRecord[]>;
  upsert(key: string, input: UpsertFeatureFlagInput): Promise<FeatureFlagRecord>;
  setOrgOverride(key: string, organizationId: string, value: unknown, rolloutPercentage: number): Promise<FeatureFlagRecord>;
  removeOrgOverride(key: string, organizationId: string): Promise<FeatureFlagRecord>;
}
