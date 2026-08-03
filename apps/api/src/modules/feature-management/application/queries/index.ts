// Query handlers (CQRS reads) for the FeatureManagement bounded context.
import { ListFeatureFlagsHandler } from './list-feature-flags.query';

export * from './list-feature-flags.query';

export const FEATURE_MANAGEMENT_QUERY_HANDLERS = [ListFeatureFlagsHandler];
