import { Module } from '@nestjs/common';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { ResendEmailSender } from './infrastructure/services/resend-email-sender.service';

// Cross-cutting infrastructure module: transactional email (Resend today). Imported by any
// bounded-context module that needs to send an email -- currently IAMModule (password reset) and
// OrganizationSettingsModule (member invitations).
@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: ResendEmailSender }],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
