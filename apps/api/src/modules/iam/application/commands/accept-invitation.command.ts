import { createHash } from 'crypto';
import { BadRequestException, ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from '../../../organization-settings/domain/repositories/invitation.repository.interface';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import { PASSWORD_HASHER, IPasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { AuthSessionResult } from './auth-session.types';

export class AcceptInvitationCommand {
  constructor(
    public readonly token: string,
    public readonly fullName: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand, AuthSessionResult> {
  constructor(
    @Inject(INVITATION_REPOSITORY) private readonly invitationRepository: IInvitationRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<AuthSessionResult> {
    const tokenHash = createHash('sha256').update(command.token).digest('hex');
    const invitation = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!invitation || invitation.status !== 'PENDING') {
      throw new NotFoundException('This invitation link is invalid or has already been used.');
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This invitation link has expired.');
    }

    const existing = await this.userRepository.findByEmail(invitation.email);
    if (existing) {
      throw new ConflictException(
        'An account with this email already exists -- log in and ask an org admin to add you instead.',
      );
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: invitation.email, fullName: command.fullName, passwordHash },
      });
      const createdMembership = await tx.membership.create({
        data: { organizationId: invitation.organizationId, userId: createdUser.id, roleId: invitation.roleId },
        include: { organization: true, role: { include: { rolePermissions: { include: { permission: true } } } } },
      });
      return { user: createdUser, membership: createdMembership };
    });

    await this.invitationRepository.markAccepted(invitation.id);

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, orgId: invitation.organizationId });
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
        organizationId: invitation.organizationId,
        organizationName: membership.organization.name,
        roleKey: membership.role.key,
        permissions: membership.role.rolePermissions.map((rp) => rp.permission.key),
      },
    };
  }
}
