import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

// RBAC permission requirement (Solution Architecture §25). Checked by PermissionsGuard at the
// controller-method level, and re-checked at the Application layer for non-HTTP entry points
// (BullMQ jobs, GraphQL, agent tool invocations) -- this decorator only covers the HTTP path.
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
