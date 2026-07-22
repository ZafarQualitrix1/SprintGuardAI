// Query handlers (CQRS reads) for the Release bounded context.
export * from './get-latest-release-report.query';

import { GetLatestReleaseReportHandler } from './get-latest-release-report.query';

export const RELEASE_QUERY_HANDLERS = [GetLatestReleaseReportHandler];
