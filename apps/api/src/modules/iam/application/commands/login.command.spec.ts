import { UnauthorizedException } from '@nestjs/common';
import { LoginCommand, LoginHandler } from './login.command';
import { UserEntity } from '../../domain/entities/user.entity';
import { MembershipEntity } from '../../domain/entities/membership.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { ITokenService } from '../ports/token.port';

function buildHandler(overrides: {
  found?: { user: UserEntity; membership: MembershipEntity | null } | null;
  passwordValid?: boolean;
}) {
  const userRepository: jest.Mocked<IUserRepository> = {
    findByEmail: jest.fn(),
    findByEmailWithPrimaryMembership: jest.fn().mockResolvedValue(overrides.found ?? null),
    findByIdWithMembership: jest.fn(),
  };
  const passwordHasher: jest.Mocked<IPasswordHasher> = {
    hash: jest.fn(),
    verify: jest.fn().mockResolvedValue(overrides.passwordValid ?? false),
  };
  const tokenService: jest.Mocked<ITokenService> = {
    signAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest
      .fn()
      .mockReturnValue({ token: 'refresh-token', tokenHash: 'hash', expiresAt: new Date() }),
    hashRefreshToken: jest.fn(),
  };
  const refreshTokenRepository: jest.Mocked<IRefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({ id: '1', userId: 'u1', tokenHash: 'h', expiresAt: new Date(), revokedAt: null }),
    findByHash: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
  const prisma = {
    user: { update: jest.fn().mockResolvedValue(undefined) },
    auditLog: { create: jest.fn().mockResolvedValue(undefined) },
  } as any;

  const handler = new LoginHandler(userRepository, passwordHasher, tokenService, refreshTokenRepository, prisma);
  return { handler, userRepository, passwordHasher };
}

const membership = new MembershipEntity('u1', 'org1', 'Acme', 'QA_ENGINEER', ['sprint:read']);

describe('LoginHandler', () => {
  it('signs in a user with a valid password', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', 'argon2-hash', true);
    const { handler } = buildHandler({ found: { user, membership }, passwordValid: true });

    const result = await handler.execute(new LoginCommand('jane@acme.com', 'correct-password'));

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe('jane@acme.com');
  });

  it('rejects a wrong password with a generic message', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', 'argon2-hash', true);
    const { handler } = buildHandler({ found: { user, membership }, passwordValid: false });

    await expect(handler.execute(new LoginCommand('jane@acme.com', 'wrong-password'))).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });

  it('rejects an unknown email with the same generic message (no enumeration)', async () => {
    const { handler } = buildHandler({ found: null, passwordValid: false });

    await expect(handler.execute(new LoginCommand('nobody@acme.com', 'whatever'))).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });

  it('rejects a deactivated account with the generic message', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', 'argon2-hash', false);
    const { handler } = buildHandler({ found: { user, membership }, passwordValid: true });

    await expect(handler.execute(new LoginCommand('jane@acme.com', 'correct-password'))).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });

  it('tells a Google-only account (no passwordHash) to use Google sign-in, instead of a generic error', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', null, true);
    const { handler, passwordHasher } = buildHandler({ found: { user, membership }, passwordValid: false });

    await expect(handler.execute(new LoginCommand('jane@acme.com', 'anything'))).rejects.toThrow(
      new UnauthorizedException(
        'This account signs in with Google. Use "Sign in with Google" below, or reset your password to add one.',
      ),
    );
    // Never even attempts to verify a real password against the dummy hash for this case.
    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });
});
