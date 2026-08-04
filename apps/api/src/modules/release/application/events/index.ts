// Event handlers (CQRS events) for the Release bounded context.
export * from './release-metrics-changed.handler';

import { ReleaseMetricsChangedHandler } from './release-metrics-changed.handler';

export const RELEASE_EVENT_HANDLERS = [ReleaseMetricsChangedHandler];
