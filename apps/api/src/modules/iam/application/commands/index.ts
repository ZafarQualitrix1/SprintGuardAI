// Command handlers (CQRS writes) for the IAM bounded context.
export * from './auth-session.types';
export * from './register-organization.command';
export * from './login.command';
export * from './refresh-session.command';
export * from './logout.command';
export * from './accept-invitation.command';
export * from './suspend-user.command';
export * from './reset-user-password.command';
export * from './force-logout-user.command';
export * from './delete-user.command';
export * from './update-user.command';

import { RegisterOrganizationHandler } from './register-organization.command';
import { LoginHandler } from './login.command';
import { RefreshSessionHandler } from './refresh-session.command';
import { LogoutHandler } from './logout.command';
import { AcceptInvitationHandler } from './accept-invitation.command';
import { SetUserActiveHandler } from './suspend-user.command';
import { ResetUserPasswordHandler } from './reset-user-password.command';
import { ForceLogoutUserHandler } from './force-logout-user.command';
import { DeleteUserHandler } from './delete-user.command';
import { UpdateUserHandler } from './update-user.command';

export const IAM_COMMAND_HANDLERS = [
  RegisterOrganizationHandler,
  LoginHandler,
  RefreshSessionHandler,
  LogoutHandler,
  AcceptInvitationHandler,
  SetUserActiveHandler,
  ResetUserPasswordHandler,
  ForceLogoutUserHandler,
  DeleteUserHandler,
  UpdateUserHandler,
];
