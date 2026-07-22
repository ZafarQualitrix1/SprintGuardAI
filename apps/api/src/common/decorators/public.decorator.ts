import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as exempt from JwtAuthGuard (Solution Architecture §25 AuthN).
// Usage: @Public() above a controller method, e.g. login/refresh/health endpoints.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
