import { randomBytes, createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@sprintguard/database';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import { EMAIL_SENDER, IEmailSender } from '../../../email/application/ports/email-sender.port';

const RESET_TTL_MINUTES = 60;

export class ForgotPasswordCommand {
  constructor(public readonly email: string) {}
}

// Deliberately returns void, not "found"/"not found" -- responding identically either way is a
// standard, low-cost mitigation against using this endpoint to enumerate registered emails.
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user || !user.isActive) {
      return;
    }

    // Invalidate any outstanding reset tokens for this user before issuing a new one, so an old
    // leaked link stops working the moment a fresh one is requested.
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, consumedAt: null } });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });

    const webUrl = this.configService.get<string>('app.webUrl');
    const resetLink = `${webUrl}/reset-password?token=${token}`;

    await this.emailSender.send({
      to: user.email,
      subject: 'Reset your SprintGuard AI password',
      html: `
        <p>We received a request to reset your SprintGuard AI password.</p>
        <p><a href="${resetLink}">Click here to choose a new password</a>. This link expires in ${RESET_TTL_MINUTES} minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }
}
