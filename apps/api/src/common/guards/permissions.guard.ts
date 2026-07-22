import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

// RBAC enforcement (Solution Architecture §25): compares @RequirePermission(...) metadata against
// the authenticated user's resolved permission set (Role -> RolePermission -> Permission,
// packages/database schema.prisma). Runs after JwtAuthGuard so `request.user` is populated.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    const hasAll = user
      ? requiredPermissions.every((permission) => user.permissions.includes(permission))
      : false;

    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
