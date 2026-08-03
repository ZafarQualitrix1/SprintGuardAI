import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import {
  IDENTITY_ONBOARDING_REPOSITORY,
  IIdentityOnboardingRepository,
} from '../../domain/repositories';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import { UserRegisteredEvent } from '../../domain/events';
import { PASSWORD_HASHER, IPasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { AuthSessionResult } from './auth-session.types';

export class RegisterOrganizationCommand {
  constructor(
    public readonly organizationName: string,
    public readonly fullName: string,
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(RegisterOrganizationCommand)
export class RegisterOrganizationHandler
  implements ICommandHandler<RegisterOrganizationCommand, AuthSessionResult>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(IDENTITY_ONBOARDING_REPOSITORY)
    private readonly onboardingRepository: IIdentityOnboardingRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterOrganizationCommand): Promise<AuthSessionResult> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const { user, organizationId, membership } = await this.onboardingRepository.registerOrganizationOwner({
      organizationName: command.organizationName,
      fullName: command.fullName,
      email: command.email,
      passwordHash,
    });

    this.eventBus.publish(new UserRegisteredEvent(user.id, organizationId, user.email));

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, orgId: organizationId });
    const refresh = this.tokenService.generateRefreshToken();
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        organizationId,
        organizationName: membership.organizationName,
        roleKey: membership.roleKey,
        permissions: [...membership.permissions],
      },
    };
  }
}
