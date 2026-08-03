export const EMAIL_SENDER = Symbol('IEmailSender');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

// Port implemented by Infrastructure's ResendEmailSender. Lives in its own module (rather than
// under IAM, where it started) because IAM and Organization Settings both need it and IAM already
// imports OrganizationSettingsModule one-way (for INVITATION_REPOSITORY) -- putting it here avoids
// a circular dependency between the two.
export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}
