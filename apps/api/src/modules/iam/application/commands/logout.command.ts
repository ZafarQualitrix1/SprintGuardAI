import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';

export class LogoutCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const existing = await this.refreshTokenRepository.findByHash(tokenHash);
    if (existing && !existing.revokedAt) {
      await this.refreshTokenRepository.revoke(existing.id);
    }
  }
}
