// Command handlers (CQRS writes) for the Platform bounded context.
import { SetRolePermissionHandler } from './set-role-permission.command';

export * from './set-role-permission.command';

export const PLATFORM_COMMAND_HANDLERS = [SetRolePermissionHandler];
