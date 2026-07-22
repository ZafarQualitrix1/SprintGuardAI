// Command handlers (CQRS writes) for the IAM bounded context.
export * from './auth-session.types';
export * from './register-organization.command';
export * from './login.command';
export * from './refresh-session.command';
export * from './logout.command';

import { RegisterOrganizationHandler } from './register-organization.command';
import { LoginHandler } from './login.command';
import { RefreshSessionHandler } from './refresh-session.command';
import { LogoutHandler } from './logout.command';

export const IAM_COMMAND_HANDLERS = [
  RegisterOrganizationHandler,
  LoginHandler,
  RefreshSessionHandler,
  LogoutHandler,
];
