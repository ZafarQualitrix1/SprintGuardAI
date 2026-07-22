import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  roleKey: string;
  permissions: string[];
}

// Injects the authenticated user (populated by JwtStrategy) into a controller method parameter:
// findAll(@CurrentUser() user: AuthenticatedUser)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
