import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RegisterOrganizationCommand } from '../application/commands/register-organization.command';
import { LoginCommand } from '../application/commands/login.command';
import { RefreshSessionCommand } from '../application/commands/refresh-session.command';
import { LogoutCommand } from '../application/commands/logout.command';
import { GetCurrentUserQuery } from '../application/queries/get-current-user.query';
import { AuthSessionResult } from '../application/commands/auth-session.types';
import { AuthResponseDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
// Scoped to the refresh endpoint only -- the browser never attaches this cookie to any other
// request, shrinking the CSRF/XSS blast radius versus a path of '/'.
const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth/refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, session: AuthSessionResult): void {
    res.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('app.env') === 'production',
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      expires: session.refreshTokenExpiresAt,
    });
  }

  private toResponse(session: AuthSessionResult): AuthResponseDto {
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.commandBus.execute<RegisterOrganizationCommand, AuthSessionResult>(
      new RegisterOrganizationCommand(dto.organizationName, dto.fullName, dto.email, dto.password),
    );
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.commandBus.execute<LoginCommand, AuthSessionResult>(
      new LoginCommand(dto.email, dto.password),
    );
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token presented');
    }

    const session = await this.commandBus.execute<RefreshSessionCommand, AuthSessionResult>(
      new RefreshSessionCommand(refreshToken),
    );
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await this.commandBus.execute(new LogoutCommand(refreshToken));
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_TOKEN_COOKIE_PATH });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetCurrentUserQuery(user.userId, user.organizationId));
  }
}
