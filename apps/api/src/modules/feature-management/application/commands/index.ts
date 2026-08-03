// Command handlers (CQRS writes) for the FeatureManagement bounded context.
import { SetFeatureFlagHandler } from './set-feature-flag.command';
import { SetFeatureFlagOverrideHandler } from './set-feature-flag-override.command';
import { RemoveFeatureFlagOverrideHandler } from './remove-feature-flag-override.command';

export * from './set-feature-flag.command';
export * from './set-feature-flag-override.command';
export * from './remove-feature-flag-override.command';

export const FEATURE_MANAGEMENT_COMMAND_HANDLERS = [
  SetFeatureFlagHandler,
  SetFeatureFlagOverrideHandler,
  RemoveFeatureFlagOverrideHandler,
];
