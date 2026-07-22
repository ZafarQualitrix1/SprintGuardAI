import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { PASSWORD_HASHER, IPasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { AuthSessionResult } from './auth-session.types';

export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

// Constant-time-ish guard: verify against a fixed hash when the user doesn't exist, so response
// timing doesn't reveal account existence (a cheap, standard mitigation for user enumeration).
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthSessionResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(command: LoginCommand): Promise<AuthSessionResult> {
    const result = await this.userRepository.findByEmailWithPrimaryMembership(command.email);

    const passwordHash = result?.user.passwordHash ?? DUMMY_HASH;
    const passwordValid = await this.passwordHasher.verify(passwordHash, command.password);

    if (!result || !result.user.isActive || !result.membership || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user, membership } = result;

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      orgId: membership.organizationId,
    });
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
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        roleKey: membership.roleKey,
        permissions: [...membership.permissions],
      },
    };
  }
}
