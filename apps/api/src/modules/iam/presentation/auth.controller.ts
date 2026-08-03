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
import { UploadUserAvatarCommand } from '../application/commands/upload-user-avatar.command';
import { LoginCommand } from '../application/commands/login.command';
import { RefreshSessionCommand } from '../application/commands/refresh-session.command';
import { LogoutCommand } from '../application/commands/logout.command';
import { AcceptInvitationCommand } from '../application/commands/accept-invitation.command';
import { ForgotPasswordCommand } from '../application/commands/forgot-password.command';
import { ResetPasswordCommand } from '../application/commands/reset-password.command';
import { GoogleSignInCommand } from '../application/commands/google-sign-in.command';
import { GetCurrentUserQuery } from '../application/queries/get-current-user.query';
import { AuthSessionResult } from '../application/commands/auth-session.types';
import { AuthResponseDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { UploadAvatarDto } from './dto/upload-avatar.dto';

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
  @Post('accept-invitation')
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.commandBus.execute<AcceptInvitationCommand, AuthSessionResult>(
      new AcceptInvitationCommand(dto.token, dto.fullName, dto.password),
    );
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.commandBus.execute(new ForgotPasswordCommand(dto.email));
    // Same response whether or not the email is registered -- see ForgotPasswordCommand.
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.commandBus.execute<ResetPasswordCommand, AuthSessionResult>(
      new ResetPasswordCommand(dto.token, dto.password),
    );
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('google')
  async googleSignIn(
    @Body() dto: GoogleSignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const session = await this.commandBus.execute<GoogleSignInCommand, AuthSessionResult>(
      new GoogleSignInCommand(dto.credential),
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

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @Body() dto: UploadAvatarDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ avatarUrl: string }> {
    return this.commandBus.execute(
      new UploadUserAvatarCommand(user.organizationId, user.userId, dto.contentType, dto.data),
    );
  }
}
