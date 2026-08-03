import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailMessage, IEmailSender } from '../../application/ports/email-sender.port';

@Injectable()
export class ResendEmailSender implements IEmailSender {
  constructor(private readonly configService: ConfigService) {}

  private get client(): Resend {
    const apiKey = this.configService.get<string>('email.resendApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'RESEND_API_KEY is not configured on this deployment -- this email cannot be sent without it.',
      );
    }
    return new Resend(apiKey);
  }

  private get fromAddress(): string {
    const fromAddress = this.configService.get<string>('email.fromAddress');
    if (!fromAddress) {
      throw new InternalServerErrorException(
        'EMAIL_FROM_ADDRESS is not configured on this deployment -- this email cannot be sent without it.',
      );
    }
    return fromAddress;
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    if (error) {
      throw new InternalServerErrorException(`Resend rejected the email: ${error.message}`);
    }
  }
}
