import { ForgotPasswordCommand, ForgotPasswordHandler } from './forgot-password.command';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { IEmailSender } from '../../../email/application/ports/email-sender.port';

function buildHandler(overrides: { user?: UserEntity | null; sendError?: Error }) {
  const userRepository: jest.Mocked<IUserRepository> = {
    findByEmail: jest.fn().mockResolvedValue(overrides.user ?? null),
    findByEmailWithPrimaryMembership: jest.fn(),
    findByIdWithMembership: jest.fn(),
  };
  const send = overrides.sendError ? jest.fn().mockRejectedValue(overrides.sendError) : jest.fn().mockResolvedValue(undefined);
  const emailSender: jest.Mocked<IEmailSender> = { send };
  const prisma = {
    passwordResetToken: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
  const configService = { get: jest.fn().mockReturnValue('https://app.example.com') } as any;

  const handler = new ForgotPasswordHandler(userRepository, prisma, emailSender, configService);
  return { handler, emailSender };
}

describe('ForgotPasswordHandler', () => {
  it('does nothing for an unknown email (no enumeration)', async () => {
    const { handler, emailSender } = buildHandler({ user: null });

    await expect(handler.execute(new ForgotPasswordCommand('nobody@acme.com'))).resolves.toBeUndefined();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('sends a reset email for a known, active account', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', 'argon2-hash', true);
    const { handler, emailSender } = buildHandler({ user });

    await handler.execute(new ForgotPasswordCommand('jane@acme.com'));

    expect(emailSender.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'jane@acme.com' }));
  });

  it('does not throw when the email provider fails (e.g. unconfigured on this deployment)', async () => {
    const user = new UserEntity('u1', 'jane@acme.com', 'Jane', 'argon2-hash', true);
    const { handler } = buildHandler({ user, sendError: new Error('RESEND_API_KEY is not configured') });

    await expect(handler.execute(new ForgotPasswordCommand('jane@acme.com'))).resolves.toBeUndefined();
  });
});
