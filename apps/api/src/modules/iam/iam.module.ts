import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IAMController } from './presentation/iam.controller';
import { AuthController } from './presentation/auth.controller';
import { AdminUsersController } from './presentation/admin-users.controller';

import { IAM_COMMAND_HANDLERS } from './application/commands';
import { IAM_QUERY_HANDLERS } from './application/queries';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token.port';
import {
  USER_REPOSITORY,
  MEMBERSHIP_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  IDENTITY_ONBOARDING_REPOSITORY,
} from './domain/repositories';

import { Argon2PasswordHasher } from './infrastructure/services/argon2-password-hasher.service';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { IamAuditLogService } from './infrastructure/services/iam-audit-log.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaMembershipRepository } from './infrastructure/repositories/prisma-membership.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { PrismaIdentityOnboardingRepository } from './infrastructure/repositories/prisma-identity-onboarding.repository';
import { OrganizationSettingsModule } from '../organization-settings/organization-settings.module';

// Bounded context module: IAM (Solution Architecture §6, Identity & Tenancy)
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// JwtModule/PassportModule's default 'jwt' strategy config lives in AppModule; this module only
// registers the strategy implementation itself (JwtStrategy) so it participates in Passport's
// (process-global) strategy registry once IAMModule is imported.
// Imports OrganizationSettingsModule for INVITATION_REPOSITORY (AcceptInvitationCommand) --
// one-way dependency, OrganizationSettingsModule does not import IAMModule back.
@Module({
  imports: [PassportModule, OrganizationSettingsModule],
  controllers: [IAMController, AuthController, AdminUsersController],
  providers: [
    ...IAM_COMMAND_HANDLERS,
    ...IAM_QUERY_HANDLERS,
    JwtStrategy,
    IamAuditLogService,
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: IDENTITY_ONBOARDING_REPOSITORY, useClass: PrismaIdentityOnboardingRepository },
  ],
  exports: [MEMBERSHIP_REPOSITORY],
})
export class IAMModule {}
