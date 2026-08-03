import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import axios from 'axios';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  IOrganizationSettingsRepository,
  ORGANIZATION_SETTINGS_REPOSITORY,
} from '../../domain/repositories/organization-settings.repository.interface';

export interface SendTestNotificationResult {
  delivered: boolean;
  error?: string;
}

export class SendTestNotificationCommand {
  constructor(
    public readonly organizationId: string,
    public readonly channel: 'slack' | 'teams',
  ) {}
}

@CommandHandler(SendTestNotificationCommand)
export class SendTestNotificationHandler
  implements ICommandHandler<SendTestNotificationCommand, SendTestNotificationResult>
{
  private readonly logger = new Logger(SendTestNotificationHandler.name);

  constructor(
    @Inject(ORGANIZATION_SETTINGS_REPOSITORY) private readonly repository: IOrganizationSettingsRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
  ) {}

  async execute(command: SendTestNotificationCommand): Promise<SendTestNotificationResult> {
    const raw = await this.repository.findRawByOrg(command.organizationId);
    const encrypted = command.channel === 'slack' ? raw?.slackWebhookEncrypted : raw?.teamsWebhookEncrypted;
    if (!encrypted) {
      throw new BadRequestException(`No ${command.channel} webhook URL configured yet.`);
    }

    const webhookUrl = this.credentialVault.decrypt(encrypted);
    const body =
      command.channel === 'slack'
        ? { text: 'SprintGuard AI: this is a test notification from Organization Settings.' }
        : {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: 'SprintGuard AI test notification',
            text: 'SprintGuard AI: this is a test notification from Organization Settings.',
          };

    try {
      await axios.post(webhookUrl, body, { timeout: 10_000 });
      return { delivered: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delivery failed';
      this.logger.warn(`Test notification failed for org ${command.organizationId} (${command.channel}): ${message}`);
      return { delivered: false, error: message };
    }
  }
}
