// Query handlers (CQRS reads) for the IAM bounded context.
export * from './get-current-user.query';

import { GetCurrentUserHandler } from './get-current-user.query';

export const IAM_QUERY_HANDLERS = [GetCurrentUserHandler];
